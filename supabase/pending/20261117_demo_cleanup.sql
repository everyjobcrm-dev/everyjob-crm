-- APPLIED 2026-11-17 by Claude via Supabase MCP (owner-approved). Removed clients "SEED-A לקוח בדיקה" and
-- "חוות רונית", 6 events, 11 registrations, 2 hour reports. Left: 4 clients, 7 events. Not a migration.
-- Goal (roadmap Stage 1): the demo shows only the sales-demo seed (20261115_demo_seed.sql), no test data.
-- Owner runs it in the SQL Editor, in order: STEP 1 (read-only preview), read the output, then STEP 2.
-- Keeps: the 4 demo clients and everything on them, all users (sign-in demo users and the 16 roster employees).
-- Removes: every other client and event (Milestone A "SEED-A", clients/events created during browser tests),
--          and the hours, credits, history, ratings and notifications tied to them.
-- No Form 101 / bank data is read or written (AGENTS §8.2).

-- ===================== STEP 1: preview (read-only) =====================
-- Clients and events that STEP 2 will delete. Expect "SEED-A לקוח בדיקה" and any test clients; never the 4 demo ones.
SELECT 'client' AS kind, c.name AS what, c.created_at::date AS created, NULL::date AS event_date
  FROM public.clients c
 WHERE c.name NOT IN ('אולמי הגן הקסום','קייטרינג טעמים','מרכז הכנסים ים התיכון','פסטיבל אור בפארק')
UNION ALL
SELECT 'event', coalesce(e.location, '(no location)'), e.created_at::date, e.event_date
  FROM public.events e LEFT JOIN public.clients c ON c.id = e.client_id
 WHERE c.id IS NULL
    OR c.name NOT IN ('אולמי הגן הקסום','קייטרינג טעמים','מרכז הכנסים ים התיכון','פסטיבל אור בפארק')
 ORDER BY 1, 3;

-- Users that are neither demo sign-in users nor roster employees (information only, STEP 2 does not touch users).
SELECT p.first_name, p.last_name, p.role, p.created_at::date
  FROM public.profiles p
 WHERE p.deleted_at IS NULL
   AND coalesce(p.email, '') NOT LIKE '%@everyjob-demo.invalid'
   AND coalesce(p.email, '') NOT LIKE 'samohayosef%@gmail.com'
 ORDER BY p.created_at;

-- ===================== STEP 2: delete (run only after reading STEP 1) =====================
DO $cleanup$
DECLARE cl uuid[]; ev uuid[]; regs uuid[];
BEGIN
  SELECT array_agg(id) INTO cl FROM public.clients
   WHERE name NOT IN ('אולמי הגן הקסום','קייטרינג טעמים','מרכז הכנסים ים התיכון','פסטיבל אור בפארק');
  SELECT array_agg(e.id) INTO ev FROM public.events e LEFT JOIN public.clients c ON c.id = e.client_id
   WHERE c.id IS NULL OR c.id = ANY(cl);
  IF cl IS NULL AND ev IS NULL THEN RAISE NOTICE 'nothing to clean'; RETURN; END IF;
  SELECT array_agg(id) INTO regs FROM public.event_registrations WHERE event_id = ANY(ev);

  DELETE FROM public.recruiter_bonuses WHERE redeemed_event_id = ANY(ev)
     OR source_registration_id = ANY(regs) OR applied_to_registration_id = ANY(regs);
  DELETE FROM public.notifications WHERE (payload ->> 'event_id')::uuid = ANY(ev);
  DELETE FROM public.registration_status_history WHERE event_id = ANY(ev) OR registration_id = ANY(regs);
  DELETE FROM public.event_roster_override_audit WHERE event_id = ANY(ev);
  DELETE FROM public.shift_hour_submissions WHERE event_id = ANY(ev) OR registration_id = ANY(regs);
  DELETE FROM public.employee_ratings WHERE event_id = ANY(ev);
  DELETE FROM public.event_registrations WHERE id = ANY(regs);
  DELETE FROM public.events WHERE id = ANY(ev);       -- cascades: roles, closures
  DELETE FROM public.clients WHERE id = ANY(cl);
  -- ratings of affected users are recalculated by trg_recalc_rating on the deletes above
  RAISE NOTICE 'removed % clients, % events', coalesce(array_length(cl, 1), 0), coalesce(array_length(ev, 1), 0);
END $cleanup$;

-- Verify (read-only): expect exactly the 4 demo clients and 7 events.
--   SELECT count(*) FROM public.clients;  -- 4
--   SELECT count(*) FROM public.events;   -- 7
