-- p1_m6: registration write guard for direct client DML (current_user in anon/authenticated). Owner-context routines
-- (SECURITY DEFINER RPCs, waitlist trigger, FK cascades) run as the table owner and bypass it by design.
--  * No direct client INSERT or DELETE, ever (inserts: register_for_event_role / schedule_employee / add_historical_event_attendee).
--  * Own row (any role, staff included): only RAISING a cancellation request.
--  * Staff on others' rows: hierarchy via app_can_manage_event; transitions and a per-role column allow-list.
--      recruiter: status, cancellation_requested_at (clear only)
--      manager  : + wage_rate, rate_set_by (= caller), rate_set_at (= now()), actual_start_time, actual_end_time, hours_reported
--      admin    : + recruiter_id
--  * Cancelled events: nothing; completed events: admin only.
CREATE OR REPLACE FUNCTION public.app_lock_event_status(p_event_id uuid) RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT status FROM public.events WHERE id = p_event_id FOR SHARE $$;
REVOKE ALL ON FUNCTION public.app_lock_event_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_lock_event_status(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_event_registration_write() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_role text; v_ev text; v_allowed text[];
BEGIN
  IF current_user NOT IN ('anon','authenticated') THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP IN ('INSERT','DELETE') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  v_role := COALESCE(public.app_current_role()::text, '');
  IF v_role = '' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  IF NEW.user_id <> OLD.user_id OR NEW.event_id <> OLD.event_id OR NEW.event_role_id IS DISTINCT FROM OLD.event_role_id
     OR NEW.created_at <> OLD.created_at OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'immutable_columns' USING ERRCODE = 'P0001'; END IF;

  v_ev := public.app_lock_event_status(NEW.event_id);
  IF v_ev = 'cancelled' THEN RAISE EXCEPTION 'event_cancelled' USING ERRCODE = 'P0001'; END IF;

  IF OLD.user_id = auth.uid() THEN
    IF OLD.status NOT IN ('pending','approved','waitlisted') OR OLD.cancellation_requested_at IS NOT NULL
       OR NEW.cancellation_requested_at IS NULL OR COALESCE(v_ev,'') NOT IN ('open','closed')
       OR (to_jsonb(NEW) - 'cancellation_requested_at') IS DISTINCT FROM (to_jsonb(OLD) - 'cancellation_requested_at')
    THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
    RETURN NEW;
  END IF;

  IF v_role NOT IN ('admin','manager','recruiter') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF v_ev = 'completed' AND v_role <> 'admin' THEN RAISE EXCEPTION 'event_completed' USING ERRCODE = 'P0001'; END IF;
  IF NOT public.app_can_manage_event(NEW.event_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  -- cancellation request approved -> 'cancelled' (employee may re-register); staff-initiated removal -> 'removed' (may not)
  IF NEW.status IS DISTINCT FROM OLD.status AND (OLD.status::text, NEW.status::text) NOT IN
     (('pending','approved'),
      ('pending','rejected'),('waitlisted','rejected'),
      ('pending','cancelled'),('approved','cancelled'),('waitlisted','cancelled'),
      ('pending','removed'),('approved','removed'),('waitlisted','removed')) THEN
    RAISE EXCEPTION 'invalid_registration_transition' USING ERRCODE = 'P0001'; END IF;

  v_allowed := ARRAY['status','cancellation_requested_at'];
  IF v_role IN ('admin','manager') THEN
    v_allowed := v_allowed || ARRAY['wage_rate','rate_set_by','rate_set_at','actual_start_time','actual_end_time','hours_reported'];
  END IF;
  IF v_role = 'admin' THEN v_allowed := v_allowed || ARRAY['recruiter_id']; END IF;
  IF (to_jsonb(NEW) - v_allowed) IS DISTINCT FROM (to_jsonb(OLD) - v_allowed) THEN
    RAISE EXCEPTION 'forbidden_column' USING ERRCODE = '42501'; END IF;

  IF NEW.cancellation_requested_at IS NOT NULL AND NEW.cancellation_requested_at IS DISTINCT FROM OLD.cancellation_requested_at THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  IF (NEW.wage_rate, NEW.rate_set_by, NEW.rate_set_at) IS DISTINCT FROM (OLD.wage_rate, OLD.rate_set_by, OLD.rate_set_at) THEN
    IF NEW.wage_rate IS NULL OR NEW.rate_set_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'rate_audit_mismatch' USING ERRCODE = 'P0001'; END IF;
    NEW.rate_set_at := now();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_guard_event_registration_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_registration_write();

-- ROLLBACK:
--   DROP TRIGGER trg_guard_event_registration_write ON public.event_registrations;
--   DROP FUNCTION public.guard_event_registration_write();
--   DROP FUNCTION public.app_lock_event_status(uuid);
