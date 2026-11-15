-- APPLIED 2026-11-15 via Supabase MCP apply_migration (owner instruction in chat); history version 20261114233856. Test results in the PR.
-- C1: the employee's estimated pay (v_my_monthly_hours) uses the same legal-overtime rule as payroll (B2,
-- owner decision Q1): per shift, first 8h x1, next 2h x1.25, rest x1.5, times the registration wage_rate.
-- Before: hours x wage_rate, so the home screen disagreed with /admin/payroll for any shift over 8h.
-- Same columns, names and types; security_invoker kept; grants unchanged. No DROP, no data change.
-- Rollback: supabase/pending/20261115100000_c1_my_monthly_hours_overtime_rollback.sql
-- Test: supabase/tests/c1_my_monthly_hours_tests.sql
CREATE OR REPLACE VIEW public.v_my_monthly_hours WITH (security_invoker = true) AS
SELECT s.employee_id,
       date_trunc('month', e.event_date::timestamp)::date AS month,
       sum(s.reported_hours) AS approved_hours,
       sum(round(r.wage_rate * (least(s.reported_hours, 8)
                                + 1.25 * least(greatest(s.reported_hours - 8, 0), 2)
                                + 1.5 * greatest(s.reported_hours - 10, 0)), 2)) AS estimated_pay,
       count(*) FILTER (WHERE r.wage_rate IS NULL) AS shifts_without_rate
  FROM public.shift_hour_submissions s
  JOIN public.event_registrations r ON r.id = s.registration_id
  JOIN public.events e ON e.id = s.event_id
 WHERE s.status = 'approved' AND s.voided_at IS NULL AND e.status <> 'cancelled'
 GROUP BY s.employee_id, date_trunc('month', e.event_date::timestamp);
