-- p3_m0d: anonymous callers lose access to the owner-rights staffing views (they exposed per-event headcounts to anon).
-- REVOKE ALL (not only SELECT): anon also held INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER grants on both views.
-- authenticated keeps SELECT (used by app/admin/actions.ts and app/employee/events/actions.ts).
REVOKE ALL ON public.event_role_fill_counts, public.event_spot_summary FROM anon;

-- ROLLBACK (R0d):
--   GRANT ALL ON public.event_role_fill_counts, public.event_spot_summary TO anon;
-- Dependents: none for anon (no public page reads these views).
