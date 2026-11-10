-- P10 behavior tests: final closure (closed <-> completed, Admin/Manager only; paused frozen; pending hours block).
-- Same harness as p9: fixtures in ONE DO block, every assertion impersonated (SET LOCAL ROLE authenticated + jwt claims),
-- the block always ends with RAISE EXCEPTION 'P10_TEST_RESULTS ...' so everything rolls back.
-- Run AFTER supabase/pending/20261110100000_p10_event_final_closure.sql. Afterwards verify:
--   SELECT count(*) FROM auth.users WHERE email LIKE 'p10test%'; -> 0
DO $do$
DECLARE
  v_res jsonb := '[]'::jsonb; rec record; n int := 0; b boolean; v_txt text;
  A uuid := gen_random_uuid(); M uuid := gen_random_uuid(); R1 uuid := gen_random_uuid(); E1 uuid := gen_random_uuid();
  C1 uuid; EVC uuid; EVR uuid; EVH uuid; EVO uuid; EVZ uuid; RC1 uuid; RR1 uuid; RH1 uuid; RO1 uuid; RZ1 uuid; gH uuid;
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
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p10test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'P10', 'tz', pg_temp.tz(31416000 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((44000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role, can_create_events = (rec.role = 'recruiter') WHERE id = rec.id;
  END LOOP;

  INSERT INTO public.clients (name) VALUES ('P10 test client ' || gen_random_uuid()) RETURNING id INTO C1;
  -- EVC: closed, no hours (M closes finally, then reopens)
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id) VALUES (C1, '2026-12-01', '18:00', 'P10 EVC', 'open', R1) RETURNING id INTO EVC;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVC, 'RC1', 1, '18:00', 50) RETURNING id INTO RC1;
  -- EVR: closed, owned by R1 (recruiter may not close finally)
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id) VALUES (C1, '2026-12-02', '18:00', 'P10 EVR', 'open', R1) RETURNING id INTO EVR;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVR, 'RR1', 1, '18:00', 50) RETURNING id INTO RR1;
  -- EVH: closed with a PENDING hour report
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id) VALUES (C1, '2026-12-03', '18:00', 'P10 EVH', 'open', R1) RETURNING id INTO EVH;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVH, 'RH1', 2, '18:00', 50) RETURNING id INTO RH1;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVH, RH1, E1, 'approved') RETURNING id INTO gH;
  INSERT INTO public.shift_hour_submissions (registration_id, reported_start, reported_end, reported_hours, submitted_by, status)
    VALUES (gH, '2026-12-03 18:00+02', '2026-12-03 22:00+02', 4, M, 'pending');
  -- EVO: open (no direct open -> completed)
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id) VALUES (C1, '2026-12-04', '18:00', 'P10 EVO', 'open', R1) RETURNING id INTO EVO;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVO, 'RO1', 1, '18:00', 50) RETURNING id INTO RO1;
  -- EVZ: paused (frozen)
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id) VALUES (C1, '2026-12-05', '18:00', 'P10 EVZ', 'open', R1) RETURNING id INTO EVZ;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVZ, 'RZ1', 1, '18:00', 50) RETURNING id INTO RZ1;
  UPDATE public.events SET status = 'closed' WHERE id IN (EVC, EVR, EVH);
  UPDATE public.events SET status = 'paused' WHERE id = EVZ;

  -- ===== level 2: closed -> completed =====
  v_res := v_res || pg_temp.t('manager closes finally (closed -> completed)', M,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING status', 'completed', EVC), 'ok', 'completed');
  v_res := v_res || pg_temp.t('completed event is read-only for edit RPC', A,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).id::text', EVC, '{"location":"x"}'), 'event_not_editable');
  v_res := v_res || pg_temp.t('completed event refuses scheduling', M,
     format('SELECT registration_id::text FROM public.schedule_employee(%L, %L)', RC1, E1), 'event_not_schedulable');
  v_res := v_res || pg_temp.t('completed -> cancelled refused', A,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING status', 'cancelled', EVC), 'invalid_transition');
  v_res := v_res || pg_temp.t('completed -> open refused', A,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING status', 'open', EVC), 'invalid_transition');
  v_res := v_res || pg_temp.t('admin reopens for editing (completed -> closed)', A,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING status', 'closed', EVC), 'ok', 'closed');
  v_res := v_res || pg_temp.t('reopened event editable again', M,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).location', EVC, '{"location":"P10 EVC edited"}'), 'ok', 'P10 EVC edited');
  v_res := v_res || pg_temp.t('admin closes finally again', A,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING status', 'completed', EVC), 'ok', 'completed');

  -- ===== who may not =====
  v_res := v_res || pg_temp.t('recruiter (owner) may not close finally', R1,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING status', 'completed', EVR), 'forbidden_transition');
  v_res := v_res || pg_temp.t('recruiter (owner) level 1 still works (closed -> open)', R1,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING status', 'open', EVR), 'ok', 'open');
  v_res := v_res || pg_temp.t('employee update affects no row (RLS)', E1,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING status', 'completed', EVO), 'ok', NULL);
  SELECT status = 'open' INTO b FROM public.events WHERE id = EVO;
  v_res := v_res || jsonb_build_object('t', 'employee left EVO unchanged', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  -- ===== guards =====
  v_res := v_res || pg_temp.t('open -> completed refused (must close first)', A,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING status', 'completed', EVO), 'invalid_transition');
  v_res := v_res || pg_temp.t('pending hour report blocks final closure', A,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING status', 'completed', EVH), 'pending_hours_exist');
  UPDATE public.shift_hour_submissions SET voided_at = now(), voided_by = A, void_reason = 'test' WHERE registration_id = gH;
  v_res := v_res || pg_temp.t('voided pending report no longer blocks', A,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING status', 'completed', EVH), 'ok', 'completed');
  v_res := v_res || pg_temp.t('paused stays frozen', A,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING status', 'closed', EVZ), 'status_frozen');
  v_res := v_res || pg_temp.t('level 1 unchanged: manager closed -> cancelled records cancelled_from_status', M,
     format('UPDATE public.events SET status = %L WHERE id = %L RETURNING cancelled_from_status', 'cancelled', EVR), 'ok', 'open');

  SELECT NOT has_function_privilege('anon', 'public.app_event_has_pending_hours(uuid)', 'EXECUTE') INTO b;
  v_res := v_res || jsonb_build_object('t', 'anon has no EXECUTE on app_event_has_pending_hours', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  RAISE EXCEPTION 'P10_TEST_RESULTS %', v_res::text;
END $do$;
