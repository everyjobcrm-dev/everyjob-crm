-- APPLIED 2026-11-17 by the agent via MCP execute_sql (owner approved in chat; verify: 1 trigger, 0 constraints).
-- F1a (owner request 2026-11-17). Contains DROP. Runs BEFORE f1_fixes.sql.
-- 1) item 7: two triggers recompute profiles.average_rating on every employee_ratings change.
--    Keep trg_recalc_rating (recalc_employee_rating); drop the duplicate.
-- 2) item 4: an Admin may approve hours they worked themselves (owner decision 2026-11-17, replaces the
--    AGENTS §6 "never own hours" rule for APPROVAL only). The table CHECK blocks it, so it goes;
--    reject_shift_hours still refuses self_review in the function, and no recruitment credit is ever
--    created for a recruiter's own hours (approve_shift_hours).
-- Rollback:
--   CREATE TRIGGER trigger_update_rating AFTER INSERT OR DELETE OR UPDATE ON public.employee_ratings
--     FOR EACH ROW EXECUTE FUNCTION public.update_employee_average_rating();
--   ALTER TABLE public.shift_hour_submissions ADD CONSTRAINT shift_hour_submissions_no_self_review
--     CHECK (reviewed_by IS NULL OR reviewed_by IS DISTINCT FROM employee_id);

BEGIN;
DROP TRIGGER IF EXISTS trigger_update_rating ON public.employee_ratings;
ALTER TABLE public.shift_hour_submissions DROP CONSTRAINT IF EXISTS shift_hour_submissions_no_self_review;
COMMIT;

-- Verify (read-only): expect 1 row (trg_recalc_rating) and 0 rows.
SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.employee_ratings'::regclass AND NOT tgisinternal;
SELECT conname FROM pg_constraint WHERE conname = 'shift_hour_submissions_no_self_review';
