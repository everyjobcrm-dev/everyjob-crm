-- p1_m1b: events.recruiter_id = the owning recruiter (recruiter scope for amendment A). NULL for admin/manager-created events.
-- NOTE: supabase/recruiter_compensation_redesign.sql (never applied live) also does ADD COLUMN recruiter_id and is now superseded.
ALTER TABLE public.events ADD COLUMN recruiter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX events_recruiter_id_idx ON public.events (recruiter_id) WHERE recruiter_id IS NOT NULL;

-- ROLLBACK:
--   DROP INDEX public.events_recruiter_id_idx;
--   ALTER TABLE public.events DROP COLUMN recruiter_id;
