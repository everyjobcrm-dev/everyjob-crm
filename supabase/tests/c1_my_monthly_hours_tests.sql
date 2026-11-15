-- C1 behavior test: v_my_monthly_hours estimated pay uses legal overtime (8h x1, 2h x1.25, rest x1.5).
-- Same harness as b2; everything rolls back ('C1_TEST_RESULTS'). No DROP.
-- Run AFTER supabase/pending/20261115100000_c1_my_monthly_hours_overtime.sql.
-- Afterwards verify: SELECT count(*) FROM auth.users WHERE email LIKE 'c1test%'; -> 0
DO $do$
DECLARE
  v_res jsonb := '[]'::jsonb; rec record; n int := 0; b boolean;
  A uuid := gen_random_uuid(); M uuid := gen_random_uuid(); E1 uuid := gen_random_uuid(); E2 uuid := gen_random_uuid();
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

  FOR rec IN SELECT * FROM (VALUES (A,'admin'),(M,'manager'),(E1,'employee'),(E2,'employee')) AS v(id, role) LOOP
    n := n + 1;
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c1test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'C1', 'tz', pg_temp.tz(31421000 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((48000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role WHERE id = rec.id;
  END LOOP;

  INSERT INTO public.clients (name) VALUES ('C1 test client ' || gen_random_uuid()) RETURNING id INTO C1;
  INSERT INTO public.events (client_id, event_date, start_time, location, status) VALUES (C1, '2031-05-10', '08:00', 'C1 EV1', 'closed') RETURNING id INTO EV1;
  INSERT INTO public.events (client_id, event_date, start_time, location, status) VALUES (C1, '2031-05-11', '08:00', 'C1 EV2', 'closed') RETURNING id INTO EV2;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EV1, 'R', 5, '08:00', 40) RETURNING id INTO R1;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EV2, 'R', 5, '08:00', 40) RETURNING id INTO R2;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate) VALUES (EV1, R1, E1, 'approved', 40) RETURNING id INTO g1;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate) VALUES (EV2, R2, E1, 'approved', 40) RETURNING id INTO g2;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate) VALUES (EV1, R1, E2, 'approved', NULL) RETURNING id INTO g3;
  -- E1: 12h (8x40 + 2x50 + 2x60 = 540) + 5h (200) = 740 for 17h; E2: 3h with no rate
  INSERT INTO public.shift_hour_submissions (registration_id, reported_start, reported_end, reported_hours, submitted_by, status, reviewed_by, reviewed_at) VALUES
    (g1, '2031-05-10 08:00+03', '2031-05-10 20:00+03', 12, M, 'approved', A, now()),
    (g2, '2031-05-11 08:00+03', '2031-05-11 13:00+03', 5, M, 'approved', A, now()),
    (g3, '2031-05-10 08:00+03', '2031-05-10 11:00+03', 3, M, 'approved', A, now());

  v_res := v_res || pg_temp.t('E1 own month: 17h, pay 740 with overtime', E1,
     'SELECT approved_hours::numeric(10,2) || '':'' || estimated_pay::numeric(10,2) FROM public.v_my_monthly_hours WHERE month = ''2031-05-01''', 'ok', '17.00:740.00');
  v_res := v_res || pg_temp.t('E2 own month: no rate -> pay NULL, flagged', E2,
     'SELECT COALESCE(estimated_pay::text, ''NULL'') || '':'' || shifts_without_rate FROM public.v_my_monthly_hours WHERE month = ''2031-05-01''', 'ok', 'NULL:1');
  v_res := v_res || pg_temp.t('E1 sees only own rows', E1,
     format('SELECT count(*)::text FROM public.v_my_monthly_hours WHERE employee_id = %L', E2), 'ok', '0');
  SELECT NOT has_table_privilege('anon', 'public.v_my_monthly_hours', 'SELECT') INTO b;
  v_res := v_res || jsonb_build_object('t', 'anon has no SELECT', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  RAISE EXCEPTION 'C1_TEST_RESULTS %', v_res::text;
END $do$;
