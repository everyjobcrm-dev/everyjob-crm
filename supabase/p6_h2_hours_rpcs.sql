-- PROPOSED - not applied. Needs an explicit approval line (AGENTS.md 8.1). Requires p6_h0 (recruiter_bonus_rate),
-- p6_h1 (constraints) and p6_h4 (DEFINER rating triggers) first.
-- p6_h2: hours-flow RPCs. All SECURITY DEFINER with a fixed search_path; the tables stay closed to direct client DML (p6_h3).
-- Lock order: events (SHARE) -> event_registrations (SHARE) -> shift_hour_submissions (UPDATE) -> recruiter_bonuses.
-- Audit: registration_status_history rows with from_status = to_status = the registration status and actions
--   hours_submitted / hours_resubmitted / hours_approved / hours_rejected / hours_voided (details in reason).
-- State machine and permissions: docs/design-hours-flow.md.

-- ── submit / re-submit (Admin, Manager) ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_shift_hours(
  p_registration_id uuid, p_reported_start timestamptz, p_reported_end timestamptz, p_reported_hours numeric,
  p_rating int DEFAULT NULL, p_notes text DEFAULT NULL)
 RETURNS public.shift_hour_submissions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_actor text;
  v_event public.events%ROWTYPE;
  v_reg public.event_registrations%ROWTYPE;
  v_old public.shift_hour_submissions%ROWTYPE;
  v_new public.shift_hour_submissions%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT p.role::text INTO v_actor FROM public.profiles p WHERE p.id = v_uid;
  IF v_uid IS NULL OR COALESCE(v_actor, '') NOT IN ('admin', 'manager') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_reported_hours IS NULL OR p_reported_hours <= 0 OR p_reported_hours > 24
     OR p_reported_start IS NULL OR p_reported_end IS NULL OR p_reported_end <= p_reported_start THEN
    RAISE EXCEPTION 'invalid_hours';
  END IF;
  IF p_rating IS NOT NULL AND p_rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'invalid_rating'; END IF;

  SELECT r.event_id INTO v_event_id FROM public.event_registrations r WHERE r.id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;

  SELECT e.* INTO v_event FROM public.events e WHERE e.id = v_event_id FOR SHARE;
  IF NOT public.app_can_manage_event(v_event_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_event.status = 'cancelled' THEN RAISE EXCEPTION 'event_cancelled'; END IF;
  IF NOT (v_event.status IN ('open', 'closed') OR (v_event.status = 'completed' AND v_actor = 'admin')) THEN
    RAISE EXCEPTION 'hours_not_allowed';
  END IF;
  IF v_event.event_date > (now() AT TIME ZONE 'Asia/Jerusalem')::date THEN RAISE EXCEPTION 'shift_not_started'; END IF;

  SELECT r.* INTO v_reg FROM public.event_registrations r WHERE r.id = p_registration_id FOR SHARE;
  IF v_reg.user_id = v_uid THEN RAISE EXCEPTION 'not_own_registration'; END IF;
  IF v_reg.status <> 'approved' THEN RAISE EXCEPTION 'registration_not_approved'; END IF;

  SELECT s.* INTO v_old FROM public.shift_hour_submissions s WHERE s.registration_id = p_registration_id FOR UPDATE;
  IF FOUND THEN
    IF v_old.status = 'approved' AND v_old.voided_at IS NULL THEN RAISE EXCEPTION 'hours_already_approved'; END IF;
    UPDATE public.shift_hour_submissions s SET
           reported_start = p_reported_start, reported_end = p_reported_end, reported_hours = p_reported_hours,
           performance_rating = p_rating, performance_notes = nullif(btrim(p_notes), ''),
           status = 'pending', submitted_by = v_uid, submitted_at = now(),
           reviewed_by = NULL, reviewed_at = NULL, rejection_reason = NULL,
           voided_at = NULL, voided_by = NULL, void_reason = NULL
     WHERE s.id = v_old.id RETURNING s.* INTO v_new;
  ELSE
    INSERT INTO public.shift_hour_submissions (registration_id, reported_start, reported_end, reported_hours,
           performance_rating, performance_notes, status, submitted_by, submitted_at)
    VALUES (p_registration_id, p_reported_start, p_reported_end, p_reported_hours,
           p_rating, nullif(btrim(p_notes), ''), 'pending', v_uid, now())
    RETURNING * INTO v_new;   -- trg_set_shift_submission_refs fills employee_id / event_id
  END IF;

  -- one rating per (employee, event): the latest submission's rating wins
  IF p_rating IS NOT NULL THEN
    UPDATE public.employee_ratings er SET rating = p_rating, review_notes = nullif(btrim(p_notes), ''), rater_id = v_uid
     WHERE er.employee_id = v_reg.user_id AND er.event_id = v_event_id;
    IF NOT FOUND THEN
      INSERT INTO public.employee_ratings (employee_id, rater_id, event_id, rating, review_notes)
      VALUES (v_reg.user_id, v_uid, v_event_id, p_rating, nullif(btrim(p_notes), ''));
    END IF;
  END IF;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id, reason)
  VALUES (v_reg.id, v_event_id, v_reg.user_id, v_reg.status, v_reg.status,
          CASE WHEN v_old.id IS NULL THEN 'hours_submitted' ELSE 'hours_resubmitted' END, v_uid,
          'hours: ' || p_reported_hours::text);
  RETURN v_new;
