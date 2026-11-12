-- PENDING (not applied). p10: event final closure = closure level 2 ("סגירה סופית").
-- Owner runs this file in the Supabase SQL Editor (dev first), then: save as supabase/migrations/20261110100000_p10_event_final_closure.sql,
-- `supabase migration repair --status applied 20261110100000 --linked`, regenerate types (AGENTS.md 5.6).
-- Idempotent: CREATE OR REPLACE only; no DROP, no data change. Rollback = re-apply supabase/p1_m3_event_status_transitions.sql
-- (its enforce_event_status_transition body) and leave app_event_has_pending_hours in place (harmless).
--
-- Closure model (docs/handoff.md §5 + this run):
--   level 1 = events.status 'closed'   (closed for registration; Manager/Admin any event, Recruiter own events; reopen by the same)
--   level 2 = events.status 'completed' (final closure; Admin/Manager only). Reopen for editing = completed -> closed (Admin/Manager only).
--   'paused' stays FROZEN (no app transition in or out).
-- Rules added here, on top of p1_m3:
--   * admin/manager: ('closed','completed') and ('completed','closed') are allowed; a recruiter never touches 'completed'
--   * -> 'completed' is refused while a non-voided PENDING hour report exists ('pending_hours_exist'): approve/reject/void first
--   * cancelled_from_status handling, missing_rates, cannot_cancel_with_approved_hours: unchanged
-- Existing rules that already treat 'completed' as final (unchanged, verified in the repo):
--   update_event_details / upsert_event_role / remove_event_role -> 'event_not_editable' (p9); schedule / staff_transition ->
--   'event_not_schedulable'; guard_event_registration_write -> 'event_completed' for non-admin; submit_shift_hours on a
--   completed event: admin only (p6_h2); approve/reject/void hours: unchanged (admin).

CREATE OR REPLACE FUNCTION public.app_event_has_pending_hours(p_event_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shift_hour_submissions s
                 WHERE s.event_id = p_event_id AND s.status = 'pending' AND s.voided_at IS NULL) $$;
REVOKE ALL ON FUNCTION public.app_event_has_pending_hours(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_event_has_pending_hours(uuid) TO authenticated, service_role;

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

  -- p10: only 'paused' stays frozen; 'completed' is the final closure (level 2) reachable from 'closed'
  IF OLD.status = 'paused' OR NEW.status = 'paused' THEN
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
         ('cancelled','open'),('cancelled','closed'),('cancelled','pending_rates'),
         ('closed','completed'),('completed','closed')) THEN
      RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001'; END IF;
  ELSE
    RAISE EXCEPTION 'forbidden_transition' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IN ('open','closed') AND OLD.status IN ('pending_rates','cancelled')
     AND EXISTS (SELECT 1 FROM public.event_roles r WHERE r.event_id = NEW.id AND r.base_rate IS NULL) THEN
    RAISE EXCEPTION 'missing_rates' USING ERRCODE = 'P0001'; END IF;

  IF NEW.status = 'cancelled' AND public.app_event_has_approved_hours(NEW.id) THEN
    RAISE EXCEPTION 'cannot_cancel_with_approved_hours' USING ERRCODE = 'P0001'; END IF;

  IF NEW.status = 'completed' AND public.app_event_has_pending_hours(NEW.id) THEN
    RAISE EXCEPTION 'pending_hours_exist' USING ERRCODE = 'P0001'; END IF;
  RETURN NEW;
END $$;

-- The trigger trg_enforce_event_status_transition (BEFORE INSERT OR UPDATE OF status, p1_m3) is unchanged and keeps
-- pointing at this function. Verify read-only afterwards:
--   SELECT md5(prosrc) FROM pg_proc WHERE proname = 'enforce_event_status_transition';
--   SELECT has_function_privilege('anon', 'public.app_event_has_pending_hours(uuid)', 'EXECUTE');  -- false
-- Then run supabase/tests/p10_final_closure_tests.sql (rolls back; expect every 'r' = PASS).
