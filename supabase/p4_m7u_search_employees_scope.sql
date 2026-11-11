-- p4_m7u: search_employees scoped by app_can_manage_event (a recruiter may only search in the context of own events).
-- Body = supabase/live_snapshot/fn_search_employees.sql VERBATIM plus ONE line after the event_not_found check.
-- SECURITY DEFINER and search_path are kept explicit in the header (unchanged from live).
CREATE OR REPLACE FUNCTION public.search_employees(p_query text, p_event_id uuid)
 RETURNS TABLE(employee_id uuid, first_name text, last_name text, phone_number text, age_years integer, average_rating numeric, registration_id uuid, registration_status text, registered_at timestamp with time zone, wage_rate numeric, base_rate numeric, event_role_id uuid, event_role_name text, warnings text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_actor_role public.profiles.role%TYPE;
BEGIN
  SELECT p.role INTO v_actor_role
  FROM public.profiles p
  WHERE p.id = auth.uid();
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'manager', 'recruiter') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id) THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;
  IF NOT public.app_can_manage_event(p_event_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  RETURN QUERY
  WITH target_event AS (
    SELECT e.id, e.event_date, e.min_age, e.min_rating
    FROM public.events e
    WHERE e.id = p_event_id
  ),
  matching_employees AS (
    SELECT p.id
    FROM public.profiles p
    WHERE p.role = 'employee'
      AND length(btrim(coalesce(p_query, ''))) >= 2
      AND (
        position(lower(btrim(p_query)) IN lower(concat_ws(' ', p.first_name, p.last_name))) > 0
        OR position(lower(btrim(p_query)) IN lower(coalesce(p.phone_number, ''))) > 0
      )
    ORDER BY p.last_name, p.first_name, p.id
    LIMIT 20
  ),
  employees AS (
    SELECT p.id
    FROM public.profiles p
    WHERE p.role = 'employee'
      AND EXISTS (
        SELECT 1
        FROM public.event_registrations r
        WHERE r.event_id = p_event_id AND r.user_id = p.id
      )
    UNION
    SELECT m.id FROM matching_employees m
  )
  SELECT
    p.id::uuid,
    p.first_name::text,
    p.last_name::text,
    p.phone_number::text,
    (CASE WHEN p.birth_date IS NULL THEN NULL
      ELSE extract(year FROM age(current_date, p.birth_date))::integer
    END)::integer,
    p.average_rating::numeric,
    r.id::uuid,
    r.status::text,
    r.created_at::timestamptz,
    (CASE WHEN v_actor_role IN ('admin', 'manager') THEN r.wage_rate END)::numeric,
    (CASE WHEN v_actor_role IN ('admin', 'manager') THEN role.base_rate END)::numeric,
    r.event_role_id::uuid,
    role.role_name::text,
    array_remove(ARRAY[
      CASE
        WHEN target_event.min_rating IS NOT NULL
          AND coalesce(p.average_rating, 0) < target_event.min_rating
        THEN 'below_min_rating'
      END,
      CASE
        WHEN target_event.min_age IS NOT NULL
          AND (p.birth_date IS NULL OR extract(year FROM age(current_date, p.birth_date)) < target_event.min_age)
        THEN 'below_min_age'
      END,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM public.event_registrations other_registration
          JOIN public.events other_event ON other_event.id = other_registration.event_id
          JOIN public.event_roles other_role ON other_role.id = other_registration.event_role_id
          JOIN public.event_roles target_role ON target_role.event_id = target_event.id
          WHERE other_registration.user_id = p.id
            AND other_registration.status = 'approved'
            AND other_event.event_date = target_event.event_date
            AND other_event.id <> target_event.id
            AND (
              other_role.end_time IS NULL
              OR target_role.end_time IS NULL
              OR (
                other_event.event_date + other_role.start_time,
                other_event.event_date + other_role.end_time
                  + CASE WHEN other_role.end_time <= other_role.start_time
                    THEN interval '1 day' ELSE interval '0' END
              ) OVERLAPS (
                target_event.event_date + target_role.start_time,
                target_event.event_date + target_role.end_time
                  + CASE WHEN target_role.end_time <= target_role.start_time
                    THEN interval '1 day' ELSE interval '0' END
              )
            )
        )
        THEN 'overlap'
      END
    ], NULL::text)::text[]
  FROM employees selected
  JOIN public.profiles p ON p.id = selected.id
  CROSS JOIN target_event
  LEFT JOIN public.event_registrations r
    ON r.event_id = target_event.id AND r.user_id = p.id
  LEFT JOIN public.event_roles role ON role.id = r.event_role_id
  ORDER BY (r.id IS NOT NULL) DESC, p.last_name, p.first_name, p.id;
END;
$function$
;

REVOKE ALL ON FUNCTION public.search_employees(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_employees(text, uuid) TO authenticated, service_role;

-- ROLLBACK (R7u): apply the body of supabase/live_snapshot/fn_search_employees.sql (lines 3..end), then
--   GRANT EXECUTE ON FUNCTION public.search_employees(text, uuid) TO authenticated, service_role;
