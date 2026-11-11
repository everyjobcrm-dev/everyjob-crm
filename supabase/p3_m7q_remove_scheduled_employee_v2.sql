-- p3_m7q: remove_scheduled_employee v2 (staff-initiated removal -> 'removed'; blocks self re-registration).
-- Diff vs live (supabase/live_snapshot/fn_remove_scheduled_employee.sql, md5 98e0372e...):
--  * hierarchy scope: app_can_manage_event(event); never on the caller's own registration;
--  * lock order events (SHARE) -> event_roles (UPDATE) -> event_registrations (was events FOR UPDATE);
--  * event must be 'open' or 'closed';
--  * only active rows (pending/approved/waitlisted) can be removed. Reason required (also a CHECK on the history table).
-- trg_auto_promote_from_waitlist promotes the next waitlisted row (FIFO) when a pending/approved row is removed.
CREATE OR REPLACE FUNCTION public.remove_scheduled_employee(p_registration_id uuid, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_actor_role text;
  v_registration public.event_registrations%ROWTYPE;
  v_event_status text;
  v_event_id uuid;
  v_role_id uuid;
BEGIN
  SELECT p.role::text INTO v_actor_role FROM public.profiles p WHERE p.id = v_uid;
  IF v_uid IS NULL OR COALESCE(v_actor_role, '') NOT IN ('admin', 'manager', 'recruiter') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF nullif(btrim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT r.event_id, r.event_role_id INTO v_event_id, v_role_id
  FROM public.event_registrations r WHERE r.id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;

  -- lock order: events (SHARE) -> event_roles (UPDATE) -> event_registrations
  SELECT e.status INTO v_event_status FROM public.events e WHERE e.id = v_event_id FOR SHARE;
  IF NOT public.app_can_manage_event(v_event_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_event_status = 'cancelled' THEN RAISE EXCEPTION 'event_cancelled'; END IF;
  IF v_event_status NOT IN ('open', 'closed') THEN RAISE EXCEPTION 'event_not_schedulable'; END IF;
  PERFORM 1 FROM public.event_roles er WHERE er.id = v_role_id FOR UPDATE;

  SELECT r.* INTO v_registration FROM public.event_registrations r WHERE r.id = p_registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  IF v_registration.user_id = v_uid THEN RAISE EXCEPTION 'not_own_registration'; END IF;
  IF v_registration.status NOT IN ('pending', 'approved', 'waitlisted') THEN RAISE EXCEPTION 'registration_not_active'; END IF;
  IF EXISTS (SELECT 1 FROM public.shift_hour_submissions s WHERE s.registration_id = p_registration_id) THEN
    RAISE EXCEPTION 'registration_has_submissions';
  END IF;

  UPDATE public.event_registrations r SET status = 'removed' WHERE r.id = p_registration_id;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id, reason)
  VALUES (v_registration.id, v_registration.event_id, v_registration.user_id, v_registration.status,
          'removed'::public.registration_status, 'organizer_removed', v_uid, btrim(p_reason));
  RETURN p_registration_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.remove_scheduled_employee(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_scheduled_employee(uuid, text) TO authenticated, service_role;

-- ROLLBACK (R7q): apply the body of supabase/live_snapshot/fn_remove_scheduled_employee.sql (lines 3..end), then
--   GRANT EXECUTE ON FUNCTION public.remove_scheduled_employee(uuid, text) TO authenticated, service_role;
-- Dependents: app/manager/actions.ts (removeScheduledEmployee); no DB objects depend on this function.
