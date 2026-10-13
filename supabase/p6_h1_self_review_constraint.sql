-- PROPOSED - not applied. Needs an explicit approval line (AGENTS.md 8.1).
-- p6_h1: nobody reviews hours they worked and nobody submits own hours (hard rule, AGENTS.md 6).
-- Q1 answered "worker only": no two-person rule (there is exactly one admin, so it would deadlock admin-entered hours).
-- Live table has 0 rows, so the constraints validate immediately.
ALTER TABLE public.shift_hour_submissions
  ADD CONSTRAINT shift_hour_submissions_no_self_review
    CHECK (reviewed_by IS NULL OR reviewed_by IS DISTINCT FROM employee_id),
  ADD CONSTRAINT shift_hour_submissions_no_self_submit
    CHECK (submitted_by IS DISTINCT FROM employee_id);

-- ROLLBACK (by hand, SQL Editor - contains DROP):
--   ALTER TABLE public.shift_hour_submissions DROP CONSTRAINT IF EXISTS shift_hour_submissions_no_self_review,
--     DROP CONSTRAINT IF EXISTS shift_hour_submissions_no_self_submit;
