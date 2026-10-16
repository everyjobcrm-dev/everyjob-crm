-- APPLIED 2026-10-16 (P9-E0..E3; E0-E2 via MCP apply_migration, E3 by the owner in the SQL Editor). Proposed 2026-10-15. Responsible recruiter + edit-event RPCs (docs/handoff.md §6, §7.2-7.3).
-- All four are NEW functions (no live definition to replace). Apply one at a time; the rollback lines at the bottom
-- contain DROP and are run by the owner in the SQL Editor only.
--
-- Rules enforced here (the app mirrors them only for UX):
--   * caller must manage the event (app_can_manage_event: admin/manager any event, recruiter own events)
--   * only pending_rates / open / closed events are editable (cancelled, completed, paused are read-only)
--   * client_id: admin only. recruiter_id: admin or manager, target must have role 'recruiter' (or NULL)
--   * event_date: never moved into the past (Asia/Jerusalem), and date / start time / role times are locked once
--     any non-voided hour report (pending or approved) exists
--   * travel_budget_per_worker and recruiter_id are locked once approved hours exist (payroll + credit attribution)
--   * role headcount >= occupied (pending + approved); growing a role promotes waitlisted FIFO -> pending
--   * a role with any registration cannot be removed; an event keeps at least one role
--   * open/closed events never get a role without base_rate; bill_to_client is admin only

-- ===== E0: recruiters for the "מגייס/ת אחראי/ת" select and event cards (admin/manager only; names only) =====
CREATE OR REPLACE FUNCTION public.list_staff_recruiters()
 RETURNS TABLE(id uuid, first_name text, last_name text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT p.id, p.first_name::text, p.last_name::text
    FROM public.profiles p
   WHERE p.role = 'recruiter'
     AND COALESCE(public.app_current_role()::text, '') IN ('admin', 'manager')
   ORDER BY p.first_name, p.last_name
$function$;
REVOKE ALL ON FUNCTION public.list_staff_recruiters() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_staff_recruiters() TO authenticated, service_role;

-- ===== E1: update_event_details(event, patch jsonb) - allow-listed keys only =====
CREATE OR REPLACE FUNCTION public.update_event_details(p_event_id uuid, p_patch jsonb)
 RETURNS public.events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := COALESCE(public.app_current_role()::text, '');
  v_ev public.events%ROWTYPE;
  v_key text;
  v_today date := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
  v_has_hours boolean;
  v_has_approved boolean;
  v_location text;
  v_date date;
  v_start time;
  v_client uuid;
  v_recruiter uuid;
  v_travel numeric;
  v_min_age int;
  v_min_rating numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN RAISE EXCEPTION 'invalid_patch'; END IF;

  SELECT * INTO v_ev FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found'; END IF;
  IF NOT public.app_can_manage_event(p_event_id) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  IF v_ev.status NOT IN ('pending_rates', 'open', 'closed') THEN RAISE EXCEPTION 'event_not_editable'; END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_patch) LOOP
    IF NOT v_key = ANY (ARRAY['location', 'event_date', 'start_time', 'notes', 'dress_code', 'min_age', 'min_rating',
                              'travel_budget_per_worker', 'client_id', 'recruiter_id']) THEN
      RAISE EXCEPTION 'forbidden_column: %', v_key USING ERRCODE = '42501';
    END IF;
  END LOOP;

  v_location  := CASE WHEN p_patch ? 'location' THEN btrim(p_patch->>'location') ELSE v_ev.location END;
  v_date      := CASE WHEN p_patch ? 'event_date' THEN (p_patch->>'event_date')::date ELSE v_ev.event_date END;
  v_start     := CASE WHEN p_patch ? 'start_time' THEN (p_patch->>'start_time')::time ELSE v_ev.start_time END;
  v_client    := CASE WHEN p_patch ? 'client_id' THEN (p_patch->>'client_id')::uuid ELSE v_ev.client_id END;
  v_recruiter := CASE WHEN p_patch ? 'recruiter_id' THEN (p_patch->>'recruiter_id')::uuid ELSE v_ev.recruiter_id END;
  v_travel    := CASE WHEN p_patch ? 'travel_budget_per_worker' THEN COALESCE((p_patch->>'travel_budget_per_worker')::numeric, 0)
                      ELSE v_ev.travel_budget_per_worker END;
  v_min_age   := CASE WHEN p_patch ? 'min_age' THEN (p_patch->>'min_age')::int ELSE v_ev.min_age END;
  v_min_rating := CASE WHEN p_patch ? 'min_rating' THEN (p_patch->>'min_rating')::numeric ELSE v_ev.min_rating END;

  IF v_location IS NULL OR v_location = '' OR v_date IS NULL OR v_start IS NULL OR v_client IS NULL THEN
    RAISE EXCEPTION 'invalid_value';
  END IF;
  IF v_travel < 0 OR (v_min_age IS NOT NULL AND v_min_age < 1) OR (v_min_rating IS NOT NULL AND (v_min_rating < 0 OR v_min_rating > 5)) THEN
    RAISE EXCEPTION 'invalid_value';
  END IF;

  IF v_client IS DISTINCT FROM v_ev.client_id AND v_role <> 'admin' THEN
    RAISE EXCEPTION 'forbidden_column: client_id' USING ERRCODE = '42501';
  END IF;
  IF v_recruiter IS DISTINCT FROM v_ev.recruiter_id THEN
    IF v_role NOT IN ('admin', 'manager') THEN RAISE EXCEPTION 'forbidden_column: recruiter_id' USING ERRCODE = '42501'; END IF;
    IF v_recruiter IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_recruiter AND p.role = 'recruiter') THEN
      RAISE EXCEPTION 'recruiter_not_found';
    END IF;
  END IF;

  v_has_hours := EXISTS (SELECT 1 FROM public.shift_hour_submissions s
                          WHERE s.event_id = p_event_id AND s.voided_at IS NULL AND s.status IN ('pending', 'approved'));
  v_has_approved := public.app_event_has_approved_hours(p_event_id);

  IF v_date IS DISTINCT FROM v_ev.event_date THEN
    IF v_has_hours THEN RAISE EXCEPTION 'event_has_hours'; END IF;
    IF v_date < v_today THEN RAISE EXCEPTION 'event_date_past'; END IF;
  END IF;
  IF v_start IS DISTINCT FROM v_ev.start_time AND v_has_hours THEN RAISE EXCEPTION 'event_has_hours'; END IF;
  IF v_has_approved AND (v_travel IS DISTINCT FROM COALESCE(v_ev.travel_budget_per_worker, 0) OR v_recruiter IS DISTINCT FROM v_ev.recruiter_id) THEN
    RAISE EXCEPTION 'event_has_approved_hours';
  END IF;

  UPDATE public.events e
     SET location = v_location,
         event_date = v_date,
         start_time = v_start,
         client_id = v_client,
         recruiter_id = v_recruiter,
         travel_budget_per_worker = v_travel,
         min_age = v_min_age,
         min_rating = v_min_rating,
         notes = CASE WHEN p_patch ? 'notes' THEN NULLIF(btrim(p_patch->>'notes'), '') ELSE e.notes END,
         dress_code = CASE WHEN p_patch ? 'dress_code' THEN NULLIF(btrim(p_patch->>'dress_code'), '') ELSE e.dress_code END
   WHERE e.id = p_event_id
  RETURNING * INTO v_ev;
  RETURN v_ev;
