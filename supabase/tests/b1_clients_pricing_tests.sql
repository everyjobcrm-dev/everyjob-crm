-- B1 behavior tests: the client price list is Admin-only to read; event roles get the client price via trigger.
-- Same harness as p10b; everything rolls back ('B1_TEST_RESULTS'). No DROP.
-- Run AFTER supabase/pending/20261113100000_b1_clients_pricing_grants.sql. Afterwards verify:
--   SELECT count(*) FROM auth.users WHERE email LIKE 'b1test%'; -> 0
DO $do$
DECLARE
  v_res jsonb := '[]'::jsonb; rec record; n int := 0; b boolean;
  A uuid := gen_random_uuid(); M uuid := gen_random_uuid(); R1 uuid := gen_random_uuid(); E1 uuid := gen_random_uuid();
  C1 uuid; EV uuid; RO uuid;
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

  FOR rec IN SELECT * FROM (VALUES (A,'admin'),(M,'manager'),(R1,'recruiter'),(E1,'employee')) AS v(id, role) LOOP
    n := n + 1;
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b1test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'B1', 'tz', pg_temp.tz(31418000 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((46000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role, can_create_events = (rec.role = 'recruiter') WHERE id = rec.id;
  END LOOP;

  INSERT INTO public.clients (name, preferred_roles, min_billable_hours)
  VALUES ('B1 test client ' || gen_random_uuid(), '[{"role":" Waiter ","rate":95},{"role":"Bartender","rate":"x"}]', 4)
  RETURNING id INTO C1;
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id)
  VALUES (C1, '2026-12-01', '18:00', 'B1 EV', 'open', R1) RETURNING id INTO EV;

  -- reads
  v_res := v_res || pg_temp.t('employee reads client name', E1, format('SELECT name FROM public.clients WHERE id = %L', C1), 'ok');
  v_res := v_res || pg_temp.t('employee cannot read preferred_roles', E1, format('SELECT preferred_roles::text FROM public.clients WHERE id = %L', C1), 'permission denied');
  v_res := v_res || pg_temp.t('recruiter cannot read min_billable_hours', R1, format('SELECT min_billable_hours::text FROM public.clients WHERE id = %L', C1), 'permission denied');
  v_res := v_res || pg_temp.t('manager cannot read overtime_threshold_hours', M, format('SELECT overtime_threshold_hours::text FROM public.clients WHERE id = %L', C1), 'permission denied');
  v_res := v_res || pg_temp.t('employee select * refused', E1, format('SELECT id::text FROM (SELECT * FROM public.clients WHERE id = %L) s', C1), 'permission denied');
  v_res := v_res || pg_temp.t('admin reads full row via RPC', A, format('SELECT (j->>''min_billable_hours'') FROM public.get_clients_admin(%L) j', C1), 'ok', '4');
  v_res := v_res || pg_temp.t('admin RPC has events count', A, format('SELECT (j->''events''->0->>''count'') FROM public.get_clients_admin(%L) j', C1), 'ok', '1');
  v_res := v_res || pg_temp.t('manager get_clients_admin refused', M, 'SELECT count(*)::text FROM public.get_clients_admin()', 'not_authorized');
  v_res := v_res || pg_temp.t('recruiter gets role names only', R1, format('SELECT array_to_string(role_names, '','') FROM public.list_client_options() WHERE id = %L', C1), 'ok', 'Waiter,Bartender');
  v_res := v_res || pg_temp.t('employee list_client_options refused', E1, 'SELECT count(*)::text FROM public.list_client_options()', 'not_authorized');

  -- writes (admin) still work; RETURNING only granted columns
  v_res := v_res || pg_temp.t('admin updates price list (returning id)', A,
     format('UPDATE public.clients SET min_billable_hours = 5 WHERE id = %L RETURNING id::text', C1), 'ok', C1::text);

  -- trigger: recruiter (owner) inserts a role without price -> client price applied
  v_res := v_res || pg_temp.t('recruiter inserts role (returning id)', R1,
     format('INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (%L, %L, 1, %L, 50) RETURNING role_name', EV, 'waiter', '18:00'), 'ok', 'waiter');
  SELECT bill_to_client = 95 INTO b FROM public.event_roles WHERE event_id = EV AND role_name = 'waiter';
  v_res := v_res || jsonb_build_object('t', 'trigger applied client price 95', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', COALESCE(b::text, 'null'));
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time) VALUES (EV, 'Bartender', 1, '18:00') RETURNING id INTO RO;
  SELECT bill_to_client IS NULL INTO b FROM public.event_roles WHERE id = RO;
  v_res := v_res || jsonb_build_object('t', 'non-numeric rate -> no price (never guessed)', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, bill_to_client) VALUES (EV, 'WAITER', 1, '18:00', 130) RETURNING id INTO RO;
  SELECT bill_to_client = 130 INTO b FROM public.event_roles WHERE id = RO;
  v_res := v_res || jsonb_build_object('t', 'explicit price is kept', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  SELECT NOT has_table_privilege('anon', 'public.clients', 'SELECT')
     AND NOT has_column_privilege('authenticated', 'public.clients', 'preferred_roles', 'SELECT')
     AND NOT has_function_privilege('anon', 'public.get_clients_admin(uuid)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.list_client_options()', 'EXECUTE') INTO b;
  v_res := v_res || jsonb_build_object('t', 'grants: anon none, authenticated no pricing columns', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  RAISE EXCEPTION 'B1_TEST_RESULTS %', v_res::text;
END $do$;