END;
$function$;

-- ── shared loader for the admin review actions ─────────────────────────────────────────────────────────
-- (inlined in each function to keep the lock order explicit)

-- ── approve (Admin only; never own hours; two-person rule) + recruitment credit ────────────────────────
CREATE OR REPLACE FUNCTION public.approve_shift_hours(p_submission_id uuid)
 RETURNS public.shift_hour_submissions
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
  IF v_sub.employee_id = v_uid THEN RAISE EXCEPTION 'self_review'; END IF;
  IF v_sub.submitted_by = v_uid THEN RAISE EXCEPTION 'two_person_review'; END IF;

  UPDATE public.shift_hour_submissions s SET status = 'approved', reviewed_by = v_uid, reviewed_at = now()
   WHERE s.id = p_submission_id RETURNING s.* INTO v_new;

  -- recruitment credit: the event's own recruiter recruited this worker; never for the recruiter's own hours
  IF v_reg.recruiter_id IS NOT NULL AND v_reg.recruiter_id = v_event.recruiter_id AND v_reg.recruiter_id <> v_reg.user_id THEN
    SELECT p.recruiter_bonus_rate INTO v_rate FROM public.profiles p WHERE p.id = v_reg.recruiter_id AND p.role = 'recruiter';
    IF v_rate IS NOT NULL AND v_rate > 0 THEN
      INSERT INTO public.recruiter_bonuses (recruiter_id, source_registration_id, bonus_amount, status)
      VALUES (v_reg.recruiter_id, v_reg.id, round(v_sub.reported_hours * v_rate, 2), 'pending')
      ON CONFLICT (source_registration_id) DO UPDATE
        SET bonus_amount = EXCLUDED.bonus_amount, status = 'pending', created_at = now()
        WHERE public.recruiter_bonuses.status = 'voided';
    END IF;
  END IF;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id, reason)
  VALUES (v_reg.id, v_event_id, v_reg.user_id, v_reg.status, v_reg.status, 'hours_approved', v_uid, 'hours: ' || v_sub.reported_hours::text);
  RETURN v_new;
END;
$function$;

-- ── reject (Admin only; reason required) ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_shift_hours(p_submission_id uuid, p_reason text)
 RETURNS public.shift_hour_submissions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_reg public.event_registrations%ROWTYPE;
  v_sub public.shift_hour_submissions%ROWTYPE;
  v_new public.shift_hour_submissions%ROWTYPE;
  v_event_id uuid;
