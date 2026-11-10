-- P10b behavior tests: event_roles.bill_to_client is readable by Admin only (column grant + get_event_role_pricing).
-- Same harness as p9/p10; everything rolls back ('P10B_TEST_RESULTS').
-- Run AFTER supabase/pending/20261110100100_p10b_event_roles_pricing_grants.sql. Afterwards verify:
--   SELECT count(*) FROM auth.users WHERE email LIKE 'p10btest%'; -> 0
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
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p10btest' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'P10B', 'tz', pg_temp.tz(31417000 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((45000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role, can_create_events = (rec.role = 'recruiter') WHERE id = rec.id;
  END LOOP;

  INSERT INTO public.clients (name) VALUES ('P10B test client ' || gen_random_uuid()) RETURNING id INTO C1;
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id) VALUES (C1, '2026-12-01', '18:00', 'P10B EV', 'open', R1) RETURNING id INTO EV;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate, bill_to_client) VALUES (EV, 'R', 1, '18:00', 50, 120) RETURNING id INTO RO;

  v_res := v_res || pg_temp.t('employee reads allowed columns', E1, format('SELECT role_name FROM public.event_roles WHERE id = %L', RO), 'ok', 'R');
  v_res := v_res || pg_temp.t('employee cannot read bill_to_client', E1, format('SELECT bill_to_client::text FROM public.event_roles WHERE id = %L', RO), 'permission denied');
  v_res := v_res || pg_temp.t('recruiter (owner) cannot read bill_to_client', R1, format('SELECT bill_to_client::text FROM public.event_roles WHERE id = %L', RO), 'permission denied');
  v_res := v_res || pg_temp.t('manager cannot read bill_to_client', M, format('SELECT bill_to_client::text FROM public.event_roles WHERE id = %L', RO), 'permission denied');
  v_res := v_res || pg_temp.t('admin cannot read the column directly either (same grant)', A, format('SELECT bill_to_client::text FROM public.event_roles WHERE id = %L', RO), 'permission denied');
  v_res := v_res || pg_temp.t('admin reads the price through the RPC', A, format('SELECT bill_to_client::text FROM public.get_event_role_pricing(%L)', EV), 'ok', '120');
  v_res := v_res || pg_temp.t('manager RPC refused', M, format('SELECT bill_to_client::text FROM public.get_event_role_pricing(%L)', EV), 'not_authorized');
  v_res := v_res || pg_temp.t('recruiter RPC refused', R1, format('SELECT bill_to_client::text FROM public.get_event_role_pricing(%L)', EV), 'not_authorized');
  v_res := v_res || pg_temp.t('recruiter (owner) still updates own role headcount (write grants untouched)', R1,
     format('UPDATE public.event_roles SET headcount = 2 WHERE id = %L RETURNING headcount::text', RO), 'ok', '2');
  v_res := v_res || pg_temp.t('admin still sets the price through upsert_event_role', A,
     format('SELECT (public.upsert_event_role(%L, %L, %L, 2, %L, NULL, 50, 130)).id::text', EV, RO, 'R', '18:00'), 'ok', RO::text);
  v_res := v_res || pg_temp.t('RPC sees the new price', A, format('SELECT bill_to_client::text FROM public.get_event_role_pricing(%L)', EV), 'ok', '130');

  SELECT NOT has_function_privilege('anon', 'public.get_event_role_pricing(uuid)', 'EXECUTE')
     AND NOT has_column_privilege('authenticated', 'public.event_roles', 'bill_to_client', 'SELECT')
     AND NOT has_table_privilege('anon', 'public.event_roles', 'SELECT') INTO b;
  v_res := v_res || jsonb_build_object('t', 'grants: anon no EXECUTE/SELECT, authenticated no bill_to_client', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  RAISE EXCEPTION 'P10B_TEST_RESULTS %', v_res::text;
END $do$;