END;
$function$;
REVOKE ALL ON FUNCTION public.update_event_details(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_event_details(uuid, jsonb) TO authenticated, service_role;

-- ===== E2: upsert_event_role - add (p_role_id NULL) or update a role =====
CREATE OR REPLACE FUNCTION public.upsert_event_role(
  p_event_id uuid, p_role_id uuid, p_role_name text, p_headcount int, p_start_time time, p_end_time time,
  p_base_rate numeric, p_bill_to_client numeric DEFAULT NULL)
 RETURNS public.event_roles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := COALESCE(public.app_current_role()::text, '');
  v_status text;
  v_r public.event_roles%ROWTYPE;
  v_occupied int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  SELECT e.status INTO v_status FROM public.events e WHERE e.id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found'; END IF;
  IF NOT public.app_can_manage_event(p_event_id) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  IF v_status NOT IN ('pending_rates', 'open', 'closed') THEN RAISE EXCEPTION 'event_not_editable'; END IF;

  IF p_role_name IS NULL OR btrim(p_role_name) = '' OR p_start_time IS NULL THEN RAISE EXCEPTION 'invalid_value'; END IF;
  IF p_headcount IS NULL OR p_headcount < 1 THEN RAISE EXCEPTION 'invalid_headcount'; END IF;
  IF p_base_rate IS NOT NULL AND p_base_rate <= 0 THEN RAISE EXCEPTION 'invalid_rate'; END IF;
  IF p_base_rate IS NULL AND v_status IN ('open', 'closed') THEN RAISE EXCEPTION 'missing_rates'; END IF;
  IF p_bill_to_client IS NOT NULL AND p_bill_to_client < 0 THEN RAISE EXCEPTION 'invalid_value'; END IF;

  IF p_role_id IS NULL THEN
    IF p_bill_to_client IS NOT NULL AND v_role <> 'admin' THEN
      RAISE EXCEPTION 'forbidden_column: bill_to_client' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client)
    VALUES (p_event_id, btrim(p_role_name), p_headcount, p_start_time, p_end_time, p_base_rate, COALESCE(p_bill_to_client, 0))
    RETURNING * INTO v_r;
    RETURN v_r;
  END IF;

  SELECT * INTO v_r FROM public.event_roles r WHERE r.id = p_role_id AND r.event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_role_not_found'; END IF;
  IF p_bill_to_client IS NOT NULL AND p_bill_to_client IS DISTINCT FROM v_r.bill_to_client AND v_role <> 'admin' THEN
    RAISE EXCEPTION 'forbidden_column: bill_to_client' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_occupied FROM public.event_registrations g
   WHERE g.event_role_id = p_role_id AND g.status IN ('pending', 'approved');
  IF p_headcount < v_occupied THEN RAISE EXCEPTION 'headcount_below_occupied'; END IF;

  IF (p_start_time IS DISTINCT FROM v_r.start_time OR p_end_time IS DISTINCT FROM v_r.end_time)
     AND EXISTS (SELECT 1 FROM public.shift_hour_submissions s
                   JOIN public.event_registrations g ON g.id = s.registration_id
                  WHERE g.event_role_id = p_role_id AND s.voided_at IS NULL AND s.status IN ('pending', 'approved')) THEN
    RAISE EXCEPTION 'event_has_hours';
  END IF;

  UPDATE public.event_roles r
     SET role_name = btrim(p_role_name), headcount = p_headcount, start_time = p_start_time, end_time = p_end_time,
         base_rate = p_base_rate, bill_to_client = COALESCE(p_bill_to_client, r.bill_to_client)
   WHERE r.id = p_role_id
  RETURNING * INTO v_r;

  -- capacity grew: promote the oldest waitlisted to pending (same rule as auto_promote_from_waitlist)
  IF p_headcount > v_occupied THEN
    UPDATE public.event_registrations g SET status = 'pending'
     WHERE g.id IN (SELECT w.id FROM public.event_registrations w
                     WHERE w.event_role_id = p_role_id AND w.status = 'waitlisted'
                     ORDER BY w.created_at ASC, w.id
                     LIMIT (p_headcount - v_occupied)
                     FOR UPDATE SKIP LOCKED);
  END IF;
  RETURN v_r;
