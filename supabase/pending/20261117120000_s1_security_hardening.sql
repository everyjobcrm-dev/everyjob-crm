-- PENDING (NOT applied). Migration S1, security hardening from the 2026-11-17 due-diligence sweep
-- (docs/due-diligence/security-review.md). AGENTS §8.1: run only after the owner confirms these exact contents.
-- Rollback: 20261117120000_s1_security_hardening_rollback.sql. No DROP statements (safe for the MCP).
--
-- 1. Narrow direct writes on events / event_roles to what the app actually does (roadmap Stage 2 backlog item).
--    App writes found (app/admin/actions.ts): events INSERT (createEvent), events UPDATE of `status` only
--    (setEventStatus, createEvent fallback), events DELETE (Admin), event_roles INSERT (createEvent, without
--    bill_to_client: the B1 trigger fills it). Every other edit goes through SECURITY DEFINER RPCs
--    (update_event_details, upsert_event_role, remove_event_role), which do not need these grants.
--    Today `authenticated` may UPDATE every column, so a recruiter can PATCH event_roles.bill_to_client (Admin-only
--    client pricing) on their own event through the REST API. RLS policies are unchanged (AGENTS §8.4).
BEGIN;

REVOKE INSERT, UPDATE, DELETE ON public.events, public.event_roles FROM anon;

REVOKE UPDATE ON public.events FROM authenticated;
GRANT UPDATE (status) ON public.events TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.event_roles FROM authenticated;
GRANT INSERT (event_id, role_name, headcount, start_time, end_time, base_rate) ON public.event_roles TO authenticated;

-- 2. SECURITY DEFINER functions callable without signing in (advisor 0028). Trigger and event-trigger functions are
--    never called over RPC; the other two check auth.uid() but have no reason to be public.
REVOKE EXECUTE ON FUNCTION public.add_historical_event_attendee(uuid, uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.auto_promote_from_waitlist() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM anon, public;

-- 3. Mutable search_path (advisor 0011).
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_shift_submission_refs() SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_promote_waitlist() SET search_path = public, pg_temp;

COMMIT;

-- Verify (read-only), expected values in comments:
--   SELECT has_table_privilege('authenticated','public.events','UPDATE');                          -- false
--   SELECT has_column_privilege('authenticated','public.events','status','UPDATE');                -- true
--   SELECT has_column_privilege('authenticated','public.events','recruiter_id','UPDATE');          -- false
--   SELECT has_column_privilege('authenticated','public.event_roles','bill_to_client','INSERT');   -- false
--   SELECT has_column_privilege('authenticated','public.event_roles','bill_to_client','UPDATE');   -- false
--   SELECT has_table_privilege('anon','public.events','INSERT');                                   -- false
--   SELECT has_function_privilege('anon','public.add_historical_event_attendee(uuid,uuid,uuid)','EXECUTE'); -- false
-- Then in the browser: create an event with roles (Recruiter), change status open/closed (Recruiter, own event),
-- edit an event and its roles (Manager), delete an event (Admin), sign up a new user (handle_new_user trigger).
