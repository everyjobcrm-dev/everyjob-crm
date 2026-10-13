-- p1_m3: event status state machine, enforced in the DB for direct client DML (current_user in anon/authenticated).
--  * completed and paused are FROZEN: no client transition into or out of them (only service_role / direct DB sessions).
--  * admin/manager (any event): open<->closed, open/closed/pending_rates->cancelled, pending_rates->open,
--    cancelled->open|closed|pending_rates. recruiter (own events only): open<->closed, ->cancelled, pending_rates->open
--    (the last pair so a rate editor can flip the event right after filling the last rate; trg_check_event_rates_complete only blocks, never flips).
--  * ->open/closed from pending_rates or cancelled requires every role to have base_rate.
--  * every ->cancelled transition records the previous status in events.cancelled_from_status (the app restores to it by default; null/completed/paused -> 'closed').
--  * cancelling is refused while an approved hour report exists.
CREATE OR REPLACE FUNCTION public.app_event_has_approved_hours(p_event_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shift_hour_submissions s
                 WHERE s.event_id = p_event_id AND s.status = 'approved' AND s.voided_at IS NULL) $$;
REVOKE ALL ON FUNCTION public.app_event_has_approved_hours(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_event_has_approved_hours(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_event_status_transition() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
      NEW.cancelled_from_status := OLD.status;
    END IF;
  END IF;

  IF current_user NOT IN ('anon','authenticated') THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending_rates','open') THEN
      RAISE EXCEPTION 'invalid_initial_status' USING ERRCODE = 'P0001'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF OLD.status IN ('completed','paused') OR NEW.status IN ('completed','paused') THEN
    RAISE EXCEPTION 'status_frozen' USING ERRCODE = '42501'; END IF;

  v_role := COALESCE(public.app_current_role()::text, '');
  IF NOT public.app_can_manage_event(NEW.id) THEN
    RAISE EXCEPTION 'forbidden_transition' USING ERRCODE = '42501'; END IF;

  IF v_role = 'recruiter' THEN
    IF (OLD.status, NEW.status) NOT IN (('open','closed'),('closed','open'),
         ('open','cancelled'),('closed','cancelled'),('pending_rates','cancelled'),
         ('pending_rates','open')) THEN
      RAISE EXCEPTION 'forbidden_transition' USING ERRCODE = '42501'; END IF;
  ELSIF v_role IN ('admin','manager') THEN
    IF (OLD.status, NEW.status) NOT IN (('open','closed'),('closed','open'),
         ('open','cancelled'),('closed','cancelled'),('pending_rates','cancelled'),('pending_rates','open'),
         ('cancelled','open'),('cancelled','closed'),('cancelled','pending_rates')) THEN
      RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001'; END IF;
  ELSE
    RAISE EXCEPTION 'forbidden_transition' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IN ('open','closed') AND OLD.status IN ('pending_rates','cancelled')
     AND EXISTS (SELECT 1 FROM public.event_roles r WHERE r.event_id = NEW.id AND r.base_rate IS NULL) THEN
    RAISE EXCEPTION 'missing_rates' USING ERRCODE = 'P0001'; END IF;

  IF NEW.status = 'cancelled' AND public.app_event_has_approved_hours(NEW.id) THEN
    RAISE EXCEPTION 'cannot_cancel_with_approved_hours' USING ERRCODE = 'P0001'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_enforce_event_status_transition
  BEFORE INSERT OR UPDATE OF status ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_status_transition();

-- ROLLBACK:
--   DROP TRIGGER trg_enforce_event_status_transition ON public.events;
--   DROP FUNCTION public.enforce_event_status_transition();
--   DROP FUNCTION public.app_event_has_approved_hours(uuid);
