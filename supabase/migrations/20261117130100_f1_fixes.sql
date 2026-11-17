-- APPLIED 2026-11-17 by the agent via MCP execute_sql (owner approved in chat); verify queries passed.
-- F1b (owner request 2026-11-17). No DROP: runnable through the MCP after approval. Run AFTER f1_drops.sql (applied 2026-11-17: supabase/migrations/20261117130000_f1_drops.sql).
-- Items: 1 overlap on self-registration, 2 notifications, 4 admin approves own hours, 6 soft delete cancels
-- future registrations, 8 broadcast, 10 employee totals. Idempotent (CREATE OR REPLACE). No data change
-- except item 6 at delete time.
-- Rollback: the previous definitions are in supabase/live_snapshot/ and
-- supabase/migrations/20261115073339_c4_notifications_triggers.sql (notify_*), p6_h2_hours_rpcs.sql
-- (approve_shift_hours), 20261110100200_p10c_profiles_soft_delete.sql (soft_delete_user),
-- 20261115084149_c6a_block_unapproved_self_registration.sql (register_for_event_role).
-- New functions broadcast_announcement / get_employee_totals / app_notify_event_staff can stay (unused) or be
-- dropped by hand.

BEGIN;

-- ── 1. Self-registration refuses an overlapping shift (same rule as schedule_employee's 'overlap' warning,
--       but blocking). Counts the worker's pending / approved / waitlisted rows on non-cancelled events.
CREATE OR REPLACE FUNCTION public.register_for_event_role(p_event_role_id uuid)
 RETURNS event_registrations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_event_id uuid; v_status public.registration_status;
        v_old public.event_registrations%ROWTYPE; v_reg public.event_registrations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  -- O2 (owner 2026-11-15): an employee whose account is not approved yet (pending/rejected) cannot self-register.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'employee'
               AND approval_status IS DISTINCT FROM 'approved') THEN
    RAISE EXCEPTION 'not_eligible: account_not_approved';
  END IF;
  v_status := public.app_registration_initial_status(v_uid, p_event_role_id);
  SELECT event_id INTO v_event_id FROM public.event_roles WHERE id = p_event_role_id;

  SELECT * INTO v_old FROM public.event_registrations WHERE event_id = v_event_id AND user_id = v_uid FOR UPDATE;
  IF FOUND THEN
    IF v_old.status = 'rejected' THEN RAISE EXCEPTION 'not_eligible: previously_rejected'; END IF;
    IF v_old.status IN ('removed','no_show') THEN RAISE EXCEPTION 'not_eligible: previously_removed'; END IF;
    IF v_old.status <> 'cancelled'
       OR EXISTS (SELECT 1 FROM public.shift_hour_submissions WHERE registration_id = v_old.id) THEN
      RAISE EXCEPTION 'already_registered'; END IF;
  END IF;

  -- F1 item 1: no two active shifts at the same time
  IF EXISTS (
    SELECT 1
      FROM public.event_roles me
      JOIN public.events my_event ON my_event.id = me.event_id
      JOIN public.event_registrations r ON r.user_id = v_uid AND r.event_id <> me.event_id
                                       AND r.status IN ('pending','approved','waitlisted')
      JOIN public.events oe ON oe.id = r.event_id AND oe.status <> 'cancelled'
      JOIN public.event_roles orl ON orl.id = r.event_role_id
     WHERE me.id = p_event_role_id
       AND CASE
             WHEN orl.end_time IS NULL OR me.end_time IS NULL THEN oe.event_date = my_event.event_date
             ELSE (oe.event_date + orl.start_time,
                   oe.event_date + orl.end_time
                     + CASE WHEN orl.end_time <= orl.start_time THEN interval '1 day' ELSE interval '0' END)
                  OVERLAPS
                  (my_event.event_date + me.start_time,
                   my_event.event_date + me.end_time
                     + CASE WHEN me.end_time <= me.start_time THEN interval '1 day' ELSE interval '0' END)
           END
  ) THEN
    RAISE EXCEPTION 'not_eligible: overlap';
  END IF;

  IF v_old.id IS NOT NULL THEN
    -- revive a self-cancelled row (UNIQUE(event_id,user_id)); reset everything staff-set on the old row.
    -- created_at = now() INTENTIONALLY moves the revived row to the back of the FIFO waitlist.
    UPDATE public.event_registrations SET
           status = v_status, event_role_id = p_event_role_id,
           wage_rate = NULL, rate_set_by = NULL, rate_set_at = NULL, recruiter_id = NULL,
           hours_reported = NULL, actual_start_time = NULL, actual_end_time = NULL,
           cancellation_requested_at = NULL, created_by = v_uid, created_at = now()
     WHERE id = v_old.id RETURNING * INTO v_reg;
  ELSE
    INSERT INTO public.event_registrations (event_id, user_id, event_role_id, status, created_by)
    VALUES (v_event_id, v_uid, p_event_role_id, v_status, v_uid) RETURNING * INTO v_reg;
  END IF;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id)
  VALUES (v_reg.id, v_event_id, v_uid, v_old.status, v_status,
          CASE WHEN v_old.id IS NULL THEN 'self_registered' ELSE 'self_reregistered' END, v_uid);
  RETURN v_reg;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'already_registered';
