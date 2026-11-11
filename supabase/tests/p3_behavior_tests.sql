-- Phase 3 behavior tests (M7p-M7t, M0d). Run in the SQL Editor or via execute_sql.
-- Fixtures are created inside ONE DO block; every assertion runs impersonated (SET LOCAL ROLE authenticated + request.jwt.claims).
-- The block always ends with RAISE EXCEPTION 'P3_TEST_RESULTS ...', so the whole transaction rolls back and nothing persists.
-- Read the PASS/FAIL JSON from the error message. Afterwards verify: SELECT count(*) FROM auth.users WHERE email LIKE 'p3test%'; -> 0
DO $do$
DECLARE
  v_res jsonb := '[]'::jsonb;
  rec record;
  A uuid := gen_random_uuid(); M uuid := gen_random_uuid(); R1 uuid := gen_random_uuid(); R2 uuid := gen_random_uuid();
  E1 uuid := gen_random_uuid(); E2 uuid := gen_random_uuid(); E3 uuid := gen_random_uuid(); E4 uuid := gen_random_uuid();
  E5 uuid := gen_random_uuid(); E6 uuid := gen_random_uuid(); U uuid := gen_random_uuid();
  C uuid; EV1 uuid; EV2 uuid; EVX uuid; EVP uuid; RA uuid; RB uuid; RC uuid; RX uuid; RP uuid;
  rE1 uuid; rE5 uuid; rR1 uuid; rM uuid; rE2p uuid; rE2 uuid; rE3 uuid; rE6 uuid; rU uuid; rE1c uuid; rE4 uuid;
  n int := 0; v_expected int; b boolean;
