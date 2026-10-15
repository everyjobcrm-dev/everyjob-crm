-- APPLIED 2026-10-13 via apply_migration (approved: P6-H0..H5 with E1/E2, Q3-Q5).
-- p6_h4: rating triggers run as the table owner (SECURITY DEFINER, fixed search_path). As INVOKER they update
-- profiles.average_rating as the calling manager, which guard_profile_protected_columns refuses (protected field),
-- so every rating insert by a manager fails. update_employee_average_rating also used NEW only (no-op on DELETE).
-- Live definitions being replaced (md5-verified 2026-10-13, unchanged since capture):
--   supabase/live_snapshot/fn_recalc_employee_rating.sql          (863f1aa2...)
--   supabase/live_snapshot/fn_update_employee_average_rating.sql  (a466d68a...)
CREATE OR REPLACE FUNCTION public.recalc_employee_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_employee uuid := COALESCE(NEW.employee_id, OLD.employee_id);
BEGIN
  UPDATE public.profiles p
     SET average_rating = COALESCE(sub.avg_rating, 0), total_ratings = sub.cnt
    FROM (SELECT AVG(r.rating)::numeric(3,2) AS avg_rating, COUNT(*)::int AS cnt
            FROM public.employee_ratings r WHERE r.employee_id = v_employee) sub
   WHERE p.id = v_employee;
  RETURN NULL;
END;
$function$;

-- Same computation as recalc_employee_rating, kept so the duplicate trigger stays harmless until it is removed
-- (open question 5). DELETE-safe now.
CREATE OR REPLACE FUNCTION public.update_employee_average_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_employee uuid := COALESCE(NEW.employee_id, OLD.employee_id);
BEGIN
  UPDATE public.profiles p
     SET average_rating = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 2) FROM public.employee_ratings r WHERE r.employee_id = v_employee), 0),
         total_ratings = (SELECT COUNT(*) FROM public.employee_ratings r WHERE r.employee_id = v_employee)
   WHERE p.id = v_employee;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
REVOKE ALL ON FUNCTION public.recalc_employee_rating(), public.update_employee_average_rating() FROM PUBLIC, anon, authenticated;

-- OPTIONAL, by hand after the above (contains DROP; open question 5):
--   DROP TRIGGER IF EXISTS trigger_update_rating ON public.employee_ratings;

-- ROLLBACK: apply the bodies of the two live_snapshot files listed above (lines 3..end).
