-- p1_m1: events.status domain. Drops the unused 'in_progress'; 'paused' and 'completed' are FROZEN (see p1_m3); status becomes NOT NULL.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.events WHERE status IS NULL
      OR status NOT IN ('pending_rates','open','paused','completed','cancelled','closed')) THEN
    RAISE EXCEPTION 'events.status has NULL/out-of-domain rows';
  END IF;
END $$;
ALTER TABLE public.events DROP CONSTRAINT events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check
  CHECK (status IN ('pending_rates','open','paused','completed','cancelled','closed'));
ALTER TABLE public.events ALTER COLUMN status SET NOT NULL;

-- ROLLBACK:
--   ALTER TABLE public.events ALTER COLUMN status DROP NOT NULL;
--   ALTER TABLE public.events DROP CONSTRAINT events_status_check;
--   ALTER TABLE public.events ADD CONSTRAINT events_status_check
--     CHECK (status = ANY (ARRAY['pending_rates'::text,'open'::text,'paused'::text,'in_progress'::text,'completed'::text,'cancelled'::text,'closed'::text]));
