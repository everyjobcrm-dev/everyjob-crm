-- p1_m4: registration RPC v2. One canonical eligibility/capacity rule (app_registration_initial_status), definer callers only.
--  * Capacity set = pending + approved (waitlisted/rejected/cancelled/removed do not occupy a slot).
--  * Staff (admin/manager/recruiter) may register as workers: 'approved' when capacity is free, else 'waitlisted'; exempt from min_rating, NOT from min_age.
--  * Employees: 'pending' or 'waitlisted'. No past events, no roles without a rate.
--  * UNIQUE(event_id,user_id) exists: a self-cancelled row is revived; rejected/removed/no_show rows cannot re-register.
CREATE OR REPLACE FUNCTION public.app_registration_initial_status(p_uid uuid, p_event_role_id uuid)
RETURNS public.registration_status LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ev public.events%ROWTYPE; v_role public.event_roles%ROWTYPE; v_p public.profiles%ROWTYPE;
        v_filled int; v_is_staff boolean;
BEGIN
  IF p_uid IS NULL OR p_uid IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_p FROM public.profiles WHERE id = p_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  v_is_staff := COALESCE(v_p.role::text, '') IN ('admin','manager','recruiter');

  SELECT * INTO v_role FROM public.event_roles WHERE id = p_event_role_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'role_not_found'; END IF;
  -- lock order everywhere: events (SHARE) -> event_roles (UPDATE) -> event_registrations
  SELECT * INTO v_ev FROM public.events WHERE id = v_role.event_id FOR SHARE;
  IF v_ev.status IS DISTINCT FROM 'open' THEN RAISE EXCEPTION 'not_open'; END IF;
  IF v_ev.event_date < (now() AT TIME ZONE 'Asia/Jerusalem')::date THEN RAISE EXCEPTION 'not_open: past'; END IF;
  SELECT * INTO v_role FROM public.event_roles WHERE id = p_event_role_id FOR UPDATE;
  IF v_role.base_rate IS NULL THEN RAISE EXCEPTION 'not_open: pending_rates'; END IF;

  IF v_ev.min_age IS NOT NULL AND (v_p.birth_date IS NULL
     OR date_part('year', age(v_p.birth_date)) < v_ev.min_age) THEN RAISE EXCEPTION 'not_eligible: age'; END IF;
  IF v_ev.min_rating IS NOT NULL AND NOT v_is_staff AND COALESCE(v_p.average_rating, 0) < v_ev.min_rating THEN
    RAISE EXCEPTION 'not_eligible: rating'; END IF;

  SELECT count(*) INTO v_filled FROM public.event_registrations
   WHERE event_role_id = p_event_role_id AND status IN ('pending','approved');
  IF v_filled >= v_role.headcount THEN RETURN 'waitlisted'::public.registration_status; END IF;
  IF v_is_staff THEN RETURN 'approved'::public.registration_status; END IF;
  RETURN 'pending'::public.registration_status;
END $$;
REVOKE ALL ON FUNCTION public.app_registration_initial_status(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_for_event_role(p_event_role_id uuid)
RETURNS public.event_registrations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_event_id uuid; v_status public.registration_status;
        v_old public.event_registrations%ROWTYPE; v_reg public.event_registrations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  v_status := public.app_registration_initial_status(v_uid, p_event_role_id);
  SELECT event_id INTO v_event_id FROM public.event_roles WHERE id = p_event_role_id;

  SELECT * INTO v_old FROM public.event_registrations WHERE event_id = v_event_id AND user_id = v_uid FOR UPDATE;
  IF FOUND THEN
    IF v_old.status = 'rejected' THEN RAISE EXCEPTION 'not_eligible: previously_rejected'; END IF;
    IF v_old.status IN ('removed','no_show') THEN RAISE EXCEPTION 'not_eligible: previously_removed'; END IF;
    IF v_old.status <> 'cancelled'
       OR EXISTS (SELECT 1 FROM public.shift_hour_submissions WHERE registration_id = v_old.id) THEN
      RAISE EXCEPTION 'already_registered'; END IF;
    -- revive a self-cancelled row (UNIQUE(event_id,user_id)); reset everything staff-set on the old row.
    -- created_at = now() INTENTIONALLY moves the revived row to the back of the FIFO waitlist.
    UPDATE public.event_registrations SET
           status = v_status, event_role_id = p_event_role_id,
           wage_rate = NULL, rate_set_by = NULL, rate_set_at = NULL, recruiter_id = NULL,
           hours_reported = NULL, actual_start_time = NULL, actual_end_time = NULL,
           cancellation_requested_at = NULL, created_by = v_uid, created_at = now()
     WHERE id = v_old.id RETURNING * INTO v_reg;
  ELSE
    INSERT INTO public.event_registrations (event_id, user_id, event_role_id, status, created_by)
    VALUES (v_event_id, v_uid, p_event_role_id, v_status, v_uid) RETURNING * INTO v_reg;
  END IF;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id)
  VALUES (v_reg.id, v_event_id, v_uid, v_old.status, v_status,
          CASE WHEN v_old.id IS NULL THEN 'self_registered' ELSE 'self_reregistered' END, v_uid);
  RETURN v_reg;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'already_registered';
END $$;
REVOKE ALL ON FUNCTION public.register_for_event_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_for_event_role(uuid) TO authenticated, service_role;

-- ROLLBACK:
--   apply supabase/register_for_event_role_v1_live.sql (R4), then
--   GRANT EXECUTE ON FUNCTION public.register_for_event_role(uuid) TO anon, authenticated, service_role;
--   DROP FUNCTION public.app_registration_initial_status(uuid, uuid);
