-- APPLIED 2026-11-15 via Supabase MCP apply_migration (owner decision in chat); history version 20261115083457.
-- C6b (owner decision 2026-11-15): Form 101 / bank-details MISSING COUNTS are shown to Admin without 2FA.
-- Only aggregate counts leave the function - no names, ids or document fields; the documents themselves stay
-- blocked until 2FA (AGENTS 8.2 exception recorded there). documents_locked is kept (always false) so the app
-- contract does not change. No DROP. Rollback: the C5 definition (aal2 gate).
CREATE OR REPLACE FUNCTION public.get_compliance_counts()
RETURNS TABLE(active_employees bigint, duplicate_tz_groups bigint, duplicate_tz_profiles bigint,
              missing_form_101 bigint, missing_bank_details bigint, documents_locked boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_unlocked boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  v_unlocked := true;  -- C6b / owner 2026-11-15: counts are shown without 2FA (no names or fields leave the DB)

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
