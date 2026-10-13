-- p3_m7r: staff_transition_registration - the single staff RPC for registration status changes (other than schedule/remove).
--   approve              pending    -> approved   (slot already held; refused while a cancellation request is open)
--   reject               pending|waitlisted -> rejected (cannot re-apply)
--   promote              waitlisted -> approved   (only when pending+approved < headcount)
--   approve_cancellation pending|approved|waitlisted with an open request -> cancelled (may re-register);
--                        trg_auto_promote_from_waitlist then promotes the next waitlisted row FIFO (-> pending)
--   dismiss_cancellation clears cancellation_requested_at; status unchanged
-- Scope: app_can_manage_event (recruiter: own events). Never on the caller's own registration. Event must be open/closed.
-- Lock order: events (SHARE) -> event_roles (UPDATE) -> event_registrations. Every action writes a history row.
CREATE OR REPLACE FUNCTION public.staff_transition_registration(p_registration_id uuid, p_action text, p_reason text DEFAULT NULL)
 RETURNS public.event_registrations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_actor_role text;
  v_event_id uuid;
  v_role_id uuid;
  v_event_status text;
  v_headcount int;
  v_filled bigint;
  v_old public.event_registrations%ROWTYPE;
  v_new public.event_registrations%ROWTYPE;
  v_to public.registration_status;
  v_history_action text;
BEGIN
  SELECT p.role::text INTO v_actor_role FROM public.profiles p WHERE p.id = v_uid;
  IF v_uid IS NULL OR COALESCE(v_actor_role, '') NOT IN ('admin', 'manager', 'recruiter') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('approve', 'reject', 'promote', 'approve_cancellation', 'dismiss_cancellation') THEN
    RAISE EXCEPTION 'invalid_action';
  END IF;

  SELECT r.event_id, r.event_role_id INTO v_event_id, v_role_id
  FROM public.event_registrations r WHERE r.id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;

  -- lock order: events (SHARE) -> event_roles (UPDATE) -> event_registrations
  SELECT e.status INTO v_event_status FROM public.events e WHERE e.id = v_event_id FOR SHARE;
  IF NOT public.app_can_manage_event(v_event_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_event_status = 'cancelled' THEN RAISE EXCEPTION 'event_cancelled'; END IF;
  IF v_event_status NOT IN ('open', 'closed') THEN RAISE EXCEPTION 'event_not_schedulable'; END IF;
  SELECT er.headcount INTO v_headcount FROM public.event_roles er WHERE er.id = v_role_id FOR UPDATE;

  SELECT r.* INTO v_old FROM public.event_registrations r WHERE r.id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  IF v_old.user_id = v_uid THEN RAISE EXCEPTION 'not_own_registration'; END IF;

  IF p_action = 'approve' THEN
    IF v_old.status <> 'pending' THEN RAISE EXCEPTION 'invalid_registration_transition'; END IF;
    IF v_old.cancellation_requested_at IS NOT NULL THEN RAISE EXCEPTION 'cancellation_pending'; END IF;
    v_to := 'approved'; v_history_action := 'organizer_approved';

  ELSIF p_action = 'reject' THEN
    IF v_old.status NOT IN ('pending', 'waitlisted') THEN RAISE EXCEPTION 'invalid_registration_transition'; END IF;
    v_to := 'rejected'; v_history_action := 'organizer_rejected';

  ELSIF p_action = 'promote' THEN
    IF v_old.status <> 'waitlisted' THEN RAISE EXCEPTION 'invalid_registration_transition'; END IF;
    IF v_old.cancellation_requested_at IS NOT NULL THEN RAISE EXCEPTION 'cancellation_pending'; END IF;
    SELECT count(*) INTO v_filled FROM public.event_registrations r
     WHERE r.event_role_id = v_role_id AND r.status IN ('pending', 'approved');
    IF v_filled >= v_headcount THEN RAISE EXCEPTION 'event_role_full'; END IF;
    v_to := 'approved'; v_history_action := 'organizer_promoted';

  ELSIF p_action = 'approve_cancellation' THEN
    IF v_old.cancellation_requested_at IS NULL THEN RAISE EXCEPTION 'no_cancellation_request'; END IF;
    IF v_old.status NOT IN ('pending', 'approved', 'waitlisted') THEN RAISE EXCEPTION 'invalid_registration_transition'; END IF;
    v_to := 'cancelled'; v_history_action := 'organizer_approved_cancellation';

  ELSE -- dismiss_cancellation
    IF v_old.cancellation_requested_at IS NULL THEN RAISE EXCEPTION 'no_cancellation_request'; END IF;
    v_to := v_old.status; v_history_action := 'organizer_dismissed_cancellation';
  END IF;

  IF v_to IN ('rejected', 'cancelled')
     AND EXISTS (SELECT 1 FROM public.shift_hour_submissions s WHERE s.registration_id = p_registration_id) THEN
    RAISE EXCEPTION 'registration_has_submissions';
  END IF;

  IF p_action = 'dismiss_cancellation' THEN
    UPDATE public.event_registrations r SET cancellation_requested_at = NULL
     WHERE r.id = p_registration_id RETURNING r.* INTO v_new;
  ELSE
    -- cancellation_requested_at is kept on 'cancelled' rows as the audit timestamp of the request
    UPDATE public.event_registrations r SET status = v_to
     WHERE r.id = p_registration_id RETURNING r.* INTO v_new;
  END IF;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id, reason)
  VALUES (v_old.id, v_old.event_id, v_old.user_id, v_old.status, v_to, v_history_action, v_uid, nullif(btrim(p_reason), ''));
  RETURN v_new;
END;
$function$;
REVOKE ALL ON FUNCTION public.staff_transition_registration(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_transition_registration(uuid, text, text) TO authenticated, service_role;

-- ROLLBACK (R7r, run in the SQL Editor - contains DROP):
--   DROP FUNCTION IF EXISTS public.staff_transition_registration(uuid, text, text);
-- Dependents: app/manager/actions.ts (approve/reject/promote/approve-cancellation/dismiss actions).
