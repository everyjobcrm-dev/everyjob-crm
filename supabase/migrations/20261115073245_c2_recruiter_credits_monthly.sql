-- APPLIED 2026-11-15 via Supabase MCP apply_migration (owner instruction in chat); history version 20261115073245. Test results in the PR.
-- C2: recruitment credits per recruiter and month, for the Admin overview (/admin/recruiters) - AGENTS 5.1:
-- derived totals live in a view. Month = the month the credit was created (hours approved), Asia/Jerusalem.
-- Voided credits are excluded. 'applied' = redeemed (redeem_recruiter_credits).
-- security_invoker: callers see only what recruiter_bonuses RLS allows (p6_h3: Admin/Manager all, recruiter own).
-- New view, nothing replaced, no data change, no DROP.
-- Rollback: supabase/pending/20261115110000_c2_recruiter_credits_monthly_rollback.sql
-- Test: supabase/tests/c2_recruiter_credits_monthly_tests.sql
CREATE OR REPLACE VIEW public.v_recruiter_credits_monthly WITH (security_invoker = true) AS
SELECT b.recruiter_id,
       date_trunc('month', b.created_at AT TIME ZONE 'Asia/Jerusalem')::date AS month,
       count(*) AS earned_count,
       sum(b.bonus_amount) AS earned_amount,
       count(*) FILTER (WHERE b.status = 'pending') AS pending_count,
       COALESCE(sum(b.bonus_amount) FILTER (WHERE b.status = 'pending'), 0) AS pending_amount,
       count(*) FILTER (WHERE b.status = 'applied') AS redeemed_count,
       COALESCE(sum(b.bonus_amount) FILTER (WHERE b.status = 'applied'), 0) AS redeemed_amount
  FROM public.recruiter_bonuses b
 WHERE b.status <> 'voided'
 GROUP BY b.recruiter_id, date_trunc('month', b.created_at AT TIME ZONE 'Asia/Jerusalem');

REVOKE ALL ON public.v_recruiter_credits_monthly FROM anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.v_recruiter_credits_monthly FROM authenticated;
GRANT SELECT ON public.v_recruiter_credits_monthly TO authenticated;
