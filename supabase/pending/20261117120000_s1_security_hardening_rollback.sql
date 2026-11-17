-- Rollback for 20261117120000_s1_security_hardening.sql: restores the grants as they were on 2026-11-17.
BEGIN;
GRANT INSERT, UPDATE, DELETE ON public.events, public.event_roles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_historical_event_attendee(uuid, uuid, uuid) TO anon, public;
GRANT EXECUTE ON FUNCTION public.auto_promote_from_waitlist() TO anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO anon, public;
ALTER FUNCTION public.set_updated_at() RESET search_path;
ALTER FUNCTION public.set_shift_submission_refs() RESET search_path;
ALTER FUNCTION public.fn_promote_waitlist() RESET search_path;
COMMIT;
