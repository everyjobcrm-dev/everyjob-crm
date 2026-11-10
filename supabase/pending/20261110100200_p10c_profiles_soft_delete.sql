-- PENDING (not applied). p10c: soft delete for users (profiles.deleted_at) instead of hard delete.
-- Owner runs this in the SQL Editor, then: save as supabase/migrations/20261110100200_p10c_profiles_soft_delete.sql,
-- `supabase migration repair --status applied 20261110100200 --linked`, regenerate types.
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE. No DROP, no data change.
-- Rollback: re-apply supabase/p1_m2_app_current_role.sql, supabase/p1_m2b_app_can_manage_event.sql and
--           supabase/live_snapshot/fn_is_current_user_admin.sql (lines 3..end);
--           the columns and the two RPCs may stay (harmless).
--
-- Model:
--   * profiles.deleted_at / deleted_by mark a user as deleted. Nothing is removed: registrations, hour reports, ratings,
--     history and credits stay (payroll/audit). profiles.email / profiles.tz stay UNIQUE, so a deleted person cannot
--     sign up again with the same id/email until an admin restores them (documented, intentional).
--   * app_current_role() and is_current_user_admin() return NULL / false for a deleted user, so every RLS policy and
--     RPC that goes through them denies. RPCs that read profiles.role directly are covered by the auth ban: the admin
--     server action bans the auth user (service role, ban_duration) right after soft_delete_user, and restore_user
--     lifts it; the app also refuses a deleted profile in getAuthContext / getUserRole.
--   * soft_delete_user / restore_user: Admin only, never self. A deleted employee still occupies capacity on upcoming
--     events (DECISION: nothing automatic; staff remove them from the roster if needed - history keeps the audit).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id);

-- p1_m2 body + deleted filter (grants restated)
CREATE OR REPLACE FUNCTION public.app_current_role() RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL $$;
REVOKE ALL ON FUNCTION public.app_current_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_current_role() TO authenticated, service_role;

-- live body (supabase/live_snapshot/fn_is_current_user_admin.sql) + deleted filter
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS admin_profile
    WHERE admin_profile.id = (SELECT auth.uid())
      AND admin_profile.role::text = 'admin'
      AND admin_profile.deleted_at IS NULL
  );
$function$;

-- p1_m2b body + deleted filter (grants restated)
CREATE OR REPLACE FUNCTION public.app_can_manage_event(p_event_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL AND (
    p.role IN ('admin','manager')
    OR (p.role = 'recruiter' AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.recruiter_id = p.id))));
$$;
REVOKE ALL ON FUNCTION public.app_can_manage_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_can_manage_event(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.soft_delete_user(p_user_id uuid) RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_deleted_at timestamptz;
BEGIN
  IF v_uid IS NULL OR COALESCE(public.app_current_role()::text, '') <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_user_id = v_uid THEN RAISE EXCEPTION 'cannot_delete_self'; END IF;
  SELECT p.deleted_at INTO v_deleted_at FROM public.profiles p WHERE p.id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
  IF v_deleted_at IS NOT NULL THEN RAISE EXCEPTION 'already_deleted'; END IF;
  UPDATE public.profiles SET deleted_at = now(), deleted_by = v_uid WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_user(p_user_id uuid) RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_deleted_at timestamptz;
BEGIN
  IF v_uid IS NULL OR COALESCE(public.app_current_role()::text, '') <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT p.deleted_at INTO v_deleted_at FROM public.profiles p WHERE p.id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
  IF v_deleted_at IS NULL THEN RAISE EXCEPTION 'not_deleted'; END IF;
  UPDATE public.profiles SET deleted_at = NULL, deleted_by = NULL WHERE id = p_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.soft_delete_user(uuid), public.restore_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_user(uuid), public.restore_user(uuid) TO authenticated, service_role;

-- Verify read-only afterwards:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('deleted_at','deleted_by');
--   SELECT has_function_privilege('anon', 'public.soft_delete_user(uuid)', 'EXECUTE');  -- false
-- Tests: supabase/tests/p10cde_users_tests.sql (after p10c, p10d, p10e).
