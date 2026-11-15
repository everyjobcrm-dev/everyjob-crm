-- Rollback for C6a: the live definition before O2 (md5 3709ce7e0cceb83d5b6c11e970dbe012). No DROP.
CREATE OR REPLACE FUNCTION public.register_for_event_role(p_event_role_id uuid)
 RETURNS event_registrations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END $function$;
