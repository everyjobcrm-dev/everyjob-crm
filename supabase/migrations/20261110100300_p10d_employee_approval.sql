-- PENDING (not applied). p10d: new-employee approval (profiles.approval_status). Apply AFTER p10c (uses deleted_at).
-- Owner runs this in the SQL Editor, then: save as supabase/migrations/20261110100300_p10d_employee_approval.sql,
-- `supabase migration repair --status applied 20261110100300 --linked`, regenerate types.
-- Idempotent: ADD COLUMN IF NOT EXISTS, guarded ADD CONSTRAINT, CREATE OR REPLACE. No DROP.
-- Data effect (one-shot, by construction): the column is added with DEFAULT 'approved' so every EXISTING profile is
-- approved, then the default is switched to 'pending' so every NEW signup waits for approval. Re-running changes nothing.
-- Rollback: re-apply supabase/p1_m0_profiles_guard_allowlist.sql (guard v2); the columns and the RPC may stay.
--
-- Model (this run's DECISIONs):
--   * approval_status: pending | approved | rejected. Approvers: Admin, Manager, Recruiter (set_employee_approval);
--     the target must have role 'employee', must not be deleted, and is never the caller.
--   * A pending employee is NOT blocked from self-registering for shifts and NOT filtered out of the scheduling picker:
--     the picker shows "ממתין/ה לאישור" and a side warning (search_employees v3, p10e). Conservative + reversible;
--     blocking can be added in register_for_event_role later if the owner wants it.
--   * Self-service: the profile guard forces approval_status = 'pending' (and deleted_at = NULL) on any client INSERT,
--     and the UPDATE allow-list (first_name, last_name, phone_number, gender, birth_date) already excludes both.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approval_set_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approval_set_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_approval_status_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

ALTER TABLE public.profiles ALTER COLUMN approval_status SET DEFAULT 'pending';

-- profiles protection guard v3 = p1_m0 (v2) + forced approval/deleted columns on client INSERT. Trigger unchanged.
CREATE OR REPLACE FUNCTION public.guard_profile_protected_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE
  v_allowed constant text[] := ARRAY['first_name','last_name','phone_number','gender','birth_date'];
BEGIN
  IF current_user NOT IN ('anon','authenticated') THEN RETURN NEW; END IF;
  IF public.is_current_user_admin() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'employee';  NEW.can_create_events := false;
    NEW.average_rating := 0; NEW.total_ratings := 0;
    NEW.email_verified := false; NEW.phone_verified := false;
    NEW.approval_status := 'pending'; NEW.approval_set_by := NULL; NEW.approval_set_at := NULL;
    NEW.deleted_at := NULL; NEW.deleted_by := NULL;
    RETURN NEW;
  END IF;

  -- allow-list: everything except these keys must be unchanged; birth_date only while it is still NULL
  IF (to_jsonb(NEW) - v_allowed) IS DISTINCT FROM (to_jsonb(OLD) - v_allowed)
     OR (NEW.birth_date IS DISTINCT FROM OLD.birth_date AND OLD.birth_date IS NOT NULL) THEN
    RAISE EXCEPTION 'protected profile fields can only be changed by an admin' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.set_employee_approval(p_employee_id uuid, p_status text) RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := COALESCE(public.app_current_role()::text, '');
  v_target public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('admin', 'manager', 'recruiter') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('pending', 'approved', 'rejected') THEN RAISE EXCEPTION 'invalid_value'; END IF;
  IF p_employee_id = v_uid THEN RAISE EXCEPTION 'not_own_registration'; END IF;
  SELECT p.* INTO v_target FROM public.profiles p WHERE p.id = p_employee_id FOR UPDATE;
  IF NOT FOUND OR v_target.role::text <> 'employee' THEN RAISE EXCEPTION 'employee_not_found'; END IF;
  IF v_target.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'user_deleted'; END IF;
  IF v_target.approval_status = p_status THEN RETURN; END IF;
  UPDATE public.profiles
     SET approval_status = p_status, approval_set_by = v_uid, approval_set_at = now()
   WHERE id = p_employee_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.set_employee_approval(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_employee_approval(uuid, text) TO authenticated, service_role;

-- Verify read-only afterwards:
--   SELECT approval_status, count(*) FROM public.profiles GROUP BY 1;            -- every existing row 'approved'
--   SELECT column_default FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'approval_status'; -- 'pending'
--   SELECT has_function_privilege('anon', 'public.set_employee_approval(uuid,text)', 'EXECUTE');  -- false
-- Tests: supabase/tests/p10cde_users_tests.sql (after p10c, p10d, p10e).
