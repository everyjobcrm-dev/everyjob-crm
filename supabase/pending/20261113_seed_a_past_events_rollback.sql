-- Removes the Milestone A seed (20261113_seed_a_past_events.sql) and everything the browser tests created on it.
-- Owner runs it in the SQL Editor after verification. Touches only rows tied to the 'SEED-A לקוח בדיקה' client.
DO $rb$
DECLARE C uuid; ev uuid[]; regs uuid[];
BEGIN
  SELECT id INTO C FROM public.clients WHERE name = 'SEED-A לקוח בדיקה';
  IF C IS NULL THEN RAISE NOTICE 'no seed, nothing done'; RETURN; END IF;
  SELECT array_agg(id) INTO ev FROM public.events WHERE client_id = C;
  SELECT array_agg(id) INTO regs FROM public.event_registrations WHERE event_id = ANY(ev);
  DELETE FROM public.recruiter_bonuses WHERE redeemed_event_id = ANY(ev)
     OR source_registration_id = ANY(regs) OR applied_to_registration_id = ANY(regs);
  DELETE FROM public.registration_status_history WHERE event_id = ANY(ev) OR registration_id = ANY(regs);
  DELETE FROM public.event_roster_override_audit WHERE event_id = ANY(ev);
  DELETE FROM public.shift_hour_submissions WHERE event_id = ANY(ev);
  DELETE FROM public.clients WHERE id = C;  -- cascades: events -> roles, registrations, closures
  RAISE NOTICE 'seed removed';
END $rb$;
