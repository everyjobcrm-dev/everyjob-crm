-- PROPOSED - not applied. Needs an explicit approval line (AGENTS.md 8.1).
-- p6_h1: nobody reviews hours they worked (hard rule, AGENTS.md 6) and the reviewer differs from the submitter
-- (two-person rule - open question 1 in docs/design-hours-flow.md; drop the second CHECK if the answer is "worker only").
-- Live table has 0 rows, so the constraints validate immediately.
ALTER TABLE public.shift_hour_submissions
  ADD CONSTRAINT shift_hour_submissions_no_self_review
    CHECK (reviewed_by IS NULL OR reviewed_by IS DISTINCT FROM employee_id),
  ADD CONSTRAINT shift_hour_submissions_two_person_review
    CHECK (reviewed_by IS NULL OR reviewed_by IS DISTINCT FROM submitted_by),
  ADD CONSTRAINT shift_hour_submissions_no_self_submit
    CHECK (submitted_by IS DISTINCT FROM employee_id);

-- ROLLBACK (by hand, SQL Editor - contains DROP):
--   ALTER TABLE public.shift_hour_submissions DROP CONSTRAINT IF EXISTS shift_hour_submissions_no_self_review,
--     DROP CONSTRAINT IF EXISTS shift_hour_submissions_two_person_review, DROP CONSTRAINT IF EXISTS shift_hour_submissions_no_self_submit;
