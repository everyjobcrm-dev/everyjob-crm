-- ROLLBACK for 20261114110000_b2_payroll_billing_views.sql. Contains DROP: owner runs it in the SQL Editor.
-- Revert the B3 app pages first (they call these RPCs).
DROP FUNCTION IF EXISTS public.get_billing_month(date);
DROP FUNCTION IF EXISTS public.get_payroll_month(date);
DROP FUNCTION IF EXISTS public.get_payroll_lines(date);
DROP VIEW IF EXISTS public.v_billing_shift_lines;
DROP VIEW IF EXISTS public.v_payroll_shift_lines;
