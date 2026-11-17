-- F2b (owner request 2026-11-17). Contains DROP (agent may run it via execute_sql after approval), ONLY AFTER the app
-- version without the event_closures read is deployed (fetchEvents selected it; dropping first breaks the
-- admin events list).
-- Live check 2026-11-17: client_role_rates 0 rows, event_closures 0 rows, no function / view / FK references
-- either; events.lifecycle_status = 'draft' on every row and read by nothing (status is events.status).
-- The old INSERT/UPDATE policy on event_registrations is already gone live (only er_employee_select_own
-- exists), so nothing to drop there.
-- Rollback: not data-bearing (empty / constant); recreate from supabase/schema.sql if ever needed.

-- STEP 1 (read-only preview): expect 0, 0 and one row 'draft'.
SELECT (SELECT count(*) FROM public.client_role_rates) AS crr, (SELECT count(*) FROM public.event_closures) AS closures;
SELECT lifecycle_status, count(*) FROM public.events GROUP BY 1;

-- STEP 2
BEGIN;
DROP TABLE IF EXISTS public.client_role_rates;
DROP TABLE IF EXISTS public.event_closures;
ALTER TABLE public.events DROP COLUMN IF EXISTS lifecycle_status;
COMMIT;
