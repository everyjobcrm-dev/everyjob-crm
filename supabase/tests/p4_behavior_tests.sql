-- Phase 4 behavior tests (M7u, M7v, M8, M8b; M8v2 self-withdraw added 2026-10-14). Run in the SQL Editor or via execute_sql.
-- Fixtures are created inside ONE DO block; every assertion runs impersonated (SET LOCAL ROLE authenticated + request.jwt.claims).
-- The block always ends with RAISE EXCEPTION 'P4_TEST_RESULTS ...', so the whole transaction rolls back and nothing persists.
-- Afterwards verify: SELECT count(*) FROM auth.users WHERE email LIKE 'p4test%'; -> 0
DO $do$
DECLARE
  v_res jsonb := '[]'::jsonb; rec record; n int := 0; b boolean;
  M uuid := gen_random_uuid(); R1 uuid := gen_random_uuid(); R2 uuid := gen_random_uuid();
  E1 uuid := gen_random_uuid(); E2 uuid := gen_random_uuid(); E3 uuid := gen_random_uuid();
  E4 uuid := gen_random_uuid(); E5 uuid := gen_random_uuid(); E6 uuid := gen_random_uuid(); E7 uuid := gen_random_uuid(); E8 uuid := gen_random_uuid();
  EVW uuid; EVA uuid; EVWX uuid; EVWP uuid; RW uuid; RAA uuid; RWX uuid; RWP uuid;
  wE4 uuid; wE5 uuid; wE6 uuid; wE7 uuid; aE8 uuid; aM uuid; xE4 uuid; pE4 uuid;
  C uuid; EV1 uuid; EV2 uuid; EVC uuid; EVX uuid; EVP uuid; RA uuid; RB uuid; RC uuid; RX uuid; RP uuid;
  rE1 uuid; rE2 uuid; rE3 uuid; rE1c uuid; rE1x uuid; rE1p uuid; rE2c uuid; rE1b uuid;
