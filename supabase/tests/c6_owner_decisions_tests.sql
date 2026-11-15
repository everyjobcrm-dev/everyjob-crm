-- C6a behavior test (O2): register_for_event_role refuses employees whose account is not approved; staff and
-- staff scheduling unaffected. Same harness as b2; everything rolls back ('C6_TEST_RESULTS'). No DROP.
-- Run AFTER supabase/pending/20261115140000_c6a_block_unapproved_self_registration.sql.
-- Afterwards verify: SELECT count(*) FROM auth.users WHERE email LIKE 'c6test%'; -> 0
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
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c6test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'C6', 'tz', pg_temp.tz(31433000 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((42000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role,
           approval_status = CASE rec.id WHEN E2 THEN 'pending' WHEN E3 THEN 'rejected' WHEN M THEN 'pending' ELSE 'approved' END
     WHERE id = rec.id;
  END LOOP;
  INSERT INTO public.clients (name) VALUES ('C6 test client ' || gen_random_uuid()) RETURNING id INTO C1;
  INSERT INTO public.events (client_id, event_date, start_time, location, status) VALUES (C1, '2031-09-10', '08:00', 'C6 EV1', 'open') RETURNING id INTO EV1;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EV1, 'R', 5, '08:00', 40) RETURNING id INTO R1;

  v_res := v_res || pg_temp.t('approved employee registers -> pending', E1, format('SELECT (public.register_for_event_role(%L)).status::text', R1), 'ok', 'pending');
  v_res := v_res || pg_temp.t('pending employee refused', E2, format('SELECT (public.register_for_event_role(%L)).status::text', R1), 'account_not_approved');
  v_res := v_res || pg_temp.t('rejected employee refused', E3, format('SELECT (public.register_for_event_role(%L)).status::text', R1), 'account_not_approved');
  v_res := v_res || pg_temp.t('staff-as-worker not affected (manager, approval pending) -> approved', M, format('SELECT (public.register_for_event_role(%L)).status::text', R1), 'ok', 'approved');
  UPDATE public.profiles SET approval_status = 'approved' WHERE id = E2;
  v_res := v_res || pg_temp.t('after approval the employee registers', E2, format('SELECT (public.register_for_event_role(%L)).status::text', R1), 'ok', 'pending');
  v_res := v_res || pg_temp.t('staff can still schedule a rejected employee', M,
     format('SELECT count(*)::text FROM public.schedule_employee(p_event_role_id => %L::uuid, p_employee_id => %L::uuid)', R1, E3), 'ok', '1');

  RAISE EXCEPTION 'C6_TEST_RESULTS %', v_res::text;
END $do$;