END $function$;

-- ── 2. Notifications. Staff = every active Admin/Manager + the event's recruiter (app_notify skips the actor).
CREATE OR REPLACE FUNCTION public.app_notify_event_staff(p_event_id uuid, p_type text, p_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.id FROM public.profiles p
     WHERE p.deleted_at IS NULL
       AND (p.role IN ('admin','manager')
            OR p.id = (SELECT e.recruiter_id FROM public.events e WHERE e.id = p_event_id))
  LOOP
    PERFORM public.app_notify(r.id, p_type, p_payload);
  END LOOP;
END $function$;
REVOKE ALL ON FUNCTION public.app_notify_event_staff(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_registration_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_payload jsonb := public.app_notification_event_payload(NEW.event_id)
    || jsonb_build_object('registration_id', NEW.id,
                          'role_name', (SELECT er.role_name FROM public.event_roles er WHERE er.id = NEW.event_role_id));
  v_old_status text := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::text END;
  v_old_request timestamptz := CASE WHEN TG_OP = 'UPDATE' THEN OLD.cancellation_requested_at END;
  v_name text;
BEGIN
  -- staff: a worker signed up (new row, or a self-cancelled row revived) / asked to cancel an approved shift
  IF NEW.created_by = NEW.user_id AND NEW.status::text IN ('pending','approved','waitlisted')
     AND (TG_OP = 'INSERT' OR v_old_status = 'cancelled') THEN
    SELECT btrim(p.first_name || ' ' || p.last_name) INTO v_name FROM public.profiles p WHERE p.id = NEW.user_id;
    PERFORM public.app_notify_event_staff(NEW.event_id, 'staff_new_registration',
      v_payload || jsonb_build_object('employee_name', v_name, 'status', NEW.status::text));
  END IF;
  IF NEW.cancellation_requested_at IS NOT NULL AND v_old_request IS NULL AND NEW.status::text = 'approved' THEN
    SELECT btrim(p.first_name || ' ' || p.last_name) INTO v_name FROM public.profiles p WHERE p.id = NEW.user_id;
    PERFORM public.app_notify_event_staff(NEW.event_id, 'staff_cancellation_request',
      v_payload || jsonb_build_object('employee_name', v_name));
  END IF;

  -- worker (app_notify skips it when the worker did it themself)
  IF TG_OP = 'UPDATE' AND v_old_status = 'waitlisted' AND NEW.status::text IN ('pending','approved') THEN
    PERFORM public.app_notify(NEW.user_id, 'registration_promoted', v_payload || jsonb_build_object('status', NEW.status::text));
  ELSIF NEW.status::text = 'cancelled' AND v_old_status IS DISTINCT FROM 'cancelled' AND v_old_request IS NOT NULL THEN
    PERFORM public.app_notify(NEW.user_id, 'registration_cancellation_approved', v_payload);
  ELSIF TG_OP = 'UPDATE' AND v_old_request IS NOT NULL AND NEW.cancellation_requested_at IS NULL
        AND NEW.status = OLD.status THEN
    PERFORM public.app_notify(NEW.user_id, 'registration_cancellation_dismissed', v_payload);
  ELSIF NEW.status::text IN ('approved','rejected','removed') AND v_old_status IS DISTINCT FROM NEW.status::text THEN
    PERFORM public.app_notify(NEW.user_id, 'registration_' || NEW.status::text, v_payload);
  END IF;
  RETURN NULL;
END $function$;

-- fire on cancellation_requested_at too (was: UPDATE OF status only)
CREATE OR REPLACE TRIGGER trg_notify_registration_status
  AFTER INSERT OR UPDATE OF status, cancellation_requested_at ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.notify_registration_status();

CREATE OR REPLACE FUNCTION public.notify_hours_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.status::text NOT IN ('approved','rejected') OR OLD.status IS NOT DISTINCT FROM NEW.status
     OR NEW.voided_at IS NOT NULL THEN RETURN NULL; END IF;
  PERFORM public.app_notify(NEW.employee_id, 'hours_' || NEW.status::text,
    public.app_notification_event_payload(NEW.event_id)
      || jsonb_build_object('submission_id', NEW.id, 'hours', NEW.reported_hours,
                            'reason', CASE WHEN NEW.status::text = 'rejected' THEN NEW.rejection_reason END,
                            'role_name', (SELECT er.role_name FROM public.event_registrations reg
                                            JOIN public.event_roles er ON er.id = reg.event_role_id
                                           WHERE reg.id = NEW.registration_id)));
  RETURN NULL;
END $function$;

-- ── 4. Admin may approve own hours (needs f1_drops.sql first). Credit rule unchanged: never for own hours.
CREATE OR REPLACE FUNCTION public.approve_shift_hours(p_submission_id uuid)
 RETURNS shift_hour_submissions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_event public.events%ROWTYPE;
  v_reg public.event_registrations%ROWTYPE;
  v_sub public.shift_hour_submissions%ROWTYPE;
  v_new public.shift_hour_submissions%ROWTYPE;
  v_event_id uuid;
  v_rate numeric;
BEGIN
  IF v_uid IS NULL OR public.app_current_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT s.event_id INTO v_event_id FROM public.shift_hour_submissions s WHERE s.id = p_submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission_not_found'; END IF;

  SELECT e.* INTO v_event FROM public.events e WHERE e.id = v_event_id FOR SHARE;
  IF v_event.status = 'cancelled' THEN RAISE EXCEPTION 'event_cancelled'; END IF;
  SELECT s.* INTO v_sub FROM public.shift_hour_submissions s WHERE s.id = p_submission_id;
  SELECT r.* INTO v_reg FROM public.event_registrations r WHERE r.id = v_sub.registration_id FOR SHARE;
  SELECT s.* INTO v_sub FROM public.shift_hour_submissions s WHERE s.id = p_submission_id FOR UPDATE;

  IF v_sub.voided_at IS NOT NULL OR v_sub.status <> 'pending' THEN RAISE EXCEPTION 'invalid_submission_transition'; END IF;
  -- owner 2026-11-17: an Admin may approve hours they worked themselves (self_review check removed)

  UPDATE public.shift_hour_submissions s SET status = 'approved', reviewed_by = v_uid, reviewed_at = now()
   WHERE s.id = p_submission_id RETURNING s.* INTO v_new;

  -- recruitment credit: goes to the EVENT's recruiter (Q2); never for the recruiter's own hours
  IF v_event.recruiter_id IS NOT NULL AND v_event.recruiter_id <> v_reg.user_id
     AND v_event.recruiter_id = (SELECT p.recruited_by FROM public.profiles p WHERE p.id = v_reg.user_id) THEN
    SELECT p.recruiter_bonus_rate INTO v_rate FROM public.profiles p WHERE p.id = v_event.recruiter_id AND p.role = 'recruiter';
    IF v_rate IS NOT NULL AND v_rate > 0 THEN
      INSERT INTO public.recruiter_bonuses (recruiter_id, source_registration_id, bonus_amount, status)
      VALUES (v_event.recruiter_id, v_reg.id, round(v_sub.reported_hours * v_rate, 2), 'pending')
      ON CONFLICT (source_registration_id) DO UPDATE
        SET recruiter_id = EXCLUDED.recruiter_id, bonus_amount = EXCLUDED.bonus_amount, status = 'pending', created_at = now()
        WHERE public.recruiter_bonuses.status = 'voided';
    END IF;
  END IF;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id, reason)
  VALUES (v_reg.id, v_event_id, v_reg.user_id, v_reg.status, v_reg.status, 'hours_approved', v_uid, 'hours: ' || v_sub.reported_hours::text);
  RETURN v_new;
END;
$function$;

-- ── 6. Soft delete cancels the user's upcoming registrations (waitlist promotion follows via its trigger).
CREATE OR REPLACE FUNCTION public.soft_delete_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_deleted_at timestamptz;
  r record;
BEGIN
  IF v_uid IS NULL OR COALESCE(public.app_current_role()::text, '') <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_user_id = v_uid THEN RAISE EXCEPTION 'cannot_delete_self'; END IF;
  SELECT p.deleted_at INTO v_deleted_at FROM public.profiles p WHERE p.id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
  IF v_deleted_at IS NOT NULL THEN RAISE EXCEPTION 'already_deleted'; END IF;
  UPDATE public.profiles SET deleted_at = now(), deleted_by = v_uid WHERE id = p_user_id;

  FOR r IN
    SELECT reg.id, reg.event_id, reg.status
      FROM public.event_registrations reg
      JOIN public.events e ON e.id = reg.event_id
     WHERE reg.user_id = p_user_id
       AND reg.status IN ('pending','approved','waitlisted')
       AND e.status IN ('open','closed','pending_rates')
       AND e.event_date >= (now() AT TIME ZONE 'Asia/Jerusalem')::date
       AND NOT EXISTS (SELECT 1 FROM public.shift_hour_submissions s WHERE s.registration_id = reg.id)
     ORDER BY e.event_date
  LOOP
    UPDATE public.event_registrations SET status = 'cancelled', cancellation_requested_at = NULL WHERE id = r.id;
    INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id, reason)
    VALUES (r.id, r.event_id, p_user_id, r.status, 'cancelled', 'user_deleted', v_uid, 'soft delete');
  END LOOP;
