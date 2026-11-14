-- C4 behavior test: notification triggers (registration approved/rejected/removed, event date/time change and
-- cancellation, hours approved), actor exclusion, RLS and grants. Same harness as b2; everything rolls back
-- ('C4_TEST_RESULTS'). No DROP. Run AFTER supabase/pending/20261115120000_c4_notifications_triggers.sql.
-- Afterwards verify: SELECT count(*) FROM auth.users WHERE email LIKE 'c4test%'; -> 0
DO $do$
DECLARE
  v_res jsonb := '[]'::jsonb; rec record; n int := 0; b boolean;
  A uuid := gen_random_uuid(); M uuid := gen_random_uuid(); E1 uuid := gen_random_uuid(); E2 uuid := gen_random_uuid(); E3 uuid := gen_random_uuid();
  C1 uuid; EV1 uuid; EV2 uuid; EV3 uuid; R1 uuid; R2 uuid; R3 uuid; g1 uuid; g2 uuid; g3 uuid; g4 uuid;
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

  FOR rec IN SELECT * FROM (VALUES (A,'admin'),(M,'manager'),(E1,'employee'),(E2,'employee'),(E3,'employee')) AS v(id, role) LOOP
    n := n + 1;
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c4test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'C4', 'tz', pg_temp.tz(31425000 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((46000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role, approval_status = 'approved' WHERE id = rec.id;
  END LOOP;

  INSERT INTO public.clients (name) VALUES ('C4 test client ' || gen_random_uuid()) RETURNING id INTO C1;
  INSERT INTO public.events (client_id, event_date, start_time, location, status) VALUES (C1, '2031-08-10', '08:00', 'C4 EV1', 'open') RETURNING id INTO EV1;
  INSERT INTO public.events (client_id, event_date, start_time, location, status) VALUES (C1, '2031-08-11', '08:00', 'C4 EV2', 'open') RETURNING id INTO EV2;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EV1, 'C4R', 5, '08:00', 40) RETURNING id INTO R1;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EV2, 'C4R', 5, '08:00', 40) RETURNING id INTO R2;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EV1, R1, E1, 'pending') RETURNING id INTO g1;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EV1, R1, E2, 'pending') RETURNING id INTO g2;
  -- inserted as approved with no actor -> one registration_approved row for E3 on each event
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate) VALUES (EV1, R1, E3, 'approved', 40) RETURNING id INTO g3;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EV2, R2, E3, 'approved') RETURNING id INTO g4;

  v_res := v_res || pg_temp.t('fixture: pending insert does not notify', E1, 'SELECT count(*)::text FROM public.notifications', 'ok', '0');
  v_res := v_res || pg_temp.t('manager approves E1', M,
     format('SELECT status::text FROM public.staff_transition_registration(p_registration_id => %L::uuid, p_action => ''approve'')', g1), 'ok', 'approved');
  v_res := v_res || pg_temp.t('manager rejects E2', M,
     format('SELECT status::text FROM public.staff_transition_registration(p_registration_id => %L::uuid, p_action => ''reject'')', g2), 'ok', 'rejected');
  v_res := v_res || pg_temp.t('E1 sees registration_approved with snapshot payload', E1,
     'SELECT type || '':'' || (payload->>''location'') || '':'' || (payload->>''role_name'') FROM public.notifications', 'ok', 'registration_approved:C4 EV1:C4R');
  v_res := v_res || pg_temp.t('E2 sees registration_rejected', E2, 'SELECT string_agg(type, '','') FROM public.notifications', 'ok', 'registration_rejected');
  v_res := v_res || pg_temp.t('manager removes E1', M,
     format('SELECT public.remove_scheduled_employee(p_registration_id => %L::uuid, p_reason => ''c4 test'')::text IS NOT NULL', g1), 'ok', 'true');
  v_res := v_res || pg_temp.t('E1 now has approved + removed', E1,
     'SELECT string_agg(type, '','' ORDER BY created_at, type) FROM public.notifications', 'ok', 'registration_approved,registration_removed');
  v_res := v_res || pg_temp.t('manager got nothing (actor)', M, 'SELECT count(*)::text FROM public.notifications', 'ok', '0');

  v_res := v_res || pg_temp.t('manager moves EV1 by a day', M,
     format('UPDATE public.events SET event_date = ''2031-08-12'' WHERE id = %L RETURNING id::text', EV1), 'ok', EV1::text);
  v_res := v_res || pg_temp.t('E3 (approved) gets event_time_changed with the old date', E3,
     format('SELECT string_agg(payload->>''old_event_date'', '','') FROM public.notifications WHERE type = ''event_time_changed'' AND payload->>''event_id'' = %L', EV1), 'ok', '2031-08-10');
  SELECT count(*) = 0 FROM public.notifications nn WHERE nn.type = 'event_time_changed' AND nn.user_id IN (E1, E2) INTO b;
  v_res := v_res || jsonb_build_object('t', 'removed E1 / rejected E2 get no time change', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('manager changes the role end time', M,
     format('UPDATE public.event_roles SET end_time = ''16:00'' WHERE id = %L RETURNING id::text', R1), 'ok', R1::text);
  v_res := v_res || pg_temp.t('E3 gets a role time change', E3,
     'SELECT count(*)::text FROM public.notifications WHERE type = ''event_time_changed'' AND payload ? ''role_end_time''', 'ok', '1');

  v_res := v_res || pg_temp.t('manager cancels EV2', M,
     format('UPDATE public.events SET status = ''cancelled'' WHERE id = %L RETURNING status::text', EV2), 'ok', 'cancelled');
  v_res := v_res || pg_temp.t('E3 gets event_cancelled', E3,
     format('SELECT count(*)::text FROM public.notifications WHERE type = ''event_cancelled'' AND payload->>''event_id'' = %L', EV2), 'ok', '1');

  INSERT INTO public.shift_hour_submissions (registration_id, reported_start, reported_end, reported_hours, submitted_by, status)
    VALUES (g3, '2031-08-12 08:00+03', '2031-08-12 14:00+03', 6, M, 'pending') RETURNING id INTO g4;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  UPDATE public.shift_hour_submissions SET status = 'approved', reviewed_by = A, reviewed_at = now() WHERE id = g4;
  PERFORM set_config('request.jwt.claims', '', true);
  v_res := v_res || pg_temp.t('E3 gets hours_approved with hours', E3,
     'SELECT (payload->>''hours'')::numeric::text FROM public.notifications WHERE type = ''hours_approved''', 'ok', '6');

  v_res := v_res || pg_temp.t('E3 marks own rows read', E3,
     'WITH u AS (UPDATE public.notifications SET read_at = now() RETURNING 1) SELECT (count(*) > 0)::text FROM u', 'ok', 'true');
  v_res := v_res || pg_temp.t('E3 cannot rewrite type', E3, 'UPDATE public.notifications SET type = ''x'' RETURNING 1', 'permission denied');
  v_res := v_res || pg_temp.t('E3 cannot insert', E3,
     format('INSERT INTO public.notifications (id, user_id, type, payload, created_at) VALUES (gen_random_uuid(), %L, ''x'', ''{}'', now()) RETURNING 1', E3), 'permission denied');
  v_res := v_res || pg_temp.t('E1 cannot read E3 rows', E1,
     format('SELECT count(*)::text FROM public.notifications WHERE user_id = %L', E3), 'ok', '0');
  SELECT NOT has_function_privilege('authenticated', 'public.app_notify(uuid, text, jsonb)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.app_notification_event_payload(uuid)', 'EXECUTE')
     AND NOT has_table_privilege('anon', 'public.notifications', 'SELECT') INTO b;
  v_res := v_res || jsonb_build_object('t', 'grants: helpers not callable, anon closed', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  RAISE EXCEPTION 'C4_TEST_RESULTS %', v_res::text;
END $do$;
