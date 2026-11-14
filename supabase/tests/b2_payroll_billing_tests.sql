-- B2 behavior tests: payroll + billing views/RPCs (Admin only). Same harness as b1/p10; everything rolls back
-- ('B2_TEST_RESULTS'). No DROP. Run AFTER supabase/pending/20261114110000_b2_payroll_billing_views.sql.
-- Afterwards verify: SELECT count(*) FROM auth.users WHERE email LIKE 'b2test%'; -> 0
-- Fixture month 2031-03 (no real data). Hand calculation:
--   E1 wage 40, 12h on EV1: 8×40 + 2×40×1.25 + 2×40×1.5 = 320 + 100 + 120 = 540, travel 20
--   E2 no wage, 3h on EV1: missing_rate, pay NULL; client min billable 4 -> billable 4
--   EV1 price 100: billing = 12×100 + 4×100 = 1600, travel 40
--   excluded: E1 5h on cancelled EV2, E2 6h voided on EV3
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
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b2test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'B2', 'tz', pg_temp.tz(31419000 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((47000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role WHERE id = rec.id;
  END LOOP;

  INSERT INTO public.clients (name, min_billable_hours) VALUES ('B2 test client ' || gen_random_uuid(), 4) RETURNING id INTO C1;
  INSERT INTO public.events (client_id, event_date, start_time, location, status, travel_budget_per_worker)
    VALUES (C1, '2031-03-10', '08:00', 'B2 EV1', 'closed', 20) RETURNING id INTO EV1;
  INSERT INTO public.events (client_id, event_date, start_time, location, status, travel_budget_per_worker)
    VALUES (C1, '2031-03-11', '08:00', 'B2 EV2', 'cancelled', 20) RETURNING id INTO EV2;
  INSERT INTO public.events (client_id, event_date, start_time, location, status, travel_budget_per_worker)
    VALUES (C1, '2031-03-12', '08:00', 'B2 EV3', 'closed', 0) RETURNING id INTO EV3;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate, bill_to_client) VALUES (EV1, 'R', 5, '08:00', 40, 100) RETURNING id INTO R1;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate, bill_to_client) VALUES (EV2, 'R', 5, '08:00', 40, 100) RETURNING id INTO R2;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate, bill_to_client) VALUES (EV3, 'R', 5, '08:00', 40, 100) RETURNING id INTO R3;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate) VALUES (EV1, R1, E1, 'approved', 40) RETURNING id INTO g1;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate) VALUES (EV1, R1, E2, 'approved', NULL) RETURNING id INTO g2;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate) VALUES (EV2, R2, E1, 'approved', 40) RETURNING id INTO g3;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate) VALUES (EV3, R3, E2, 'approved', 40) RETURNING id INTO g4;
  INSERT INTO public.shift_hour_submissions (registration_id, reported_start, reported_end, reported_hours, submitted_by, status, reviewed_by, reviewed_at) VALUES
    (g1, '2031-03-10 08:00+02', '2031-03-10 20:00+02', 12, M, 'approved', A, now()),
    (g2, '2031-03-10 08:00+02', '2031-03-10 11:00+02', 3, M, 'approved', A, now()),
    (g3, '2031-03-11 08:00+02', '2031-03-11 13:00+02', 5, M, 'approved', A, now());
  INSERT INTO public.shift_hour_submissions (registration_id, reported_start, reported_end, reported_hours, submitted_by, status, reviewed_by, reviewed_at, voided_at, voided_by, void_reason)
    VALUES (g4, '2031-03-12 08:00+02', '2031-03-12 14:00+02', 6, M, 'approved', A, now(), now(), A, 'b2 test');

  v_res := v_res || pg_temp.t('payroll E1: 12h split 8/2/2, pay 540, travel 20', A,
     format('SELECT (hours = 12 AND hours_100 = 8 AND hours_125 = 2 AND hours_150 = 2 AND gross_pay = 540 AND travel = 20 AND missing_rate_shifts = 0)::text FROM public.get_payroll_month(''2031-03-15'') WHERE employee_id = %L', E1),
     'ok', 'true');
  v_res := v_res || pg_temp.t('payroll E2: missing rate flagged, pay 0, voided shift excluded', A,
     format('SELECT (shifts = 1 AND gross_pay = 0 AND missing_rate_shifts = 1)::text FROM public.get_payroll_month(''2031-03-01'') WHERE employee_id = %L', E2),
     'ok', 'true');
  v_res := v_res || pg_temp.t('payroll lines: E2 line pay NULL', A,
     format('SELECT COALESCE(pay::text, ''NULL'') FROM public.get_payroll_lines(''2031-03-01'') WHERE employee_id = %L', E2), 'ok', 'NULL');
  v_res := v_res || pg_temp.t('payroll lines: cancelled event excluded', A,
     format('SELECT count(*)::text FROM public.get_payroll_lines(''2031-03-01'') WHERE event_id IN (%L, %L)', EV2, EV3), 'ok', '0');
  v_res := v_res || pg_temp.t('billing EV1: min billable 4 applied, amount 1600, travel 40', A,
     format('SELECT (shifts = 2 AND hours = 15 AND billable_hours = 16 AND amount = 1600 AND travel = 40 AND missing_price_shifts = 0)::text FROM public.get_billing_month(''2031-03-01'') WHERE event_id = %L', EV1),
     'ok', 'true');
  v_res := v_res || pg_temp.t('billing: cancelled + voided excluded', A,
     format('SELECT count(*)::text FROM public.get_billing_month(''2031-03-01'') WHERE client_id = %L', C1), 'ok', '1');
  v_res := v_res || pg_temp.t('other month empty', A,
     format('SELECT count(*)::text FROM public.get_billing_month(''2031-04-01'') WHERE client_id = %L', C1), 'ok', '0');
  v_res := v_res || pg_temp.t('manager payroll refused', M, 'SELECT count(*)::text FROM public.get_payroll_month(''2031-03-01'')', 'not_authorized');
  v_res := v_res || pg_temp.t('employee billing refused', E1, 'SELECT count(*)::text FROM public.get_billing_month(''2031-03-01'')', 'not_authorized');
  v_res := v_res || pg_temp.t('employee lines refused', E1, 'SELECT count(*)::text FROM public.get_payroll_lines(''2031-03-01'')', 'not_authorized');
  v_res := v_res || pg_temp.t('admin cannot read the view directly', A, 'SELECT count(*)::text FROM public.v_payroll_shift_lines', 'permission denied');

  SELECT NOT has_table_privilege('authenticated', 'public.v_billing_shift_lines', 'SELECT')
     AND NOT has_table_privilege('anon', 'public.v_payroll_shift_lines', 'SELECT')
     AND NOT has_function_privilege('anon', 'public.get_payroll_month(date)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.get_billing_month(date)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.get_payroll_lines(date)', 'EXECUTE') INTO b;
  v_res := v_res || jsonb_build_object('t', 'grants: views closed, anon no EXECUTE', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  RAISE EXCEPTION 'B2_TEST_RESULTS %', v_res::text;
END $do$;
