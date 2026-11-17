-- Demo data, NOT a migration. Re-runnable: run it the day before every demo.
-- Moves all 7 sales-demo events (the 4 demo clients) by the same number of days so the bar-mitzvah event
-- (E4, the one with the full bartender role and the waitlist) is 7 days from today. Spacing between events is kept,
-- so the 3 past events stay past and the 4 future ones stay future. Hour reports move with their events.
-- The event-change notifications that the move fires (trg_notify_event_change) are deleted in the same transaction,
-- so workers do not see "date changed" notices during the demo.

-- STEP 1 (read-only): current dates and the shift that STEP 2 will apply.
SELECT e.event_date, e.status, e.location,
       (current_date + 7) - (SELECT event_date FROM public.events x JOIN public.clients c ON c.id = x.client_id
                               WHERE c.name = 'אולמי הגן הקסום' AND x.notes = 'בר מצווה') AS shift_days
  FROM public.events e JOIN public.clients c ON c.id = e.client_id
 WHERE c.name IN ('אולמי הגן הקסום','קייטרינג טעמים','מרכז הכנסים ים התיכון','פסטיבל אור בפארק')
 ORDER BY e.event_date;

-- STEP 2
DO $shift$
DECLARE d int; ev uuid[];
BEGIN
  SELECT (current_date + 7) - x.event_date INTO d
    FROM public.events x JOIN public.clients c ON c.id = x.client_id
   WHERE c.name = 'אולמי הגן הקסום' AND x.notes = 'בר מצווה';
  IF d IS NULL THEN RAISE EXCEPTION 'anchor event (בר מצווה) not found'; END IF;
  IF d = 0 THEN RAISE NOTICE 'dates already current'; RETURN; END IF;

  SELECT array_agg(e.id) INTO ev FROM public.events e JOIN public.clients c ON c.id = e.client_id
   WHERE c.name IN ('אולמי הגן הקסום','קייטרינג טעמים','מרכז הכנסים ים התיכון','פסטיבל אור בפארק');

  UPDATE public.events SET event_date = event_date + d WHERE id = ANY(ev);
  UPDATE public.shift_hour_submissions
     SET reported_start = reported_start + make_interval(days => d),
         reported_end   = reported_end   + make_interval(days => d),
         submitted_at   = submitted_at   + make_interval(days => d),
         reviewed_at    = reviewed_at    + make_interval(days => d)
   WHERE event_id = ANY(ev);
  DELETE FROM public.notifications
   WHERE created_at >= now() AND (payload ->> 'event_id')::uuid = ANY(ev);
  RAISE NOTICE 'moved % events by % days', array_length(ev, 1), d;
END $shift$;

-- Verify (read-only): STEP 1 again; shift_days = 0, the bar mitzvah is today + 7.
