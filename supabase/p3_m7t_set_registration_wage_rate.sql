-- p3_m7t: set_registration_wage_rate - employee hourly rate on an approved registration.
--  * Admin: any time. Manager: until the 10th (inclusive) of the month after the event date, Asia/Jerusalem. Recruiter: never.
--  * Never on the caller's own registration; event not cancelled (completed/paused: admin only); registration 'approved'; rate > 0.
--  * Sets wage_rate, rate_set_by = auth.uid(), rate_set_at = now(); writes a history row (from = to = 'approved').
-- app_manager_rate_deadline is a pure helper so the 10th/11th boundary can be tested without faking the clock.
CREATE OR REPLACE FUNCTION public.app_manager_rate_deadline(p_event_date date)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SECURITY INVOKER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT (date_trunc('month', p_event_date) + interval '1 month' + interval '9 days')::date
$function$;
REVOKE ALL ON FUNCTION public.app_manager_rate_deadline(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_manager_rate_deadline(date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_registration_wage_rate(p_registration_id uuid, p_wage_rate numeric)
 RETURNS public.event_registrations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_actor_role text;
  v_event_id uuid;
  v_role_id uuid;
  v_event public.events%ROWTYPE;
  v_old public.event_registrations%ROWTYPE;
  v_new public.event_registrations%ROWTYPE;
BEGIN
  SELECT p.role::text INTO v_actor_role FROM public.profiles p WHERE p.id = v_uid;
  IF v_uid IS NULL OR COALESCE(v_actor_role, '') NOT IN ('admin', 'manager') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_wage_rate IS NULL OR p_wage_rate <= 0 THEN RAISE EXCEPTION 'invalid_rate'; END IF;

  SELECT r.event_id, r.event_role_id INTO v_event_id, v_role_id
  FROM public.event_registrations r WHERE r.id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;

  -- lock order: events (SHARE) -> event_roles (UPDATE) -> event_registrations
  SELECT e.* INTO v_event FROM public.events e WHERE e.id = v_event_id FOR SHARE;
  IF NOT public.app_can_manage_event(v_event_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_event.status = 'cancelled' THEN RAISE EXCEPTION 'event_cancelled'; END IF;
  IF v_event.status IN ('completed', 'paused') AND v_actor_role <> 'admin' THEN RAISE EXCEPTION 'event_completed'; END IF;
  IF v_actor_role = 'manager'
     AND (now() AT TIME ZONE 'Asia/Jerusalem')::date > public.app_manager_rate_deadline(v_event.event_date) THEN
    RAISE EXCEPTION 'rate_window_closed';
  END IF;
  PERFORM 1 FROM public.event_roles er WHERE er.id = v_role_id FOR UPDATE;

  SELECT r.* INTO v_old FROM public.event_registrations r WHERE r.id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  IF v_old.user_id = v_uid THEN RAISE EXCEPTION 'not_own_registration'; END IF;
  IF v_old.status <> 'approved' THEN RAISE EXCEPTION 'registration_not_approved'; END IF;

  UPDATE public.event_registrations r
     SET wage_rate = p_wage_rate, rate_set_by = v_uid, rate_set_at = now()
   WHERE r.id = p_registration_id RETURNING r.* INTO v_new;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id, reason)
  VALUES (v_old.id, v_old.event_id, v_old.user_id, v_old.status, v_old.status, 'rate_set', v_uid,
          'wage_rate: ' || COALESCE(v_old.wage_rate::text, '-') || ' -> ' || p_wage_rate::text);
  RETURN v_new;
END;
$function$;
REVOKE ALL ON FUNCTION public.set_registration_wage_rate(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_registration_wage_rate(uuid, numeric) TO authenticated, service_role;

-- ROLLBACK (R7t, run in the SQL Editor - contains DROP):
--   DROP FUNCTION IF EXISTS public.set_registration_wage_rate(uuid, numeric);
--   DROP FUNCTION IF EXISTS public.app_manager_rate_deadline(date);
-- Dependents: app/manager/actions.ts (setEmployeeRate).
