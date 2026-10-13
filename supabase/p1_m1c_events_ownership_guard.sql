-- p1_m1c: who may set events.recruiter_id. Recruiter-created events are forced to the creator; admin/manager-created events
-- default to NULL (they act on all events) and may be assigned explicitly; only admin/manager may change it later.
-- Direct client DML only (current_user in anon/authenticated); anon is not exempt.
CREATE OR REPLACE FUNCTION public.guard_event_recruiter_ownership() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  IF current_user NOT IN ('anon','authenticated') THEN RETURN NEW; END IF;
  v_role := COALESCE(public.app_current_role()::text, '');
  IF TG_OP = 'INSERT' THEN
    IF v_role = 'recruiter' THEN NEW.recruiter_id := auth.uid();        -- forced to the creator
    ELSIF v_role IN ('admin','manager') THEN NULL;                       -- NULL by default, may be assigned
    ELSE RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  ELSIF NEW.recruiter_id IS DISTINCT FROM OLD.recruiter_id AND v_role NOT IN ('admin','manager') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_event_recruiter_ownership
  BEFORE INSERT OR UPDATE OF recruiter_id ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_recruiter_ownership();

-- ROLLBACK:
--   DROP TRIGGER trg_guard_event_recruiter_ownership ON public.events;
--   DROP FUNCTION public.guard_event_recruiter_ownership();
