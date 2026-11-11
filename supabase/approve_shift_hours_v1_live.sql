-- LIVE SNAPSHOT of public.approve_shift_hours before p6_h7 (2026-10-13), = p6_h2 + E1/E2. Rollback R7 for p6_h7.
-- md5(pg_get_functiondef) = a501d6d4c94d62a0149c2f46dc3e44d7. Apply as-is to roll back (grants are unchanged by h7).
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
  IF v_sub.employee_id = v_uid THEN RAISE EXCEPTION 'self_review'; END IF;

  UPDATE public.shift_hour_submissions s SET status = 'approved', reviewed_by = v_uid, reviewed_at = now()
   WHERE s.id = p_submission_id RETURNING s.* INTO v_new;

  -- recruitment credit: goes to the EVENT's recruiter (Q2); never for the recruiter's own hours
  IF v_event.recruiter_id IS NOT NULL AND v_event.recruiter_id <> v_reg.user_id THEN
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