END;
$function$;
REVOKE ALL ON FUNCTION public.upsert_event_role(uuid, uuid, text, int, time, time, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_event_role(uuid, uuid, text, int, time, time, numeric, numeric) TO authenticated, service_role;

-- ===== E3: remove_event_role - only a role with no registrations at all, never the last role =====
CREATE OR REPLACE FUNCTION public.remove_event_role(p_role_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_event uuid;
  v_status text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  SELECT r.event_id INTO v_event FROM public.event_roles r WHERE r.id = p_role_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_role_not_found'; END IF;
  SELECT e.status INTO v_status FROM public.events e WHERE e.id = v_event FOR UPDATE;
  IF NOT public.app_can_manage_event(v_event) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  IF v_status NOT IN ('pending_rates', 'open', 'closed') THEN RAISE EXCEPTION 'event_not_editable'; END IF;
  PERFORM 1 FROM public.event_roles r WHERE r.id = p_role_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.event_registrations g WHERE g.event_role_id = p_role_id) THEN
    RAISE EXCEPTION 'role_has_registrations';
  END IF;
  IF (SELECT count(*) FROM public.event_roles r WHERE r.event_id = v_event) <= 1 THEN RAISE EXCEPTION 'last_role'; END IF;
  DELETE FROM public.event_roles r WHERE r.id = p_role_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.remove_event_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_event_role(uuid) TO authenticated, service_role;

-- ===== Rollback (owner, SQL Editor; nothing else depends on these functions) =====
-- DROP FUNCTION IF EXISTS public.remove_event_role(uuid);
-- DROP FUNCTION IF EXISTS public.upsert_event_role(uuid, uuid, text, int, time, time, numeric, numeric);
-- DROP FUNCTION IF EXISTS public.update_event_details(uuid, jsonb);
-- DROP FUNCTION IF EXISTS public.list_staff_recruiters();
