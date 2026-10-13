-- PROPOSED - not applied. Needs an explicit approval line (AGENTS.md 8.1). Apply after p6_h3 (relies on its SELECT policies).
-- p6_h5: derived totals as views (AGENTS.md 5.1). security_invoker, so callers see only what RLS lets them see.

-- A worker's own approved hours and estimated pay per month (Asia/Jerusalem month of the event).
CREATE OR REPLACE VIEW public.v_my_monthly_hours WITH (security_invoker = true) AS
SELECT s.employee_id,
       date_trunc('month', e.event_date::timestamp)::date AS month,
       sum(s.reported_hours) AS approved_hours,
       sum(s.reported_hours * r.wage_rate) AS estimated_pay,
       count(*) FILTER (WHERE r.wage_rate IS NULL) AS shifts_without_rate
  FROM public.shift_hour_submissions s
  JOIN public.event_registrations r ON r.id = s.registration_id
  JOIN public.events e ON e.id = s.event_id
 WHERE s.status = 'approved' AND s.voided_at IS NULL AND e.status <> 'cancelled'
 GROUP BY s.employee_id, date_trunc('month', e.event_date::timestamp);

-- Pending recruitment credits per recruiter (Admin/Manager: all; a recruiter: own - via p6_h3 policies).
CREATE OR REPLACE VIEW public.v_recruiter_pending_credits WITH (security_invoker = true) AS
SELECT b.recruiter_id, count(*) AS pending_count, sum(b.bonus_amount) AS pending_amount, min(b.created_at) AS oldest_pending_at
  FROM public.recruiter_bonuses b
 WHERE b.status = 'pending'
 GROUP BY b.recruiter_id;

REVOKE ALL ON public.v_my_monthly_hours, public.v_recruiter_pending_credits FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.v_my_monthly_hours, public.v_recruiter_pending_credits FROM authenticated;
GRANT SELECT ON public.v_my_monthly_hours, public.v_recruiter_pending_credits TO authenticated;

-- ROLLBACK (by hand, SQL Editor - contains DROP; new views, nothing replaced):
--   DROP VIEW IF EXISTS public.v_my_monthly_hours;
--   DROP VIEW IF EXISTS public.v_recruiter_pending_credits;
