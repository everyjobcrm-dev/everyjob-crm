-- APPLIED 2026-11-15 via Supabase MCP apply_migration (owner instruction in chat); history version 20261115073535. Test results in the PR.
-- C5: compliance counts for the Admin dashboard ("בקרת מסמכים", spec 7). COUNTS ONLY - no names, ids or document
-- fields are ever returned.
--   active_employees        employees not soft-deleted
--   duplicate_tz_groups     national IDs shared by more than one profile after normalising (trim + left-pad to 9
--   duplicate_tz_profiles   digits), which the plain unique index on profiles.tz does not catch ("012345678" vs "12345678")
--   missing_form_101        employees with no submitted/verified form_101 document   } read employee_documents, so
--   missing_bank_details    employees with no submitted/verified bank_details document } AGENTS 8.2: Admin + aal2 only.
--   documents_locked        true when the caller is not aal2 -> the two counts above are NULL (fails closed until 2FA,
--                           same rule as list_employees.form_101_status)
-- Admin only (not_authorized otherwise). SECURITY DEFINER, search_path pinned, no anon/PUBLIC EXECUTE. No DROP.
-- Rollback: supabase/pending/20261115130000_c5_compliance_counts_rollback.sql
-- Test: supabase/tests/c5_compliance_counts_tests.sql
CREATE OR REPLACE FUNCTION public.get_compliance_counts()
RETURNS TABLE(active_employees bigint, duplicate_tz_groups bigint, duplicate_tz_profiles bigint,
              missing_form_101 bigint, missing_bank_details bigint, documents_locked boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_unlocked boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  v_unlocked := COALESCE(auth.jwt()->>'aal', '') = 'aal2';

  RETURN QUERY
  WITH emp AS (
    SELECT p.id FROM public.profiles p WHERE p.role = 'employee' AND p.deleted_at IS NULL
  ), dup AS (
    SELECT count(*) AS n FROM public.profiles p
     WHERE nullif(btrim(p.tz), '') IS NOT NULL
     GROUP BY lpad(btrim(p.tz), 9, '0') HAVING count(*) > 1
  )
  SELECT (SELECT count(*) FROM emp),
         (SELECT count(*) FROM dup),
         (SELECT COALESCE(sum(n), 0)::bigint FROM dup),
         CASE WHEN v_unlocked THEN (SELECT count(*) FROM emp WHERE NOT EXISTS (
           SELECT 1 FROM public.employee_documents d WHERE d.employee_id = emp.id AND d.doc_type = 'form_101'
              AND d.status IN ('submitted', 'verified'))) END,
         CASE WHEN v_unlocked THEN (SELECT count(*) FROM emp WHERE NOT EXISTS (
           SELECT 1 FROM public.employee_documents d WHERE d.employee_id = emp.id AND d.doc_type = 'bank_details'
              AND d.status IN ('submitted', 'verified'))) END,
         NOT v_unlocked;
END $$;

REVOKE ALL ON FUNCTION public.get_compliance_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_compliance_counts() TO authenticated;
