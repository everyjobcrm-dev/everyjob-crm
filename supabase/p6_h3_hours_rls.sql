-- APPLIED 2026-10-13 via apply_migration (approved: P6-H0..H5 with E1/E2, Q3-Q5). Apply after p6_h2 (the RPCs become the only write path).
-- p6_h3 (L13): RLS on the three hours tables. Live: RLS enabled, NO policies (every client read and write denied), while
-- anon and authenticated still hold ALL table grants. This narrows grants and adds SELECT-only policies; nothing is
-- broadened for writes - INSERT/UPDATE/DELETE stay RPC-only (SECURITY DEFINER, p6_h2).
-- Live policies being replaced: none (pg_policies empty for these tables on 2026-10-13).

REVOKE ALL ON public.shift_hour_submissions, public.employee_ratings, public.recruiter_bonuses FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.shift_hour_submissions, public.employee_ratings, public.recruiter_bonuses FROM authenticated;

-- shift_hour_submissions: Admin/Manager read all; a worker reads own rows (estimated pay / "My shifts"); Recruiter: none.
CREATE POLICY shs_select_admin_manager ON public.shift_hour_submissions FOR SELECT TO authenticated
  USING (public.app_current_role() IN ('admin', 'manager'));
CREATE POLICY shs_select_own ON public.shift_hour_submissions FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

-- employee_ratings: Admin/Manager only (employees see profiles.average_rating, not individual ratings - open question 4).
CREATE POLICY ratings_select_admin_manager ON public.employee_ratings FOR SELECT TO authenticated
  USING (public.app_current_role() IN ('admin', 'manager'));

-- recruiter_bonuses: Admin/Manager read all (managers redeem FIFO); a recruiter reads own credits.
CREATE POLICY bonuses_select_admin_manager ON public.recruiter_bonuses FOR SELECT TO authenticated
  USING (public.app_current_role() IN ('admin', 'manager'));
CREATE POLICY bonuses_select_own ON public.recruiter_bonuses FOR SELECT TO authenticated
  USING (recruiter_id = auth.uid());

-- ROLLBACK (by hand, SQL Editor - contains DROP):
--   DROP POLICY IF EXISTS shs_select_admin_manager ON public.shift_hour_submissions;
--   DROP POLICY IF EXISTS shs_select_own ON public.shift_hour_submissions;
--   DROP POLICY IF EXISTS ratings_select_admin_manager ON public.employee_ratings;
--   DROP POLICY IF EXISTS bonuses_select_admin_manager ON public.recruiter_bonuses;
--   DROP POLICY IF EXISTS bonuses_select_own ON public.recruiter_bonuses;
--   GRANT ALL ON public.shift_hour_submissions, public.employee_ratings, public.recruiter_bonuses TO anon, authenticated;
-- Dependents: v_shift_submissions_dashboard (owner rights, unaffected), app_event_has_approved_hours (DEFINER, unaffected).