BEGIN
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
    RETURN jsonb_build_object('t', p_name, 'r', CASE WHEN v_ok THEN 'PASS' ELSE 'FAIL' END, 'got', COALESCE(v_err, v_out, 'null'));
  END $b$;
  $f$;
  EXECUTE $f$
  CREATE FUNCTION pg_temp.tz(p_base int) RETURNS text LANGUAGE sql AS $b$
    SELECT d || ((10 - (SELECT sum(CASE WHEN x > 9 THEN x - 9 ELSE x END) FROM
            (SELECT substr(d, i, 1)::int * (CASE WHEN i % 2 = 0 THEN 2 ELSE 1 END) AS x FROM generate_series(1, 8) i) q)::int % 10) % 10)::text
    FROM (SELECT lpad(p_base::text, 8, '0') d) z
  $b$;
  $f$;

  FOR rec IN SELECT * FROM (VALUES (M,'manager'),(R1,'recruiter'),(R2,'recruiter'),(E1,'employee'),(E2,'employee'),(E3,'employee'),
                                     (E4,'employee'),(E5,'employee'),(E6,'employee'),(E7,'employee'),(E8,'employee')) AS v(id, role) LOOP
    n := n + 1;
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p4test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'P4', 'tz', pg_temp.tz(16180300 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((42000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role, can_create_events = (rec.role = 'recruiter') WHERE id = rec.id;
  END LOOP;

  INSERT INTO public.clients (name) VALUES ('P4 test client ' || gen_random_uuid()) RETURNING id INTO C;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id) VALUES (C, '2026-11-20', 'P4 EV1', 'open', R1) RETURNING id INTO EV1;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id) VALUES (C, '2026-11-21', 'P4 EV2', 'open', R2) RETURNING id INTO EV2;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id) VALUES (C, '2026-11-22', 'P4 EVC', 'closed', R1) RETURNING id INTO EVC;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id) VALUES (C, '2026-11-23', 'P4 EVX', 'open', R1) RETURNING id INTO EVX;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id) VALUES (C, '2026-10-01', 'P4 EVP', 'closed', R1) RETURNING id INTO EVP;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EV1, 'RA', 1, '10:00', 50) RETURNING id INTO RA;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EV2, 'RB', 3, '10:00', 50) RETURNING id INTO RB;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVC, 'RC', 3, '10:00', 50) RETURNING id INTO RC;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVX, 'RX', 3, '10:00', 50) RETURNING id INTO RX;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVP, 'RP', 3, '10:00', 50) RETURNING id INTO RP;

  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EV1, RA, E1, 'approved') RETURNING id INTO rE1;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_at) VALUES (EV1, RA, E2, 'waitlisted', now() - interval '2 hours') RETURNING id INTO rE2;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_at) VALUES (EV1, RA, E3, 'waitlisted', now() - interval '1 hour') RETURNING id INTO rE3;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EV2, RB, E1, 'pending') RETURNING id INTO rE1b;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVC, RC, E1, 'approved') RETURNING id INTO rE1c;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVC, RC, E2, 'rejected') RETURNING id INTO rE2c;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVX, RX, E1, 'approved') RETURNING id INTO rE1x;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVP, RP, E1, 'approved') RETURNING id INTO rE1p;
  UPDATE public.events SET status = 'cancelled' WHERE id = EVX;
  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id)
    VALUES (rE1, EV1, E1, NULL, 'approved', 'p4_fixture', M), (rE1b, EV2, E1, NULL, 'pending', 'p4_fixture', M);

  -- M8v2 fixtures (separate events so the earlier checks are unaffected)
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id) VALUES (C, '2026-11-24', 'P4 EVW', 'open', R1) RETURNING id INTO EVW;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id) VALUES (C, '2026-11-25', 'P4 EVA', 'open', R1) RETURNING id INTO EVA;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id) VALUES (C, '2026-11-26', 'P4 EVWX', 'open', R1) RETURNING id INTO EVWX;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id) VALUES (C, '2026-10-02', 'P4 EVWP', 'closed', R1) RETURNING id INTO EVWP;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVW, 'RW', 1, '10:00', 50) RETURNING id INTO RW;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVA, 'RAA', 3, '10:00', 50) RETURNING id INTO RAA;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVWX, 'RWX', 3, '10:00', 50) RETURNING id INTO RWX;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVWP, 'RWP', 3, '10:00', 50) RETURNING id INTO RWP;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_at) VALUES (EVW, RW, E4, 'pending', now() - interval '4 hours') RETURNING id INTO wE4;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_at) VALUES (EVW, RW, E5, 'waitlisted', now() - interval '3 hours') RETURNING id INTO wE5;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_at) VALUES (EVW, RW, E6, 'waitlisted', now() - interval '2 hours') RETURNING id INTO wE6;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_at) VALUES (EVW, RW, E7, 'waitlisted', now() - interval '1 hour') RETURNING id INTO wE7;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVA, RAA, E8, 'approved') RETURNING id INTO aE8;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVWX, RWX, E4, 'pending') RETURNING id INTO xE4;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVWP, RWP, E4, 'pending') RETURNING id INTO pE4;
  UPDATE public.events SET status = 'cancelled' WHERE id = EVWX;

  -- ===== M7u search_employees scope =====
  v_res := v_res || pg_temp.t('M7u recruiter, other recruiter''s event', R1, format('SELECT count(*)::text FROM public.search_employees(%L, %L)', 'בדיקה', EV2), 'not_authorized');
  v_res := v_res || pg_temp.t('M7u recruiter, own event', R1, format('SELECT (count(*) > 0)::text FROM public.search_employees(%L, %L)', 'בדיקה', EV1), 'ok', 'true');
  v_res := v_res || pg_temp.t('M7u manager, any event', M, format('SELECT (count(*) > 0)::text FROM public.search_employees(%L, %L)', 'בדיקה', EV2), 'ok', 'true');
  v_res := v_res || pg_temp.t('M7u employee', E1, format('SELECT count(*)::text FROM public.search_employees(%L, %L)', 'בדיקה', EV1), 'not_authorized');

  -- ===== M7v history policy =====
  v_res := v_res || pg_temp.t('M7v recruiter sees own events only (EV1:EV2)', R1,
     format('SELECT count(*) FILTER (WHERE event_id = %L) || '':'' || count(*) FILTER (WHERE event_id = %L) FROM public.registration_status_history', EV1, EV2), 'ok', '1:0');
  v_res := v_res || pg_temp.t('M7v manager sees all (EV1:EV2)', M,
     format('SELECT count(*) FILTER (WHERE event_id = %L) || '':'' || count(*) FILTER (WHERE event_id = %L) FROM public.registration_status_history', EV1, EV2), 'ok', '1:1');
  v_res := v_res || pg_temp.t('M7v employee sees 0', E1,
     format('SELECT count(*)::text FROM public.registration_status_history WHERE event_id IN (%L, %L)', EV1, EV2), 'ok', '0');

  -- ===== M8 request_registration_cancellation =====
  v_res := v_res || pg_temp.t('M8 someone else''s row', E2, format('SELECT (public.request_registration_cancellation(%L)).id::text', rE1), 'registration_not_found');
  v_res := v_res || pg_temp.t('M8 own active row', E1, format('SELECT (public.request_registration_cancellation(%L, %L)).cancellation_requested_at IS NOT NULL', rE1, 'מחלה'), 'ok', 'true');
  SELECT EXISTS (SELECT 1 FROM public.registration_status_history h WHERE h.registration_id = rE1 AND h.action = 'cancellation_requested'
                 AND h.actor_id = E1 AND h.from_status = 'approved' AND h.to_status = 'approved' AND h.reason = 'מחלה')
     AND (SELECT status FROM public.event_registrations WHERE id = rE1) = 'approved' INTO b;
  v_res := v_res || jsonb_build_object('t', 'M8 history cancellation_requested, status unchanged', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('M8 second request', E1, format('SELECT (public.request_registration_cancellation(%L)).id::text', rE1), 'cancellation_already_requested');
  v_res := v_res || pg_temp.t('M8 closed event -> ok', E1, format('SELECT (public.request_registration_cancellation(%L)).cancellation_requested_at IS NOT NULL', rE1c), 'ok', 'true');
  v_res := v_res || pg_temp.t('M8 cancelled event', E1, format('SELECT (public.request_registration_cancellation(%L)).id::text', rE1x), 'event_cancelled');
  v_res := v_res || pg_temp.t('M8 past event', E1, format('SELECT (public.request_registration_cancellation(%L)).id::text', rE1p), 'event_past');
  v_res := v_res || pg_temp.t('M8 rejected row', E2, format('SELECT (public.request_registration_cancellation(%L)).id::text', rE2c), 'registration_not_active');
  v_res := v_res || pg_temp.t('M8 direct table write still blocked for employee', E1,
     format('UPDATE public.event_registrations SET status = %L WHERE id = %L RETURNING id::text', 'cancelled', rE1b), 'forbidden');
  v_res := v_res || pg_temp.t('M8 integration: staff approve_cancellation', R1, format('SELECT (public.staff_transition_registration(%L, %L)).status::text', rE1, 'approve_cancellation'), 'ok', 'cancelled');
  SELECT (SELECT status FROM public.event_registrations WHERE id = rE2) = 'pending'
     AND (SELECT status FROM public.event_registrations WHERE id = rE3) = 'waitlisted' INTO b;
  v_res := v_res || jsonb_build_object('t', 'M8 integration: FIFO promotion (oldest waitlisted -> pending)', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  -- ===== M8b get_staff_event_request_counts =====
  v_res := v_res || pg_temp.t('M8b recruiter: own events only, cancelled excluded (EV1 in, EV2 out, EVX out)', R1,
     format('SELECT (bool_or(event_id = %L) AND NOT bool_or(event_id = %L) AND NOT bool_or(event_id = %L))::text FROM public.get_staff_event_request_counts()', EV1, EV2, EVX), 'ok', 'true');
  v_res := v_res || pg_temp.t('M8b counts EV1 pending:waitlisted:requests', M,
     format('SELECT pending_count || '':'' || waitlisted_count || '':'' || cancellation_request_count FROM public.get_staff_event_request_counts() WHERE event_id = %L', EV1), 'ok', '1:1:0');
  v_res := v_res || pg_temp.t('M8b counts EVC (open request on closed event)', M,
     format('SELECT cancellation_request_count::text FROM public.get_staff_event_request_counts() WHERE event_id = %L', EVC), 'ok', '1');
  v_res := v_res || pg_temp.t('M8b manager: cancelled event excluded', M,
     format('SELECT count(*)::text FROM public.get_staff_event_request_counts() WHERE event_id = %L', EVX), 'ok', '0');
  v_res := v_res || pg_temp.t('M8b employee gets 0 rows', E1, 'SELECT count(*)::text FROM public.get_staff_event_request_counts()', 'ok', '0');

  -- ===== M8v2 self-withdraw (pending/waitlisted cancel immediately; approved stays a request) =====
  v_res := v_res || pg_temp.t('M8v2 pending: withdraw -> cancelled immediately', E4, format('SELECT (public.request_registration_cancellation(%L)).status::text', wE4), 'ok', 'cancelled');
  SELECT EXISTS (SELECT 1 FROM public.registration_status_history h WHERE h.registration_id = wE4 AND h.action = 'self_withdrawn'
                 AND h.actor_id = E4 AND h.from_status = 'pending' AND h.to_status = 'cancelled' AND h.reason IS NULL)
     AND (SELECT cancellation_requested_at IS NULL FROM public.event_registrations WHERE id = wE4) INTO b;
  v_res := v_res || jsonb_build_object('t', 'M8v2 pending: history self_withdrawn, no cancellation_requested_at', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  SELECT (SELECT status FROM public.event_registrations WHERE id = wE5) = 'pending'
     AND (SELECT status FROM public.event_registrations WHERE id = wE6) = 'waitlisted'
     AND (SELECT status FROM public.event_registrations WHERE id = wE7) = 'waitlisted' INTO b;
  v_res := v_res || jsonb_build_object('t', 'M8v2 pending: FIFO promotion (oldest waitlisted -> pending, others stay)', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('M8v2 waitlisted: withdraw -> cancelled', E6, format('SELECT (public.request_registration_cancellation(%L, %L)).status::text', wE6, '  '), 'ok', 'cancelled');
  SELECT (SELECT status FROM public.event_registrations WHERE id = wE5) = 'pending'
     AND (SELECT status FROM public.event_registrations WHERE id = wE7) = 'waitlisted'
     AND (SELECT count(*) FROM public.event_registrations WHERE event_role_id = RW AND status IN ('pending', 'approved')) = 1
     AND EXISTS (SELECT 1 FROM public.registration_status_history h WHERE h.registration_id = wE6 AND h.action = 'self_withdrawn'
                 AND h.from_status = 'waitlisted' AND h.to_status = 'cancelled' AND h.reason IS NULL) INTO b;
  v_res := v_res || jsonb_build_object('t', 'M8v2 waitlisted: no promotion, history self_withdrawn', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('M8v2 approved: still a request (timestamp set, status approved)', E8,
     format('SELECT r.status::text || '':'' || (r.cancellation_requested_at IS NOT NULL)::text FROM public.request_registration_cancellation(%L, %L) r', aE8, 'מילואים'), 'ok', 'approved:true');
  SELECT EXISTS (SELECT 1 FROM public.registration_status_history h WHERE h.registration_id = aE8 AND h.action = 'cancellation_requested'
                 AND h.from_status = 'approved' AND h.to_status = 'approved' AND h.reason = 'מילואים')
     AND NOT EXISTS (SELECT 1 FROM public.registration_status_history h WHERE h.registration_id = aE8 AND h.action = 'self_withdrawn') INTO b;
  v_res := v_res || jsonb_build_object('t', 'M8v2 approved: history cancellation_requested', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('M8v2 approved: second call', E8, format('SELECT (public.request_registration_cancellation(%L)).id::text', aE8), 'cancellation_already_requested');
  v_res := v_res || pg_temp.t('M8v2 re-register after withdraw, role full -> waitlisted', E4, format('SELECT (public.register_for_event_role(%L)).status::text', RW), 'ok', 'waitlisted');
  SELECT (SELECT id FROM public.event_registrations WHERE event_role_id = RW AND status = 'waitlisted' ORDER BY created_at DESC LIMIT 1) = wE4
     AND (SELECT cancellation_requested_at IS NULL FROM public.event_registrations WHERE id = wE4) INTO b;
  v_res := v_res || jsonb_build_object('t', 'M8v2 re-register: same row revived at the back of the waitlist', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('M8v2 pending withdraw (EV2, role has capacity)', E1, format('SELECT (public.request_registration_cancellation(%L)).status::text', rE1b), 'ok', 'cancelled');
  v_res := v_res || pg_temp.t('M8v2 re-register with capacity -> pending (same row)', E1, format('SELECT r.status::text || '':'' || (r.id = %L)::text FROM public.register_for_event_role(%L) r', rE1b, RB), 'ok', 'pending:true');
  v_res := v_res || pg_temp.t('M8v2 someone else''s row', E8, format('SELECT (public.request_registration_cancellation(%L)).id::text', wE5), 'registration_not_found');
  v_res := v_res || pg_temp.t('M8v2 pending on cancelled event', E4, format('SELECT (public.request_registration_cancellation(%L)).id::text', xE4), 'event_cancelled');
  v_res := v_res || pg_temp.t('M8v2 pending on past event', E4, format('SELECT (public.request_registration_cancellation(%L)).id::text', pE4), 'event_past');
  v_res := v_res || pg_temp.t('M8v2 staff-as-worker registers -> approved (auto)', M, format('SELECT (public.register_for_event_role(%L)).status::text', RAA), 'ok', 'approved');
  SELECT id INTO aM FROM public.event_registrations WHERE event_id = EVA AND user_id = M;
  v_res := v_res || pg_temp.t('M8v2 staff-as-worker: request path (status approved, timestamp set)', M,
     format('SELECT r.status::text || '':'' || (r.cancellation_requested_at IS NOT NULL)::text FROM public.request_registration_cancellation(%L) r', aM), 'ok', 'approved:true');
  SELECT EXISTS (SELECT 1 FROM public.registration_status_history h WHERE h.registration_id = aM AND h.action = 'cancellation_requested') INTO b;
  v_res := v_res || jsonb_build_object('t', 'M8v2 staff-as-worker: history cancellation_requested', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  SELECT NOT has_function_privilege('anon', 'public.request_registration_cancellation(uuid,text)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.get_staff_event_request_counts()', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.search_employees(text,uuid)', 'EXECUTE') INTO b;
  v_res := v_res || jsonb_build_object('t', 'anon has no EXECUTE on M7u/M8/M8b', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  RAISE EXCEPTION 'P4_TEST_RESULTS %', v_res::text;
END $do$;
