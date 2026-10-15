-- ROLLBACK ARTIFACT: verbatim live definition of request_registration_cancellation(uuid, text) captured 2026-10-14 from project
-- yjgqunrboxihxtgkxibw (md5 c2ee24961dc5542c1b331d4c957ecbc6 = md5(pg_get_functiondef)). Rolls back p8_m8v2.
-- Apply ONLY to roll back p8_m8v2_self_withdraw. Live ACL at capture: postgres, authenticated, service_role (no PUBLIC/anon).
CREATE OR REPLACE FUNCTION public.request_registration_cancellation(p_registration_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS event_registrations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_event_id uuid;
  v_role_id uuid;
  v_event public.events%ROWTYPE;
  v_old public.event_registrations%ROWTYPE;
  v_new public.event_registrations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT r.event_id, r.event_role_id INTO v_event_id, v_role_id
    FROM public.event_registrations r WHERE r.id = p_registration_id AND r.user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;

  -- lock order: events (SHARE) -> event_roles (UPDATE) -> event_registrations
  SELECT e.* INTO v_event FROM public.events e WHERE e.id = v_event_id FOR SHARE;
  IF v_event.status = 'cancelled' THEN RAISE EXCEPTION 'event_cancelled'; END IF;
  IF COALESCE(v_event.status, '') NOT IN ('open', 'closed') THEN RAISE EXCEPTION 'event_not_schedulable'; END IF;
  IF v_event.event_date < (now() AT TIME ZONE 'Asia/Jerusalem')::date THEN RAISE EXCEPTION 'event_past'; END IF;
  PERFORM 1 FROM public.event_roles er WHERE er.id = v_role_id FOR UPDATE;

  SELECT r.* INTO v_old FROM public.event_registrations r WHERE r.id = p_registration_id FOR UPDATE;
  IF NOT FOUND OR v_old.user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  IF v_old.status NOT IN ('pending', 'approved', 'waitlisted') THEN RAISE EXCEPTION 'registration_not_active'; END IF;
  IF v_old.cancellation_requested_at IS NOT NULL THEN RAISE EXCEPTION 'cancellation_already_requested'; END IF;

  UPDATE public.event_registrations r SET cancellation_requested_at = now()
   WHERE r.id = p_registration_id RETURNING r.* INTO v_new;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id, reason)
  VALUES (v_old.id, v_old.event_id, v_old.user_id, v_old.status, v_old.status, 'cancellation_requested', v_uid, nullif(btrim(p_reason), ''));
  RETURN v_new;
END;
$function$
;
REVOKE ALL ON FUNCTION public.request_registration_cancellation(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_registration_cancellation(uuid, text) TO authenticated, service_role;
