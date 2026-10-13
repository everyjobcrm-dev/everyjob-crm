-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_functiondef (CRLF normalised to LF). Live-only: not defined anywhere else in this repo.
CREATE OR REPLACE FUNCTION public.schedule_employee(p_event_role_id uuid, p_employee_id uuid)
 RETURNS TABLE(registration_id uuid, warnings text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_actor_role public.profiles.role%TYPE;
  v_event public.events%ROWTYPE;
  v_role public.event_roles%ROWTYPE;
  v_employee public.profiles%ROWTYPE;
  v_registration_id uuid;
  v_registration_status public.event_registrations.status%TYPE;
  v_filled_count bigint;
  v_has_registration boolean;
  v_age integer;
  v_warnings text[];
BEGIN
  SELECT p.role INTO v_actor_role
  FROM public.profiles p
  WHERE p.id = auth.uid();
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'manager', 'recruiter') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT e.* INTO v_event
  FROM public.events e
  JOIN public.event_roles er ON er.event_id = e.id
  WHERE er.id = p_event_role_id
  FOR UPDATE OF e;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_role_not_found'; END IF;
  IF v_event.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'event_not_schedulable';
  END IF;

  SELECT er.* INTO v_role
  FROM public.event_roles er
  WHERE er.id = p_event_role_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_role_not_found'; END IF;

  SELECT p.* INTO v_employee
  FROM public.profiles p
  WHERE p.id = p_employee_id AND p.role = 'employee';
  IF NOT FOUND THEN RAISE EXCEPTION 'employee_not_found'; END IF;

  SELECT r.id, r.status INTO v_registration_id, v_registration_status
  FROM public.event_registrations r
  WHERE r.event_id = v_event.id AND r.user_id = p_employee_id
  FOR UPDATE;
  v_has_registration := FOUND;
  IF v_has_registration AND v_registration_status NOT IN ('cancelled', 'removed') THEN
    RAISE EXCEPTION 'employee_already_registered';
  END IF;

  SELECT count(*)::bigint INTO v_filled_count
  FROM public.event_registrations r
  WHERE r.event_role_id = p_event_role_id
    AND r.status IN ('pending', 'approved', 'registered', 'confirmed', 'completed');
  IF v_filled_count >= v_role.headcount THEN
    RAISE EXCEPTION 'event_role_full';
  END IF;

  IF v_has_registration THEN
    IF EXISTS (
      SELECT 1 FROM public.shift_hour_submissions s
      WHERE s.registration_id = v_registration_id
    ) THEN
      RAISE EXCEPTION 'registration_has_submissions';
    END IF;
    UPDATE public.event_registrations r
    SET status = 'approved', event_role_id = p_event_role_id
    WHERE r.id = v_registration_id;
  ELSE
    INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status)
    VALUES (v_event.id, p_event_role_id, p_employee_id, 'approved')
    RETURNING id INTO v_registration_id;
  END IF;

  INSERT INTO public.registration_status_history (
    registration_id, event_id, employee_id, from_status, to_status, action, actor_id
  )
  VALUES (
    v_registration_id,
    v_event.id,
    p_employee_id,
    v_registration_status,
    'approved'::public.registration_status,
    CASE WHEN v_has_registration THEN 'organizer_readded' ELSE 'organizer_scheduled' END,
    auth.uid()
  );

  v_age := CASE
    WHEN v_employee.birth_date IS NULL THEN NULL
    ELSE extract(year FROM age(current_date, v_employee.birth_date))::integer
  END;
  v_warnings := array_remove(ARRAY[
    CASE
      WHEN v_event.min_rating IS NOT NULL
        AND coalesce(v_employee.average_rating, 0) < v_event.min_rating
      THEN 'below_min_rating'
    END,
    CASE
      WHEN v_event.min_age IS NOT NULL
        AND (v_age IS NULL OR v_age < v_event.min_age)
      THEN 'below_min_age'
    END,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.event_registrations r
        JOIN public.events other_event ON other_event.id = r.event_id
        JOIN public.event_roles other_role ON other_role.id = r.event_role_id
        WHERE r.user_id = p_employee_id
          AND r.status = 'approved'
          AND other_event.event_date = v_event.event_date
          AND other_event.id <> v_event.id
          AND (
            other_role.end_time IS NULL
            OR v_role.end_time IS NULL
            OR (
              other_event.event_date + other_role.start_time,
              other_event.event_date + other_role.end_time
                + CASE WHEN other_role.end_time <= other_role.start_time
                  THEN interval '1 day' ELSE interval '0' END
            ) OVERLAPS (
              v_event.event_date + v_role.start_time,
              v_event.event_date + v_role.end_time
                + CASE WHEN v_role.end_time <= v_role.start_time
                  THEN interval '1 day' ELSE interval '0' END
            )
          )
      )
      THEN 'overlap'
    END
  ], NULL::text);

  RETURN QUERY SELECT v_registration_id::uuid, v_warnings::text[];
END;
$function$
;
