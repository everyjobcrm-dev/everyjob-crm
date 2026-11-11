-- PENDING (not applied). p10e: scheduling picker + recruiter list respect approval and soft delete. Apply AFTER p10c and p10d.
-- Owner runs this in the SQL Editor, then: save as supabase/migrations/20261110100400_p10e_search_employees_v3.sql,
-- `supabase migration repair --status applied 20261110100400 --linked`, regenerate types.
-- Idempotent: CREATE OR REPLACE only (same signatures and RETURNS as live -> no DROP needed). No data change.
-- Rollback: re-apply supabase/p4_m7u_search_employees_scope.sql and the E0 block of supabase/p9_e_event_edit.sql.
--
-- search_employees v3 = p4_m7u body + (a) deleted profiles excluded from the name/phone matches and from the
-- already-registered list, (b) two new NON-blocking warning codes in the existing `warnings text[]` column:
--   'pending_approval'  - profiles.approval_status = 'pending'  (picker shows "ממתין/ה לאישור" + an approve button)
--   'approval_rejected' - profiles.approval_status = 'rejected'
-- The picker does no filtering (owner decision): every match is listed, the warnings are shown beside the row.
-- list_staff_recruiters v2 = p9 E0 + deleted recruiters excluded.

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
  WHERE p.id = auth.uid() AND p.deleted_at IS NULL;
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
      AND p.deleted_at IS NULL
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
      AND p.deleted_at IS NULL
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
      CASE WHEN p.approval_status = 'pending' THEN 'pending_approval' END,
      CASE WHEN p.approval_status = 'rejected' THEN 'approval_rejected' END,
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

