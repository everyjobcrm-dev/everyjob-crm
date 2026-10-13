-- p4_m8b: per-event pending / waitlisted / open-cancellation-request counts for the staff events list.
-- Scoped by app_can_manage_event (recruiter: own events); cancelled events excluded. Derived on read, never stored.
CREATE OR REPLACE FUNCTION public.get_staff_event_request_counts()
 RETURNS TABLE(event_id uuid, pending_count bigint, waitlisted_count bigint, cancellation_request_count bigint)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT r.event_id,
         count(*) FILTER (WHERE r.status = 'pending'),
         count(*) FILTER (WHERE r.status = 'waitlisted'),
         count(*) FILTER (WHERE r.cancellation_requested_at IS NOT NULL AND r.status IN ('pending', 'approved', 'waitlisted'))
    FROM public.event_registrations r
    JOIN public.events e ON e.id = r.event_id
   WHERE e.status IS DISTINCT FROM 'cancelled'
     AND public.app_can_manage_event(r.event_id)
   GROUP BY r.event_id
$function$;
REVOKE ALL ON FUNCTION public.get_staff_event_request_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_event_request_counts() TO authenticated, service_role;
-- Rollback (SQL Editor, by hand): DROP FUNCTION IF EXISTS public.get_staff_event_request_counts();
