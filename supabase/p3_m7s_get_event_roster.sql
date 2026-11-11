-- p3_m7s: get_event_roster - read-only staff roster of one event (all registrations, every status).
--  * SECURITY DEFINER, scoped by app_can_manage_event (recruiter: own events only); anyone else gets 'not_authorized'.
--  * Never returns tz, email, bank details or documents.
--  * wage_rate / rate_set_at are returned to admin/manager only (NULL for a recruiter).
--  * Latest non-voided hour submission per registration via LEFT JOIN LATERAL ... LIMIT 1 (exactly one row per registration).
--  * waitlist_position: FIFO position (created_at, id) within the role, only for waitlisted rows.
CREATE OR REPLACE FUNCTION public.get_event_roster(p_event_id uuid)
 RETURNS TABLE(
   registration_id uuid, event_role_id uuid, role_name text, user_id uuid,
   first_name text, last_name text, phone_number text, worker_role text, age int, average_rating numeric,
   status public.registration_status, cancellation_requested_at timestamptz, registered_at timestamptz,
   waitlist_position bigint, wage_rate numeric, rate_set_at timestamptz,
   submission_id uuid, submission_status text, reported_hours numeric)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_actor_role text;
  v_sees_rates boolean;
BEGIN
  SELECT p.role::text INTO v_actor_role FROM public.profiles p WHERE p.id = auth.uid();
  IF auth.uid() IS NULL OR COALESCE(v_actor_role, '') NOT IN ('admin', 'manager', 'recruiter')
     OR NOT public.app_can_manage_event(p_event_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  v_sees_rates := v_actor_role IN ('admin', 'manager');

  RETURN QUERY
  SELECT r.id, r.event_role_id, er.role_name, r.user_id,
         pr.first_name, pr.last_name, pr.phone_number, pr.role::text,
         CASE WHEN pr.birth_date IS NULL THEN NULL ELSE date_part('year', age(pr.birth_date))::int END,
         pr.average_rating,
         r.status, r.cancellation_requested_at, r.created_at,
         CASE WHEN r.status = 'waitlisted'
              THEN row_number() OVER (PARTITION BY r.event_role_id, (r.status = 'waitlisted') ORDER BY r.created_at, r.id) END,
         CASE WHEN v_sees_rates THEN r.wage_rate END,
         CASE WHEN v_sees_rates THEN r.rate_set_at END,
         s.id, s.status::text, s.reported_hours
    FROM public.event_registrations r
    JOIN public.profiles pr ON pr.id = r.user_id
    LEFT JOIN public.event_roles er ON er.id = r.event_role_id
    LEFT JOIN LATERAL (
      SELECT s1.id, s1.status, s1.reported_hours
        FROM public.shift_hour_submissions s1
       WHERE s1.registration_id = r.id AND s1.voided_at IS NULL
       ORDER BY s1.submitted_at DESC NULLS LAST, s1.id DESC
       LIMIT 1
    ) s ON true
   WHERE r.event_id = p_event_id
   ORDER BY er.start_time NULLS LAST, er.role_name, r.created_at, r.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_event_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_roster(uuid) TO authenticated, service_role;

-- ROLLBACK (R7s, run in the SQL Editor - contains DROP):
--   DROP FUNCTION IF EXISTS public.get_event_roster(uuid);
-- Dependents: app/manager/events/[eventId]/page.tsx (roster).
