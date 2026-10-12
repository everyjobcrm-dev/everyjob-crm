-- p1_m0: profiles protection guard v2 (allow-list). Replaces the function only; the live trigger
-- trg_guard_profile_protected_columns is already BEFORE INSERT OR UPDATE ... FOR EACH ROW and is kept as is.
-- Direct client DML (PostgREST as anon/authenticated) is policed; service_role, postgres/supabase_admin,
-- supabase_auth_admin and owner-context SECURITY DEFINER routines run as other roles. anon is NOT exempt.
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
    RETURN NEW;
  END IF;

  -- allow-list: everything except these keys must be unchanged; birth_date only while it is still NULL
  IF (to_jsonb(NEW) - v_allowed) IS DISTINCT FROM (to_jsonb(OLD) - v_allowed)
     OR (NEW.birth_date IS DISTINCT FROM OLD.birth_date AND OLD.birth_date IS NOT NULL) THEN
    RAISE EXCEPTION 'protected profile fields can only be changed by an admin' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $function$;

-- ROLLBACK: apply supabase/guard_profile_protected_columns_v1_live.sql (R0).
