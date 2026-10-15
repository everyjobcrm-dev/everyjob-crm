-- p3_m7p: schedule_employee v2 (staff places an employee directly as 'approved').
-- Diff vs live (supabase/live_snapshot/fn_schedule_employee.sql, md5 5b96dc2d...):
--  * hierarchy scope: app_can_manage_event(event) (recruiter: own events only);
--  * event must be 'open' or 'closed';
--  * lock order events (SHARE) -> event_roles (UPDATE) -> event_registrations (was events FOR UPDATE);
--  * capacity = pending + approved only;
--  * min_age is ENFORCED ('not_eligible: age'); min_rating stays a warning (staff override);
--  * an active registration (pending/approved/waitlisted/...) is rejected; only cancelled/removed rows are revived;
--  * revive resets every staff-set column; created_by = auth.uid() on insert and revive;
--  * a staff member never schedules themself.
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
  SELECT p.role::text INTO v_actor_role FROM public.profiles p WHERE p.id = v_uid;
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

  SELECT p.* INTO v_employee FROM public.profiles p WHERE p.id = p_employee_id AND p.role = 'employee';
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

-- ROLLBACK (R7p): apply the body of supabase/live_snapshot/fn_schedule_employee.sql (lines 3..end), then
--   GRANT EXECUTE ON FUNCTION public.schedule_employee(uuid, uuid) TO authenticated, service_role;
-- Dependents: app/manager/actions.ts (scheduleEmployee); no DB objects depend on this function.