BEGIN
  -- helper: run p_sql as an impersonated authenticated user inside a subtransaction; record PASS/FAIL
  EXECUTE $f$
  CREATE FUNCTION pg_temp.t(p_name text, p_uid uuid, p_sql text, p_expect text, p_val text DEFAULT NULL) RETURNS jsonb
  LANGUAGE plpgsql AS $b$
  DECLARE v_out text; v_err text; v_ok boolean;
  BEGIN
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
      PERFORM set_config('request.jwt.claim.sub', p_uid::text, true);
      EXECUTE 'SET LOCAL ROLE authenticated';
      EXECUTE p_sql INTO v_out;
      EXECUTE 'RESET ROLE';
    EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
    END;
    EXECUTE 'RESET ROLE';
    v_ok := CASE WHEN p_expect = 'ok' THEN v_err IS NULL AND (p_val IS NULL OR v_out IS NOT DISTINCT FROM p_val)
                 ELSE v_err LIKE '%' || p_expect || '%' END;
    RETURN jsonb_build_object('t', p_name, 'r', CASE WHEN v_ok THEN 'PASS' ELSE 'FAIL' END,
                              'got', COALESCE(v_err, v_out, 'null'));
  END $b$;
  $f$;
  EXECUTE $f$
  CREATE FUNCTION pg_temp.tz(p_base int) RETURNS text LANGUAGE sql AS $b$
    SELECT d || ((10 - (SELECT sum(CASE WHEN x > 9 THEN x - 9 ELSE x END) FROM
            (SELECT substr(d, i, 1)::int * (CASE WHEN i % 2 = 0 THEN 2 ELSE 1 END) AS x FROM generate_series(1, 8) i) q)::int % 10) % 10)::text
    FROM (SELECT lpad(p_base::text, 8, '0') d) z
  $b$;
  $f$;

  -- fixtures (setup only; every assertion below runs impersonated)
  FOR rec IN SELECT * FROM (VALUES (A,'admin',false,'1980-01-01'),(M,'manager',false,'1980-01-01'),(R1,'recruiter',true,'1985-01-01'),
      (R2,'recruiter',true,'1985-01-01'),(E1,'employee',false,'1995-01-01'),(E2,'employee',false,'1995-01-01'),(E3,'employee',false,'1995-01-01'),
      (E4,'employee',false,'1995-01-01'),(E5,'employee',false,'1995-01-01'),(E6,'employee',false,'1995-01-01'),(U,'employee',false,'2010-06-01'))
      AS v(id, role, cce, bd) LOOP
    n := n + 1;
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p3test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'P3', 'tz', pg_temp.tz(27182800 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((40000000 + n)::text, 8, '0'), 'birth_date', rec.bd), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role, can_create_events = rec.cce WHERE id = rec.id;
  END LOOP;

  INSERT INTO public.clients (name) VALUES ('P3 test client ' || gen_random_uuid()) RETURNING id INTO C;
  INSERT INTO public.events (client_id, event_date, location, status, min_age, min_rating, recruiter_id)
    VALUES (C, '2026-11-20', 'P3 EV1', 'open', 18, 4, R1) RETURNING id INTO EV1;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id) VALUES (C, '2026-11-21', 'P3 EV2', 'open', R2) RETURNING id INTO EV2;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id) VALUES (C, '2026-11-22', 'P3 EVX', 'open', R1) RETURNING id INTO EVX;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id) VALUES (C, '2026-09-15', 'P3 EVP', 'closed', R1) RETURNING id INTO EVP;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EV1, 'RA', 2, '10:00', 50) RETURNING id INTO RA;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EV1, 'RB', 1, '12:00', 50) RETURNING id INTO RB;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EV2, 'RC', 1, '10:00', 50) RETURNING id INTO RC;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVX, 'RX', 3, '10:00', 50) RETURNING id INTO RX;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVP, 'RP', 5, '10:00', 50) RETURNING id INTO RP;
  UPDATE public.events SET status = 'cancelled' WHERE id = EVX;

  -- ===== M7p schedule_employee =====
  v_res := v_res || pg_temp.t('M7p recruiter on other recruiter''s event', R1, format('SELECT registration_id::text FROM public.schedule_employee(%L,%L)', RC, E1), 'not_authorized');
  v_res := v_res || pg_temp.t('M7p recruiter own event -> approved (+below_min_rating warning)', R1,
     format('SELECT array_to_string(warnings, '','') FROM public.schedule_employee(%L,%L)', RA, E1), 'ok', 'below_min_rating');
  SELECT id INTO rE1 FROM public.event_registrations WHERE event_id = EV1 AND user_id = E1;
  v_res := v_res || pg_temp.t('M7p under-18 on min_age event', R1, format('SELECT registration_id::text FROM public.schedule_employee(%L,%L)', RA, U), 'not_eligible: age');
  v_res := v_res || pg_temp.t('M7p fill RB (headcount 1)', R1, format('SELECT registration_id::text FROM public.schedule_employee(%L,%L)', RB, E2), 'ok');
  v_res := v_res || pg_temp.t('M7p full role', R1, format('SELECT registration_id::text FROM public.schedule_employee(%L,%L)', RB, E3), 'event_role_full');
  v_res := v_res || pg_temp.t('M7p cancelled event', R1, format('SELECT registration_id::text FROM public.schedule_employee(%L,%L)', RX, E1), 'event_cancelled');
  v_res := v_res || pg_temp.t('M7p self', R1, format('SELECT registration_id::text FROM public.schedule_employee(%L,%L)', RA, R1), 'not_own_registration');
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EV1, RA, E4, 'rejected') RETURNING id INTO rE4;
  v_res := v_res || pg_temp.t('M7p rejected row', R1, format('SELECT registration_id::text FROM public.schedule_employee(%L,%L)', RA, E4), 'employee_already_registered');
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate, rate_set_by, rate_set_at, cancellation_requested_at, created_by, created_at)
    VALUES (EV1, RB, E5, 'removed', 40, A, now(), now(), E5, now() - interval '3 days') RETURNING id INTO rE5;
  v_res := v_res || pg_temp.t('M7p removed row revived', R1, format('SELECT registration_id::text FROM public.schedule_employee(%L,%L)', RA, E5), 'ok', rE5::text);
  SELECT (r.status = 'approved' AND r.event_role_id = RA AND r.wage_rate IS NULL AND r.rate_set_by IS NULL AND r.rate_set_at IS NULL
          AND r.cancellation_requested_at IS NULL AND r.created_by = R1
          AND EXISTS (SELECT 1 FROM public.registration_status_history h WHERE h.registration_id = rE5 AND h.action = 'organizer_readded'
                      AND h.from_status = 'removed' AND h.to_status = 'approved' AND h.actor_id = R1))
    INTO b FROM public.event_registrations r WHERE r.id = rE5;
  v_res := v_res || jsonb_build_object('t', 'M7p revive resets staff columns + history organizer_readded', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  -- ===== M7q remove_scheduled_employee =====
  v_res := v_res || pg_temp.t('M7q empty reason', R1, format('SELECT public.remove_scheduled_employee(%L, %L)::text', rE1, '  '), 'reason_required');
  SELECT id INTO rE2 FROM public.event_registrations WHERE event_id = EV1 AND user_id = E2;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_at) VALUES (EV1, RB, E3, 'waitlisted', now() - interval '2 hours') RETURNING id INTO rE3;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_at) VALUES (EV1, RB, E6, 'waitlisted', now() - interval '1 hour') RETURNING id INTO rE6;
  v_res := v_res || pg_temp.t('M7q other recruiter', R2, format('SELECT public.remove_scheduled_employee(%L, %L)::text', rE2, 'x'), 'not_authorized');
  v_res := v_res || pg_temp.t('M7q remove approved', R1, format('SELECT public.remove_scheduled_employee(%L, %L)::text', rE2, 'לא הגיע לתדריך'), 'ok');
  SELECT (SELECT status FROM public.event_registrations WHERE id = rE2) = 'removed'
     AND (SELECT status FROM public.event_registrations WHERE id = rE3) = 'pending'
     AND (SELECT status FROM public.event_registrations WHERE id = rE6) = 'waitlisted'
     AND EXISTS (SELECT 1 FROM public.registration_status_history h WHERE h.registration_id = rE2 AND h.action = 'organizer_removed' AND h.reason = 'לא הגיע לתדריך')
    INTO b;
  v_res := v_res || jsonb_build_object('t', 'M7q removed + oldest waitlisted -> pending (FIFO) + history', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EV1, RA, R1, 'waitlisted') RETURNING id INTO rR1;
  v_res := v_res || pg_temp.t('M7q self', R1, format('SELECT public.remove_scheduled_employee(%L, %L)::text', rR1, 'x'), 'not_own_registration');

  -- ===== M7r staff_transition_registration =====
  v_res := v_res || pg_temp.t('M7r invalid action', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE3, 'nuke'), 'invalid_action');
  v_res := v_res || pg_temp.t('M7r other recruiter', R2, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE3, 'approve'), 'not_authorized');
  v_res := v_res || pg_temp.t('M7r self', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rR1, 'promote'), 'not_own_registration');
  v_res := v_res || pg_temp.t('M7r approve waitlisted (refused)', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE6, 'approve'), 'invalid_registration_transition');
  v_res := v_res || pg_temp.t('M7r approve pending', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE3, 'approve'), 'ok', 'approved');
  v_res := v_res || pg_temp.t('M7r promote when full', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE6, 'promote'), 'event_role_full');
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_at) VALUES (EV1, RB, U, 'waitlisted', now()) RETURNING id INTO rU;
  UPDATE public.event_registrations SET cancellation_requested_at = now() WHERE id = rE3;
  v_res := v_res || pg_temp.t('M7r approve_cancellation', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE3, 'approve_cancellation'), 'ok', 'cancelled');
  SELECT (SELECT status FROM public.event_registrations WHERE id = rE6) = 'pending'
     AND (SELECT status FROM public.event_registrations WHERE id = rU) = 'waitlisted'
     AND (SELECT cancellation_requested_at IS NOT NULL FROM public.event_registrations WHERE id = rE3)
    INTO b;
  v_res := v_res || jsonb_build_object('t', 'M7r approve_cancellation promotes next waitlisted FIFO', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('M7r dismiss on cancelled row', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE3, 'dismiss_cancellation'), 'registration_not_active');
  UPDATE public.event_registrations SET cancellation_requested_at = now() WHERE id = rE6;
  v_res := v_res || pg_temp.t('M7r approve with open request', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE6, 'approve'), 'cancellation_pending');
  v_res := v_res || pg_temp.t('M7r dismiss_cancellation', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE6, 'dismiss_cancellation'), 'ok', 'pending');
  SELECT (SELECT cancellation_requested_at IS NULL FROM public.event_registrations WHERE id = rE6)
     AND EXISTS (SELECT 1 FROM public.registration_status_history h WHERE h.registration_id = rE6 AND h.action = 'organizer_dismissed_cancellation')
    INTO b;
  v_res := v_res || jsonb_build_object('t', 'M7r dismiss clears request + history', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('M7r dismiss without request', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE1, 'dismiss_cancellation'), 'no_cancellation_request');
  v_res := v_res || pg_temp.t('M7r approve_cancellation without request', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE1, 'approve_cancellation'), 'no_cancellation_request');
  v_res := v_res || pg_temp.t('M7r reject approved (refused)', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE1, 'reject'), 'invalid_registration_transition');
  v_res := v_res || pg_temp.t('M7r reject pending', R1, format('SELECT (public.staff_transition_registration(%L, %L, %L)).status::text', rE6, 'reject', 'לא מתאים'), 'ok', 'rejected');
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EV2, RC, E1, 'waitlisted') RETURNING id INTO rE1c;
  v_res := v_res || pg_temp.t('M7r manager promote on any event (capacity free)', M, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE1c, 'promote'), 'ok', 'approved');
  v_res := v_res || pg_temp.t('M7r promote non-waitlisted (refused)', M, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE1c, 'promote'), 'invalid_registration_transition');

  -- ===== M7s get_event_roster =====
  UPDATE public.event_registrations SET wage_rate = 55, rate_set_by = A, rate_set_at = now() WHERE id = rE1;
  INSERT INTO public.shift_hour_submissions (registration_id, employee_id, event_id, reported_start, reported_end, reported_hours, submitted_by, status, voided_at, voided_by, void_reason)
    VALUES (rE1, E1, EV1, '2026-11-20 10:00+02', '2026-11-20 14:00+02', 4, M, 'pending', now(), A, 'p3 test');
  INSERT INTO public.shift_hour_submissions (registration_id, employee_id, event_id, reported_start, reported_end, reported_hours, submitted_by, status)
    VALUES (rE5, E5, EV1, '2026-11-20 10:00+02', '2026-11-20 15:00+02', 5, M, 'pending');
  v_res := v_res || pg_temp.t('M7s recruiter own event: rows, rates hidden', R1,
     'SELECT (count(*) > 0 AND count(wage_rate) = 0 AND count(rate_set_at) = 0)::text FROM public.get_event_roster(''' || EV1 || ''')', 'ok', 'true');
  v_res := v_res || pg_temp.t('M7s recruiter other event', R1, format('SELECT count(*)::text FROM public.get_event_roster(%L)', EV2), 'not_authorized');
  v_res := v_res || pg_temp.t('M7s employee', E1, format('SELECT count(*)::text FROM public.get_event_roster(%L)', EV1), 'not_authorized');
  v_res := v_res || pg_temp.t('M7s admin sees rates', A, format('SELECT count(wage_rate)::text FROM public.get_event_roster(%L)', EV1), 'ok', '1');
  v_res := v_res || pg_temp.t('M7s voided submission ignored, one row', R1,
     format('SELECT count(*) || '':'' || count(submission_id) FROM public.get_event_roster(%L) WHERE registration_id = %L', EV1, rE1), 'ok', '1:0');
  v_res := v_res || pg_temp.t('M7s live submission, one row', R1,
     format('SELECT count(*) || '':'' || count(submission_id) FROM public.get_event_roster(%L) WHERE registration_id = %L', EV1, rE5), 'ok', '1:1');
  SELECT count(*) INTO v_expected FROM public.event_registrations WHERE event_id = EV1;  -- reference count outside RLS
  v_res := v_res || pg_temp.t('M7s one row per registration', M,
     format('SELECT (count(*) = count(DISTINCT registration_id) AND count(*) = %s)::text FROM public.get_event_roster(%L)', v_expected, EV1), 'ok', 'true');
  SELECT pg_get_function_result('public.get_event_roster(uuid)'::regprocedure) !~* '(\mtz\M|email|document|bank)' INTO b;
  v_res := v_res || jsonb_build_object('t', 'M7s result columns: no tz/email/documents', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  -- ===== M7t set_registration_wage_rate =====
  v_res := v_res || pg_temp.t('M7t recruiter', R1, format('SELECT (public.set_registration_wage_rate(%L, 50)).wage_rate::text', rE1), 'not_authorized');
  v_res := v_res || pg_temp.t('M7t helper 2026-09-30 -> 2026-10-10', M, 'SELECT public.app_manager_rate_deadline(''2026-09-30'')::text', 'ok', '2026-10-10');
  v_res := v_res || pg_temp.t('M7t helper 2026-12-15 -> 2027-01-10', M, 'SELECT public.app_manager_rate_deadline(''2026-12-15'')::text', 'ok', '2027-01-10');
  v_res := v_res || pg_temp.t('M7t boundary: 10th allowed, 11th refused', M,
     'SELECT (NOT (''2026-10-10''::date > public.app_manager_rate_deadline(''2026-09-30'')) AND (''2026-10-11''::date > public.app_manager_rate_deadline(''2026-09-30'')))::text', 'ok', 'true');
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVP, RP, E2, 'approved') RETURNING id INTO rE2p;
  v_res := v_res || pg_temp.t('M7t manager after deadline (event 2026-09-15)', M, format('SELECT (public.set_registration_wage_rate(%L, 60)).wage_rate::text', rE2p), 'rate_window_closed');
  v_res := v_res || pg_temp.t('M7t admin same event', A, format('SELECT ((public.set_registration_wage_rate(%L, 60)).wage_rate = 60)::text', rE2p), 'ok', 'true');
  SELECT EXISTS (SELECT 1 FROM public.registration_status_history h JOIN public.event_registrations r ON r.id = h.registration_id
                 WHERE h.registration_id = rE2p AND h.action = 'rate_set' AND h.actor_id = A AND r.rate_set_by = A AND r.rate_set_at IS NOT NULL) INTO b;
  v_res := v_res || jsonb_build_object('t', 'M7t history rate_set + rate_set_by/at', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('M7t manager within window', M, format('SELECT ((public.set_registration_wage_rate(%L, 45.5)).wage_rate = 45.5)::text', rE1), 'ok', 'true');
  v_res := v_res || pg_temp.t('M7t non-approved row', M, format('SELECT (public.set_registration_wage_rate(%L, 50)).wage_rate::text', rE6), 'registration_not_approved');
  v_res := v_res || pg_temp.t('M7t rate 0', M, format('SELECT (public.set_registration_wage_rate(%L, 0)).wage_rate::text', rE1), 'invalid_rate');
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EV1, RA, M, 'approved') RETURNING id INTO rM;
  v_res := v_res || pg_temp.t('M7t own registration', M, format('SELECT (public.set_registration_wage_rate(%L, 50)).wage_rate::text', rM), 'not_own_registration');
  v_res := v_res || pg_temp.t('M7t employee', E1, format('SELECT (public.set_registration_wage_rate(%L, 50)).wage_rate::text', rE1), 'not_authorized');

  -- ===== grants: anon cannot call any new RPC or read the fill views =====
  SELECT NOT has_function_privilege('anon', 'public.staff_transition_registration(uuid,text,text)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.get_event_roster(uuid)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.set_registration_wage_rate(uuid,numeric)', 'EXECUTE')
     AND NOT has_table_privilege('anon', 'public.event_role_fill_counts', 'SELECT') INTO b;
  v_res := v_res || jsonb_build_object('t', 'anon has no EXECUTE / SELECT', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  -- always roll back: the whole DO block aborts, so nothing above persists
  RAISE EXCEPTION 'P3_TEST_RESULTS %', v_res::text;
END $do$;
