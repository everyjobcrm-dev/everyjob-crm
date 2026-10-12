-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_functiondef (CRLF normalised to LF). Live-only: not defined anywhere else in this repo.
CREATE OR REPLACE FUNCTION public.remove_scheduled_employee(p_registration_id uuid, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor_role public.profiles.role%TYPE;
  v_registration public.event_registrations%ROWTYPE;
  v_event_id uuid;
  v_role_id uuid;
BEGIN
  SELECT p.role INTO v_actor_role
  FROM public.profiles p WHERE p.id = auth.uid();
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'manager', 'recruiter') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF nullif(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT r.event_id, r.event_role_id INTO v_event_id, v_role_id
  FROM public.event_registrations r WHERE r.id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;

  -- same lock order as schedule_employee: event, role, registration
  PERFORM 1 FROM public.events e WHERE e.id = v_event_id FOR UPDATE;
  PERFORM 1 FROM public.event_roles er WHERE er.id = v_role_id FOR UPDATE;

  SELECT r.* INTO v_registration
  FROM public.event_registrations r
  WHERE r.id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  IF v_registration.status IN ('removed', 'cancelled') THEN
    RAISE EXCEPTION 'registration_not_active';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.shift_hour_submissions s
    WHERE s.registration_id = p_registration_id
  ) THEN
    RAISE EXCEPTION 'registration_has_submissions';
  END IF;

  UPDATE public.event_registrations r
  SET status = 'removed' WHERE r.id = p_registration_id;

  INSERT INTO public.registration_status_history (
    registration_id, event_id, employee_id, from_status, to_status, action, actor_id, reason
  )
  VALUES (
    v_registration.id, v_registration.event_id, v_registration.user_id,
    v_registration.status, 'removed'::public.registration_status,
    'organizer_removed', auth.uid(), btrim(p_reason)
  );
  RETURN p_registration_id;
END;
$function$
;
