-- C2 behavior test: v_recruiter_credits_monthly (per recruiter and Jerusalem month, voided excluded, RLS via security_invoker).
-- Same harness as b2; everything rolls back ('C2_TEST_RESULTS'). No DROP.
-- Run AFTER supabase/pending/20261115110000_c2_recruiter_credits_monthly.sql.
-- Afterwards verify: SELECT count(*) FROM auth.users WHERE email LIKE 'c2test%'; -> 0
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

  FOR rec IN SELECT * FROM (VALUES (A,'admin'),(M,'recruiter'),(E1,'employee'),(E2,'recruiter')) AS v(id, role) LOOP
    n := n + 1;
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c2test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'C2', 'tz', pg_temp.tz(31423000 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((49000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role WHERE id = rec.id;
  END LOOP;
  -- here M = recruiter R1, E2 = recruiter R2, E1 = the recruited employee
  INSERT INTO public.clients (name) VALUES ('C2 test client ' || gen_random_uuid()) RETURNING id INTO C1;

  -- one event/registration per credit (source_registration_id is unique). R1: June 2 pending (5+5), 1 applied (5),
  -- 1 voided (excluded), July 1 pending created 2031-06-30 21:30 UTC = 2031-07-01 00:30 Jerusalem. R2: June 1 pending (7).
  FOR rec IN SELECT * FROM (VALUES
      (M, 5::numeric, 'pending', '2031-06-15 10:00+00'::timestamptz), (M, 5, 'pending', '2031-06-16 10:00+00'),
      (M, 5, 'applied', '2031-06-20 10:00+00'), (M, 5, 'voided', '2031-06-21 10:00+00'),
      (M, 3, 'pending', '2031-06-30 21:30+00'), (E2, 7, 'pending', '2031-06-10 10:00+00')) AS v(rid, amt, st, at) LOOP
    INSERT INTO public.events (client_id, event_date, start_time, location, status)
      VALUES (C1, '2031-06-01', '08:00', 'C2 EV', 'closed') RETURNING id INTO EV1;
    INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EV1, 'R', 5, '08:00', 40) RETURNING id INTO R1;
    INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate) VALUES (EV1, R1, E1, 'approved', 40) RETURNING id INTO g1;
    INSERT INTO public.recruiter_bonuses (recruiter_id, source_registration_id, bonus_amount, status, created_at)
      VALUES (rec.rid, g1, rec.amt, rec.st::public.bonus_status, rec.at);
  END LOOP;

  v_res := v_res || pg_temp.t('admin: R1 June = 3 earned 15, pending 2/10, redeemed 1/5 (voided excluded)', A,
     format('SELECT earned_count || '':'' || earned_amount::numeric(10,2) || '':'' || pending_count || '':'' || pending_amount::numeric(10,2) || '':'' || redeemed_count || '':'' || redeemed_amount::numeric(10,2) FROM public.v_recruiter_credits_monthly WHERE recruiter_id = %L AND month = ''2031-06-01''', M),
     'ok', '3:15.00:2:10.00:1:5.00');
  v_res := v_res || pg_temp.t('admin: R1 July from Jerusalem time = 1 pending 3', A,
     format('SELECT earned_count || '':'' || pending_amount::numeric(10,2) FROM public.v_recruiter_credits_monthly WHERE recruiter_id = %L AND month = ''2031-07-01''', M), 'ok', '1:3.00');
  v_res := v_res || pg_temp.t('recruiter R1 sees own rows only', M,
     format('SELECT count(*)::text FROM public.v_recruiter_credits_monthly WHERE recruiter_id IN (%L, %L)', M, E2), 'ok', '2');
  v_res := v_res || pg_temp.t('employee sees nothing', E1,
     format('SELECT count(*)::text FROM public.v_recruiter_credits_monthly WHERE recruiter_id IN (%L, %L)', M, E2), 'ok', '0');
  v_res := v_res || pg_temp.t('view is read-only', A, 'DELETE FROM public.v_recruiter_credits_monthly RETURNING 1', 'permission denied');
  SELECT NOT has_table_privilege('anon', 'public.v_recruiter_credits_monthly', 'SELECT') INTO b;
  v_res := v_res || jsonb_build_object('t', 'anon has no SELECT', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  RAISE EXCEPTION 'C2_TEST_RESULTS %', v_res::text;
END $do$;
