-- Removes the sales-demo seed (20261115_demo_seed.sql) and everything done on it in the app (hours, credits,
-- notifications, history). Owner runs it in the SQL Editor. Touches only: the 4 demo clients (by exact name),
-- their events, and the 16 roster employees (email *@everyjob-demo.invalid). The existing demo sign-in users stay;
-- only their rows on the demo events are removed.
DO $rb$
DECLARE cl uuid[]; ev uuid[]; regs uuid[]; emps uuid[];
BEGIN
  SELECT array_agg(id) INTO cl FROM public.clients
   WHERE name IN ('אולמי הגן הקסום','קייטרינג טעמים','מרכז הכנסים ים התיכון','פסטיבל אור בפארק');
  SELECT array_agg(id) INTO emps FROM auth.users WHERE email LIKE '%@everyjob-demo.invalid';
  IF cl IS NULL AND emps IS NULL THEN RAISE NOTICE 'no demo seed, nothing done'; RETURN; END IF;
  SELECT array_agg(id) INTO ev FROM public.events WHERE client_id = ANY(cl);
  SELECT array_agg(id) INTO regs FROM public.event_registrations WHERE event_id = ANY(ev) OR user_id = ANY(emps);

  DELETE FROM public.recruiter_bonuses WHERE redeemed_event_id = ANY(ev)
     OR source_registration_id = ANY(regs) OR applied_to_registration_id = ANY(regs);
  DELETE FROM public.notifications WHERE user_id = ANY(emps) OR (payload ->> 'event_id')::uuid = ANY(ev);
  DELETE FROM public.registration_status_history WHERE event_id = ANY(ev) OR registration_id = ANY(regs);
  DELETE FROM public.event_roster_override_audit WHERE event_id = ANY(ev);
  DELETE FROM public.shift_hour_submissions WHERE event_id = ANY(ev) OR registration_id = ANY(regs);
  DELETE FROM public.employee_ratings WHERE event_id = ANY(ev) OR employee_id = ANY(emps);
  DELETE FROM public.event_registrations WHERE id = ANY(regs);
  DELETE FROM public.clients WHERE id = ANY(cl);  -- cascades: events -> roles, closures
  DELETE FROM public.profiles WHERE id = ANY(emps);
  DELETE FROM auth.users WHERE id = ANY(emps);
  -- the seed set areas on the demo sign-in employees EMP1 / EMP2 (empty before D1)
  UPDATE public.profiles SET city = NULL, region = NULL, role_tags = '{}'
   WHERE id IN ('52d36bda-8352-4031-b72b-2acbc7d11779', '3d693927-0ce8-4cb6-8c9a-c11d40b2f2a5');
  -- ratings of the demo sign-in users were recalculated by trg_recalc_rating on the deletes above
  RAISE NOTICE 'demo seed removed';
END $rb$;
