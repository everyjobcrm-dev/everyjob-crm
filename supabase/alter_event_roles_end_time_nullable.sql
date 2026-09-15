-- Allow the actual end time to be recorded after the event is completed.
ALTER TABLE public.event_roles
  ALTER COLUMN end_time DROP NOT NULL;