BEGIN
  IF v_uid IS NULL OR public.app_current_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF nullif(btrim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'reason_required'; END IF;
  SELECT s.event_id INTO v_event_id FROM public.shift_hour_submissions s WHERE s.id = p_submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission_not_found'; END IF;

  PERFORM 1 FROM public.events e WHERE e.id = v_event_id FOR SHARE;
  SELECT s.* INTO v_sub FROM public.shift_hour_submissions s WHERE s.id = p_submission_id;
  SELECT r.* INTO v_reg FROM public.event_registrations r WHERE r.id = v_sub.registration_id FOR SHARE;
  SELECT s.* INTO v_sub FROM public.shift_hour_submissions s WHERE s.id = p_submission_id FOR UPDATE;

  IF v_sub.voided_at IS NOT NULL OR v_sub.status <> 'pending' THEN RAISE EXCEPTION 'invalid_submission_transition'; END IF;
  IF v_sub.employee_id = v_uid THEN RAISE EXCEPTION 'self_review'; END IF;

  UPDATE public.shift_hour_submissions s
     SET status = 'rejected', reviewed_by = v_uid, reviewed_at = now(), rejection_reason = btrim(p_reason)
   WHERE s.id = p_submission_id RETURNING s.* INTO v_new;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id, reason)
  VALUES (v_reg.id, v_event_id, v_reg.user_id, v_reg.status, v_reg.status, 'hours_rejected', v_uid, btrim(p_reason));
  RETURN v_new;
END;
$function$;

-- ── void (Admin: any status; Manager: pending / rejected only; reason required) ──────────────────────────
CREATE OR REPLACE FUNCTION public.void_shift_hours(p_submission_id uuid, p_reason text)
 RETURNS public.shift_hour_submissions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_actor text;
  v_reg public.event_registrations%ROWTYPE;
  v_sub public.shift_hour_submissions%ROWTYPE;
  v_new public.shift_hour_submissions%ROWTYPE;
  v_event_id uuid;
BEGIN
  v_actor := COALESCE(public.app_current_role()::text, '');
  IF v_uid IS NULL OR v_actor NOT IN ('admin', 'manager') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF nullif(btrim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'reason_required'; END IF;
  SELECT s.event_id INTO v_event_id FROM public.shift_hour_submissions s WHERE s.id = p_submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission_not_found'; END IF;

  PERFORM 1 FROM public.events e WHERE e.id = v_event_id FOR SHARE;
  IF NOT public.app_can_manage_event(v_event_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT s.* INTO v_sub FROM public.shift_hour_submissions s WHERE s.id = p_submission_id;
  SELECT r.* INTO v_reg FROM public.event_registrations r WHERE r.id = v_sub.registration_id FOR SHARE;
  SELECT s.* INTO v_sub FROM public.shift_hour_submissions s WHERE s.id = p_submission_id FOR UPDATE;

  IF v_sub.voided_at IS NOT NULL THEN RAISE EXCEPTION 'invalid_submission_transition'; END IF;
  IF v_sub.employee_id = v_uid THEN RAISE EXCEPTION 'not_own_registration'; END IF;
  IF v_sub.status = 'approved' THEN
    IF v_actor <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
    IF EXISTS (SELECT 1 FROM public.recruiter_bonuses b WHERE b.source_registration_id = v_sub.registration_id AND b.status = 'applied') THEN
      RAISE EXCEPTION 'credit_already_applied';
    END IF;
    UPDATE public.recruiter_bonuses b SET status = 'voided'
     WHERE b.source_registration_id = v_sub.registration_id AND b.status = 'pending';
  END IF;

  UPDATE public.shift_hour_submissions s SET voided_at = now(), voided_by = v_uid, void_reason = btrim(p_reason)
   WHERE s.id = p_submission_id RETURNING s.* INTO v_new;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id, reason)
  VALUES (v_reg.id, v_event_id, v_reg.user_id, v_reg.status, v_reg.status, 'hours_voided', v_uid, btrim(p_reason));
  RETURN v_new;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_shift_hours(uuid, timestamptz, timestamptz, numeric, int, text),
                       public.approve_shift_hours(uuid), public.reject_shift_hours(uuid, text), public.void_shift_hours(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_shift_hours(uuid, timestamptz, timestamptz, numeric, int, text),
                          public.approve_shift_hours(uuid), public.reject_shift_hours(uuid, text), public.void_shift_hours(uuid, text)
  TO authenticated, service_role;

-- ROLLBACK (by hand, SQL Editor - contains DROP; these functions do not exist live, so nothing is replaced):
--   DROP FUNCTION IF EXISTS public.submit_shift_hours(uuid, timestamptz, timestamptz, numeric, int, text);
--   DROP FUNCTION IF EXISTS public.approve_shift_hours(uuid);
--   DROP FUNCTION IF EXISTS public.reject_shift_hours(uuid, text);
--   DROP FUNCTION IF EXISTS public.void_shift_hours(uuid, text);
