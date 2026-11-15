-- Rollback for C5 (contains DROP: run by hand in the SQL Editor). New function, nothing to restore.
DROP FUNCTION IF EXISTS public.get_compliance_counts();