END;
$function$;

-- ── 8. "Message to all workers": one notification per active employee/recruiter (no announcements table).
CREATE OR REPLACE FUNCTION public.broadcast_announcement(p_title text, p_body text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_count integer;
BEGIN
  IF auth.uid() IS NULL OR public.app_current_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF nullif(btrim(p_title), '') IS NULL OR nullif(btrim(p_body), '') IS NULL THEN RAISE EXCEPTION 'title_body_required'; END IF;
  IF length(p_title) > 200 OR length(p_body) > 2000 THEN RAISE EXCEPTION 'too_long'; END IF;
  INSERT INTO public.notifications (id, user_id, type, payload, created_at)
  SELECT gen_random_uuid(), p.id, 'announcement',
         jsonb_build_object('title', btrim(p_title), 'body', btrim(p_body)), now()
    FROM public.profiles p
   WHERE p.role IN ('employee','recruiter') AND p.deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $function$;
REVOKE ALL ON FUNCTION public.broadcast_announcement(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.broadcast_announcement(text, text) TO authenticated;

-- ── 10. Employee directory totals: approved hours and company profit (billing amount - pay), derived on read
--        from the B2 views. Lines with a missing price or wage are left out of the profit (never guessed).
CREATE OR REPLACE FUNCTION public.get_employee_totals()
 RETURNS TABLE (employee_id uuid, total_hours numeric, total_profit numeric)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.app_current_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  RETURN QUERY
  SELECT p.employee_id, sum(p.hours), round(sum(b.amount - p.pay), 2)
    FROM public.v_payroll_shift_lines p
    LEFT JOIN public.v_billing_shift_lines b ON b.submission_id = p.submission_id
   GROUP BY p.employee_id;
END $function$;
REVOKE ALL ON FUNCTION public.get_employee_totals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_employee_totals() TO authenticated;

COMMIT;

-- Verify (read-only)
SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname = 'trg_notify_registration_status';
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace
   AND proname IN ('app_notify_event_staff','broadcast_announcement','get_employee_totals');
SELECT position('not_eligible: overlap' IN pg_get_functiondef('public.register_for_event_role'::regproc)) > 0 AS overlap_check,
       position('self_review' IN pg_get_functiondef('public.approve_shift_hours'::regproc)) = 0 AS admin_self_approve;
