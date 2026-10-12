-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_functiondef (CRLF normalised to LF). Live-only: not defined anywhere else in this repo.
CREATE OR REPLACE FUNCTION public.add_historical_event_attendee(p_event_id uuid, p_event_role_id uuid, p_employee_id uuid)
 RETURNS event_registrations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event public.events%ROWTYPE;
  v_role public.event_roles%ROWTYPE;
  v_registration public.event_registrations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_event
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND
     OR v_event.status <> 'closed'
     OR v_event.event_date >= (now() AT TIME ZONE 'Asia/Jerusalem')::date THEN
    RAISE EXCEPTION 'event_not_historical';
  END IF;

  SELECT * INTO v_role
  FROM public.event_roles
  WHERE id = p_event_role_id
    AND event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'role_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_employee_id
      AND role = 'employee'
  ) THEN
    RAISE EXCEPTION 'employee_not_found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.event_registrations
    WHERE event_id = p_event_id
      AND event_role_id = p_event_role_id
      AND user_id = p_employee_id
  ) THEN
    RAISE EXCEPTION 'already_assigned';
  END IF;

  INSERT INTO public.event_registrations (
    event_id,
    event_role_id,
    user_id,
    status,
    created_by
  )
  VALUES (
    p_event_id,
    p_event_role_id,
    p_employee_id,
    'approved',
    auth.uid()
  )
  RETURNING * INTO v_registration;

  RETURN v_registration;
END;
$function$
;
