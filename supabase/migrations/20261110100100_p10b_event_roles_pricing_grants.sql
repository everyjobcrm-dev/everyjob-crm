-- PENDING (not applied). p10b: client pricing (event_roles.bill_to_client) is Admin-only to READ.
-- Owner runs this in the SQL Editor TOGETHER with the app change in app/admin/actions.ts (fetchEventForEdit reads the price
-- through get_event_role_pricing). Then: save as supabase/migrations/20261110100100_p10b_event_roles_pricing_grants.sql,
-- `supabase migration repair --status applied 20261110100100 --linked`, regenerate types.
-- Idempotent: REVOKE / GRANT / CREATE OR REPLACE only. No DROP, no data change.
-- Rollback: GRANT SELECT ON public.event_roles TO authenticated;  (the RPC may stay)
--
-- Why: the live SELECT policy on event_roles is `true` for every authenticated user and the table grant covers every
-- column, so employees and recruiters could read the price the client pays (docs/handoff.md §9, payroll design §3).
-- Column list below = the LIVE columns of event_roles on 2026-11-10 (id, event_id, role_name, headcount, start_time,
-- end_time, base_rate, created_at, wage_to_worker, bill_to_client) minus bill_to_client.
-- GOTCHA for future migrations: after this, any new column added to event_roles is INVISIBLE to the app until it is
-- added to the column GRANT below. INSERT/UPDATE/DELETE grants and the RLS policies are untouched; the app never
-- selects `*` from event_roles (verified: app/admin/actions.ts, app/employee/events/actions.ts, app/manager/events/[eventId]/page.tsx).
-- upsert_event_role (p9 E2) still RETURNS the whole row to its SECURITY DEFINER caller; that value only reaches the
-- server action, never the browser (saveEventRole ignores it).

REVOKE SELECT ON public.event_roles FROM anon, authenticated;
GRANT SELECT (id, event_id, role_name, headcount, start_time, end_time, base_rate, created_at, wage_to_worker)
  ON public.event_roles TO authenticated;

-- Admin-only read of the client price per role (edit page).
CREATE OR REPLACE FUNCTION public.get_event_role_pricing(p_event_id uuid)
 RETURNS TABLE(role_id uuid, bill_to_client numeric)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF COALESCE(public.app_current_role()::text, '') <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  RETURN QUERY
    SELECT r.id, r.bill_to_client
      FROM public.event_roles r
     WHERE r.event_id = p_event_id
     ORDER BY r.start_time, r.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_event_role_pricing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_role_pricing(uuid) TO authenticated, service_role;

-- Verify read-only afterwards:
--   SELECT column_name FROM information_schema.column_privileges
--    WHERE table_name = 'event_roles' AND grantee = 'authenticated' AND privilege_type = 'SELECT';   -- no bill_to_client
--   SELECT has_function_privilege('anon', 'public.get_event_role_pricing(uuid)', 'EXECUTE');          -- false
-- Then run supabase/tests/p10b_pricing_grants_tests.sql (rolls back; expect every 'r' = PASS).