CREATE OR REPLACE FUNCTION public.list_staff_recruiters()
 RETURNS TABLE(id uuid, first_name text, last_name text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT p.id, p.first_name::text, p.last_name::text
    FROM public.profiles p
   WHERE p.role = 'recruiter'
     AND p.deleted_at IS NULL
     AND COALESCE(public.app_current_role()::text, '') IN ('admin', 'manager')
   ORDER BY p.first_name, p.last_name
$function$;
REVOKE ALL ON FUNCTION public.list_staff_recruiters() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_staff_recruiters() TO authenticated, service_role;

-- schedule_employee v3 = p3_m7p (v2) body with ONE change: the target employee must not be soft-deleted
-- (`AND p.deleted_at IS NULL` on the profiles lookup -> 'employee_not_found'). Everything else verbatim.
CREATE OR REPLACE FUNCTION public.schedule_employee(p_event_role_id uuid, p_employee_id uuid)
 RETURNS TABLE(registration_id uuid, warnings text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_uid uuid := auth.uid();
  v_actor_role text;
  v_event public.events%ROWTYPE;
  v_role public.event_roles%ROWTYPE;
  v_employee public.profiles%ROWTYPE;
  v_event_id uuid;
  v_registration_id uuid;
  v_registration_status public.event_registrations.status%TYPE;
  v_filled_count bigint;
  v_has_registration boolean;
  v_warnings text[];
BEGIN
  SELECT p.role::text INTO v_actor_role FROM public.profiles p WHERE p.id = v_uid AND p.deleted_at IS NULL;
  IF v_uid IS NULL OR COALESCE(v_actor_role, '') NOT IN ('admin', 'manager', 'recruiter') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_employee_id IS NOT DISTINCT FROM v_uid THEN RAISE EXCEPTION 'not_own_registration'; END IF;

  SELECT er.event_id INTO v_event_id FROM public.event_roles er WHERE er.id = p_event_role_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_role_not_found'; END IF;

  -- lock order: events (SHARE) -> event_roles (UPDATE) -> event_registrations
  SELECT e.* INTO v_event FROM public.events e WHERE e.id = v_event_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_role_not_found'; END IF;
  IF NOT public.app_can_manage_event(v_event.id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_event.status = 'cancelled' THEN RAISE EXCEPTION 'event_cancelled'; END IF;
  IF v_event.status NOT IN ('open', 'closed') THEN RAISE EXCEPTION 'event_not_schedulable'; END IF;

  SELECT er.* INTO v_role FROM public.event_roles er WHERE er.id = p_event_role_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_role_not_found'; END IF;

  SELECT p.* INTO v_employee FROM public.profiles p WHERE p.id = p_employee_id AND p.role = 'employee' AND p.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'employee_not_found'; END IF;

  IF v_event.min_age IS NOT NULL AND (v_employee.birth_date IS NULL
     OR date_part('year', age(v_employee.birth_date)) < v_event.min_age) THEN
    RAISE EXCEPTION 'not_eligible: age';
  END IF;

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
  WHERE r.event_role_id = p_event_role_id AND r.status IN ('pending', 'approved');
  IF v_filled_count >= v_role.headcount THEN RAISE EXCEPTION 'event_role_full'; END IF;

  IF v_has_registration THEN
    IF EXISTS (SELECT 1 FROM public.shift_hour_submissions s WHERE s.registration_id = v_registration_id) THEN
      RAISE EXCEPTION 'registration_has_submissions';
    END IF;
    UPDATE public.event_registrations r SET
           status = 'approved', event_role_id = p_event_role_id,
           wage_rate = NULL, rate_set_by = NULL, rate_set_at = NULL, recruiter_id = NULL,
           hours_reported = NULL, actual_start_time = NULL, actual_end_time = NULL,
           cancellation_requested_at = NULL, created_by = v_uid, created_at = now()
     WHERE r.id = v_registration_id;
  ELSE
    INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_by)
    VALUES (v_event.id, p_event_role_id, p_employee_id, 'approved', v_uid)
    RETURNING id INTO v_registration_id;
  END IF;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id)
  VALUES (v_registration_id, v_event.id, p_employee_id, v_registration_status, 'approved'::public.registration_status,
          CASE WHEN v_has_registration THEN 'organizer_readded' ELSE 'organizer_scheduled' END, v_uid);

  v_warnings := array_remove(ARRAY[
    CASE WHEN v_event.min_rating IS NOT NULL AND coalesce(v_employee.average_rating, 0) < v_event.min_rating
         THEN 'below_min_rating' END,
    CASE WHEN EXISTS (
        SELECT 1
        FROM public.event_registrations r
        JOIN public.events other_event ON other_event.id = r.event_id
        JOIN public.event_roles other_role ON other_role.id = r.event_role_id
        WHERE r.user_id = p_employee_id
          AND r.status = 'approved'
          AND other_event.status <> 'cancelled'
          AND other_event.event_date = v_event.event_date
          AND other_event.id <> v_event.id
          AND (
            other_role.end_time IS NULL
            OR v_role.end_time IS NULL
            OR (
              other_event.event_date + other_role.start_time,
              other_event.event_date + other_role.end_time
                + CASE WHEN other_role.end_time <= other_role.start_time THEN interval '1 day' ELSE interval '0' END
            ) OVERLAPS (
              v_event.event_date + v_role.start_time,
              v_event.event_date + v_role.end_time
                + CASE WHEN v_role.end_time <= v_role.start_time THEN interval '1 day' ELSE interval '0' END
            )
          ))
      THEN 'overlap' END
  ], NULL::text);

  RETURN QUERY SELECT v_registration_id::uuid, v_warnings::text[];
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'employee_already_registered';
END;
$function$;
REVOKE ALL ON FUNCTION public.schedule_employee(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.schedule_employee(uuid, uuid) TO authenticated, service_role;
-- Rollback for this block: re-apply supabase/p3_m7p_schedule_employee_v2.sql.

-- Verify read-only afterwards: SELECT md5(prosrc) FROM pg_proc WHERE proname IN ('search_employees','list_staff_recruiters','schedule_employee');
-- Tests: supabase/tests/p10cde_users_tests.sql.
