-- PENDING (not applied). Milestone A test data, NOT a migration (do not save to supabase/migrations/).
-- Two past-dated demo events for the open browser-verification rows (handoff §0): hours flow submit ->
-- approve/reject/void, the Manager rate window, "final closure blocked by pending hours", staff-as-worker.
-- Owner runs it in the SQL Editor (runs as postgres, so the app guards are bypassed on purpose for the seed only).
-- Idempotent: does nothing if the seed client already exists. Remove with 20261113_seed_a_past_events_rollback.sql.
-- Demo users only (handoff §2). No Form 101 / bank data.
--
--   Event 1  2026-11-05, closed, recruiter rec1. Manager may still set wage rates (deadline 2026-12-10).
--            role "מלצר/ית" 18:00-23:00, base 50, travel 20:
--              emp1 approved wage 50 | emp2 approved wage NULL (rate window) | mgr approved as worker wage 55
--   Event 2  2026-10-20, closed, recruiter rec1. Manager rate window CLOSED (deadline 2026-11-10); Admin only.
--            role "מארח/ת" 17:00-22:00, base 45:
--              emp1 approved wage NULL | emp2 approved wage 45
DO $seed$
DECLARE
  ADM uuid := '27e864c1-a76e-4086-9ac3-42e8f0605103'; MGR uuid := 'c57bd119-7f4e-4b13-b4b5-352c6656560d';
  REC1 uuid := 'c73c98f5-8c85-4301-9638-1561d773fda5';
  EMP1 uuid := '52d36bda-8352-4031-b72b-2acbc7d11779'; EMP2 uuid := '3d693927-0ce8-4cb6-8c9a-c11d40b2f2a5';
  C uuid; E1 uuid; E2 uuid; R1 uuid; R2 uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.clients WHERE name = 'SEED-A לקוח בדיקה') THEN
    RAISE NOTICE 'seed already present, nothing done'; RETURN;
  END IF;

  INSERT INTO public.clients (name, status, created_by) VALUES ('SEED-A לקוח בדיקה', 'active', ADM) RETURNING id INTO C;

  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id, travel_budget_per_worker)
  VALUES (C, '2026-11-05', '18:00', 'SEED-A אירוע עבר 1', 'closed', REC1, 20) RETURNING id INTO E1;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate)
  VALUES (E1, 'מלצר/ית', 4, '18:00', '23:00', 50) RETURNING id INTO R1;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate, created_by) VALUES
    (E1, R1, EMP1, 'approved', 50, ADM),
    (E1, R1, EMP2, 'approved', NULL, ADM),
    (E1, R1, MGR, 'approved', 55, ADM);

  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id, travel_budget_per_worker)
  VALUES (C, '2026-10-20', '17:00', 'SEED-A אירוע עבר 2', 'closed', REC1, 0) RETURNING id INTO E2;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate)
  VALUES (E2, 'מארח/ת', 3, '17:00', '22:00', 45) RETURNING id INTO R2;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate, created_by) VALUES
    (E2, R2, EMP1, 'approved', NULL, ADM),
    (E2, R2, EMP2, 'approved', 45, ADM);

  RAISE NOTICE 'seed created: client %, events % and %', C, E1, E2;
END $seed$;

-- Verify (read-only):
--   SELECT e.location, e.event_date, e.status, count(r.*) FROM public.events e
--     JOIN public.event_registrations r ON r.event_id = e.id WHERE e.location LIKE 'SEED-A%' GROUP BY 1,2,3;  -- 3 and 2 rows
