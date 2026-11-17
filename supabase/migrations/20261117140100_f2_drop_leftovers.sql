-- APPLIED 2026-11-17 by the agent via MCP execute_sql (owner approved in chat). Preview: client_role_rates 0 rows,
-- events.lifecycle_status 'draft' on all 7 rows, no function / view / FK / app references. Verify: both gone.
-- event_closures is NOT dropped here: the deployed app still reads it until 4dd581e is live
-- (supabase/pending/20261117140200_f2c_drop_event_closures.sql).
BEGIN;
DROP TABLE IF EXISTS public.client_role_rates;
ALTER TABLE public.events DROP COLUMN IF EXISTS lifecycle_status;
COMMIT;
