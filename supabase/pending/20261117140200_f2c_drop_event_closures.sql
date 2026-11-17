-- F2c (owner approved 2026-11-17). Contains DROP. Run ONLY after commit 4dd581e (no event_closures read in
-- fetchEvents) is deployed to production; dropping earlier breaks the admin events list.
-- Live check 2026-11-17: 0 rows, no function / view / FK references. Rollback: recreate from supabase/schema.sql.

-- STEP 1 (read-only preview): expect 0.
SELECT count(*) FROM public.event_closures;

-- STEP 2
DROP TABLE IF EXISTS public.event_closures;
