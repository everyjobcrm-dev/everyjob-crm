-- P9 behavior tests: list_staff_recruiters (E0), update_event_details (E1), upsert_event_role (E2), remove_event_role (E3).
-- Same harness as p4: fixtures in ONE DO block, every assertion impersonated (SET LOCAL ROLE authenticated + jwt claims),
-- the block always ends with RAISE EXCEPTION 'P9_TEST_RESULTS ...' so everything rolls back.
-- Afterwards verify: SELECT count(*) FROM auth.users WHERE email LIKE 'p9test%'; -> 0
DO $do$
DECLARE
  v_res jsonb := '[]'::jsonb; rec record; n int := 0; b boolean;
  A uuid := gen_random_uuid(); M uuid := gen_random_uuid(); R1 uuid := gen_random_uuid(); R2 uuid := gen_random_uuid();
  E1 uuid := gen_random_uuid(); E2 uuid := gen_random_uuid(); E3 uuid := gen_random_uuid(); E4 uuid := gen_random_uuid();
  C1 uuid; C2 uuid; EVO uuid; EVP uuid; EVX uuid; EVH uuid; EVA uuid;
  RO1 uuid; RO2 uuid; RP1 uuid; RX1 uuid; RH1 uuid; RA1 uuid;
  gE1 uuid; gE2 uuid; gE3 uuid; gE4 uuid; gH uuid; gA uuid;
  v_tomorrow date := (now() AT TIME ZONE 'Asia/Jerusalem')::date + 1;
  v_yesterday date := (now() AT TIME ZONE 'Asia/Jerusalem')::date - 1;
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

  FOR rec IN SELECT * FROM (VALUES (A,'admin'),(M,'manager'),(R1,'recruiter'),(R2,'recruiter'),
                                     (E1,'employee'),(E2,'employee'),(E3,'employee'),(E4,'employee')) AS v(id, role) LOOP
    n := n + 1;
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p9test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'P9', 'tz', pg_temp.tz(27190400 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((43000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role, can_create_events = (rec.role = 'recruiter') WHERE id = rec.id;
  END LOOP;

  INSERT INTO public.clients (name) VALUES ('P9 test client A ' || gen_random_uuid()) RETURNING id INTO C1;
  INSERT INTO public.clients (name) VALUES ('P9 test client B ' || gen_random_uuid()) RETURNING id INTO C2;
  -- EVO open (R1): RO1 headcount 1 with 1 pending + 2 waitlisted, RO2 empty
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id) VALUES (C1, '2026-12-01', '18:00', 'P9 EVO', 'open', R1) RETURNING id INTO EVO;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVO, 'RO1', 1, '18:00', 50) RETURNING id INTO RO1;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVO, 'RO2', 2, '18:00', 50) RETURNING id INTO RO2;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_at) VALUES (EVO, RO1, E1, 'pending', now() - interval '3 hours') RETURNING id INTO gE1;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_at) VALUES (EVO, RO1, E2, 'waitlisted', now() - interval '2 hours') RETURNING id INTO gE2;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, created_at) VALUES (EVO, RO1, E3, 'waitlisted', now() - interval '1 hour') RETURNING id INTO gE3;
  -- EVP pending_rates (R2), one role without rate
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id) VALUES (C1, '2026-12-02', '18:00', 'P9 EVP', 'pending_rates', R2) RETURNING id INTO EVP;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVP, 'RP1', 2, '18:00', NULL) RETURNING id INTO RP1;
  -- EVX cancelled (R1)
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id) VALUES (C1, '2026-12-03', '18:00', 'P9 EVX', 'open', R1) RETURNING id INTO EVX;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVX, 'RX1', 2, '18:00', 50) RETURNING id INTO RX1;
  UPDATE public.events SET status = 'cancelled' WHERE id = EVX;
  -- EVH closed (R1) with a PENDING hour report; EVA closed (R1) with an APPROVED hour report
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id) VALUES (C1, '2026-12-04', '18:00', 'P9 EVH', 'open', R1) RETURNING id INTO EVH;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVH, 'RH1', 2, '18:00', 50) RETURNING id INTO RH1;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVH, RH1, E4, 'approved') RETURNING id INTO gH;
  INSERT INTO public.shift_hour_submissions (registration_id, reported_start, reported_end, reported_hours, submitted_by, status)
    VALUES (gH, '2026-12-04 18:00+02', '2026-12-04 22:00+02', 4, M, 'pending');
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id, travel_budget_per_worker) VALUES (C1, '2026-12-05', '18:00', 'P9 EVA', 'open', R1, 20) RETURNING id INTO EVA;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVA, 'RA1', 2, '18:00', 50) RETURNING id INTO RA1;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVA, RA1, E4, 'approved') RETURNING id INTO gA;
  INSERT INTO public.shift_hour_submissions (registration_id, reported_start, reported_end, reported_hours, submitted_by, status, reviewed_by, reviewed_at)
    VALUES (gA, '2026-12-05 18:00+02', '2026-12-05 22:00+02', 4, M, 'approved', A, now());
  UPDATE public.events SET status = 'closed' WHERE id IN (EVH, EVA);

  -- ===== E0 list_staff_recruiters =====
  v_res := v_res || pg_temp.t('E0 manager sees recruiters (R1 and R2)', M,
     format('SELECT (bool_or(id = %L) AND bool_or(id = %L))::text FROM public.list_staff_recruiters()', R1, R2), 'ok', 'true');
  v_res := v_res || pg_temp.t('E0 admin sees no non-recruiters', A,
     format('SELECT (NOT bool_or(id IN (%L, %L, %L)))::text FROM public.list_staff_recruiters()', A, M, E1), 'ok', 'true');
  v_res := v_res || pg_temp.t('E0 recruiter gets 0 rows', R1, 'SELECT count(*)::text FROM public.list_staff_recruiters()', 'ok', '0');
  v_res := v_res || pg_temp.t('E0 employee gets 0 rows', E1, 'SELECT count(*)::text FROM public.list_staff_recruiters()', 'ok', '0');

  -- ===== E1 update_event_details =====
  v_res := v_res || pg_temp.t('E1 recruiter edits own event location', R1,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).location', EVO, '{"location":"  מיקום חדש  ","notes":""}'), 'ok', 'מיקום חדש');
  SELECT notes IS NULL FROM public.events WHERE id = EVO INTO b;
  v_res := v_res || jsonb_build_object('t', 'E1 empty notes stored as NULL', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('E1 recruiter on another recruiter''s event', R1,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).id::text', EVP, '{"location":"x"}'), 'not_authorized');
  v_res := v_res || pg_temp.t('E1 employee', E1,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).id::text', EVO, '{"location":"x"}'), 'not_authorized');
  v_res := v_res || pg_temp.t('E1 unknown key (status) rejected', A,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).id::text', EVO, '{"status":"closed"}'), 'forbidden_column');
  v_res := v_res || pg_temp.t('E1 recruiter cannot change client', R1,
     format('SELECT (public.update_event_details(%L, jsonb_build_object(''client_id'', %L::text))).id::text', EVO, C2), 'forbidden_column: client_id');
  v_res := v_res || pg_temp.t('E1 manager cannot change client', M,
     format('SELECT (public.update_event_details(%L, jsonb_build_object(''client_id'', %L::text))).id::text', EVO, C2), 'forbidden_column: client_id');
  v_res := v_res || pg_temp.t('E1 admin changes client', A,
     format('SELECT ((public.update_event_details(%L, jsonb_build_object(''client_id'', %L::text))).client_id = %L)::text', EVO, C2, C2), 'ok', 'true');
  v_res := v_res || pg_temp.t('E1 recruiter cannot change recruiter', R1,
     format('SELECT (public.update_event_details(%L, jsonb_build_object(''recruiter_id'', %L::text))).id::text', EVO, R2), 'forbidden_column: recruiter_id');
  v_res := v_res || pg_temp.t('E1 manager assigns recruiter R1 to EVP (owned by R2)', M,
     format('SELECT ((public.update_event_details(%L, jsonb_build_object(''recruiter_id'', %L::text))).recruiter_id = %L)::text', EVP, R1, R1), 'ok', 'true');
  v_res := v_res || pg_temp.t('E1 new owner R1 can now edit EVP', R1,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).location', EVP, '{"location":"P9 EVP 2"}'), 'ok', 'P9 EVP 2');
  v_res := v_res || pg_temp.t('E1 manager assigning an employee as recruiter', M,
     format('SELECT (public.update_event_details(%L, jsonb_build_object(''recruiter_id'', %L::text))).id::text', EVP, E1), 'recruiter_not_found');
  v_res := v_res || pg_temp.t('E1 manager unassigns recruiter (null)', M,
     format('SELECT ((public.update_event_details(%L, %L::jsonb)).recruiter_id IS NULL)::text', EVP, '{"recruiter_id":null}'), 'ok', 'true');
  v_res := v_res || pg_temp.t('E1 past date rejected', R1,
     format('SELECT (public.update_event_details(%L, jsonb_build_object(''event_date'', %L::text))).id::text', EVO, v_yesterday), 'event_date_past');
  v_res := v_res || pg_temp.t('E1 future date ok', R1,
     format('SELECT ((public.update_event_details(%L, jsonb_build_object(''event_date'', %L::text))).event_date = %L)::text', EVO, v_tomorrow, v_tomorrow), 'ok', 'true');
  v_res := v_res || pg_temp.t('E1 cancelled event read-only', A,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).id::text', EVX, '{"location":"x"}'), 'event_not_editable');
  v_res := v_res || pg_temp.t('E1 date change blocked with pending hours', A,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).id::text', EVH, '{"event_date":"2026-12-24"}'), 'event_has_hours');
  v_res := v_res || pg_temp.t('E1 start time change blocked with pending hours', A,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).id::text', EVH, '{"start_time":"19:00"}'), 'event_has_hours');
  v_res := v_res || pg_temp.t('E1 notes still editable with hours', R1,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).notes', EVH, '{"notes":"חניה מאחור"}'), 'ok', 'חניה מאחור');
  v_res := v_res || pg_temp.t('E1 travel change blocked with approved hours', A,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).id::text', EVA, '{"travel_budget_per_worker":30}'), 'event_has_approved_hours');
  v_res := v_res || pg_temp.t('E1 resubmitting unchanged travel/recruiter with approved hours is ok', M,
     format('SELECT (public.update_event_details(%L, jsonb_build_object(''travel_budget_per_worker'', 20, ''recruiter_id'', %L::text, ''notes'', ''x''))).notes', EVA, R1), 'ok', 'x');
  v_res := v_res || pg_temp.t('E1 recruiter change blocked with approved hours', M,
     format('SELECT (public.update_event_details(%L, jsonb_build_object(''recruiter_id'', %L::text))).id::text', EVA, R2), 'event_has_approved_hours');
  v_res := v_res || pg_temp.t('E1 invalid min_rating', R1,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).id::text', EVO, '{"min_rating":6}'), 'invalid_value');
  v_res := v_res || pg_temp.t('E1 empty location', R1,
     format('SELECT (public.update_event_details(%L, %L::jsonb)).id::text', EVO, '{"location":"  "}'), 'invalid_value');

  -- ===== E2 upsert_event_role =====
  v_res := v_res || pg_temp.t('E2 headcount 0 rejected', R1,
     format('SELECT (public.upsert_event_role(%L, %L, %L, 0, %L, NULL, 50)).id::text', EVO, RO1, 'RO1', '18:00'), 'invalid_headcount');
  v_res := v_res || pg_temp.t('E2 grow RO1 1 -> 2 promotes oldest waitlisted', R1,
     format('SELECT (public.upsert_event_role(%L, %L, %L, 2, %L, NULL, 50)).headcount::text', EVO, RO1, 'RO1', '18:00'), 'ok', '2');
  SELECT (SELECT status FROM public.event_registrations WHERE id = gE2) = 'pending'
     AND (SELECT status FROM public.event_registrations WHERE id = gE3) = 'waitlisted' INTO b;
  v_res := v_res || jsonb_build_object('t', 'E2 FIFO promotion: E2 pending, E3 still waitlisted', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('E2 shrink RO1 2 -> 1 below occupied', R1,
     format('SELECT (public.upsert_event_role(%L, %L, %L, 1, %L, NULL, 50)).id::text', EVO, RO1, 'RO1', '18:00'), 'headcount_below_occupied');
  v_res := v_res || pg_temp.t('E2 open event: role without rate rejected', R1,
     format('SELECT (public.upsert_event_role(%L, NULL, %L, 1, %L, NULL, NULL)).id::text', EVO, 'חדש', '18:00'), 'missing_rates');
  v_res := v_res || pg_temp.t('E2 add role to open event', R1,
     format('SELECT (public.upsert_event_role(%L, NULL, %L, 3, %L, %L, 60)).role_name', EVO, 'ברמן', '19:00', '23:00'), 'ok', 'ברמן');
  v_res := v_res || pg_temp.t('E2 pending_rates event: role without rate ok', M,
     format('SELECT (public.upsert_event_role(%L, NULL, %L, 1, %L, NULL, NULL)).base_rate IS NULL', EVP, 'מלצר', '18:00'), 'ok', 'true');
  v_res := v_res || pg_temp.t('E2 recruiter sets bill_to_client', R1,
     format('SELECT (public.upsert_event_role(%L, %L, %L, 2, %L, NULL, 50, 120)).id::text', EVO, RO2, 'RO2', '18:00'), 'forbidden_column: bill_to_client');
  v_res := v_res || pg_temp.t('E2 admin sets bill_to_client', A,
     format('SELECT (public.upsert_event_role(%L, %L, %L, 2, %L, NULL, 50, 120)).bill_to_client::text', EVO, RO2, 'RO2', '18:00'), 'ok', '120');
  v_res := v_res || pg_temp.t('E2 recruiter edit keeps admin bill_to_client', R1,
     format('SELECT (public.upsert_event_role(%L, %L, %L, 3, %L, NULL, 55)).bill_to_client::text', EVO, RO2, 'RO2', '18:00'), 'ok', '120');
  v_res := v_res || pg_temp.t('E2 role time change blocked with hours', A,
     format('SELECT (public.upsert_event_role(%L, %L, %L, 2, %L, NULL, 50)).id::text', EVH, RH1, 'RH1', '19:00'), 'event_has_hours');
  v_res := v_res || pg_temp.t('E2 role of another event', R1,
     format('SELECT (public.upsert_event_role(%L, %L, %L, 2, %L, NULL, 50)).id::text', EVO, RH1, 'RH1', '18:00'), 'event_role_not_found');
  v_res := v_res || pg_temp.t('E2 cancelled event read-only', A,
     format('SELECT (public.upsert_event_role(%L, %L, %L, 3, %L, NULL, 50)).id::text', EVX, RX1, 'RX1', '18:00'), 'event_not_editable');
  v_res := v_res || pg_temp.t('E2 other recruiter', R2,
     format('SELECT (public.upsert_event_role(%L, %L, %L, 3, %L, NULL, 50)).id::text', EVO, RO2, 'RO2', '18:00'), 'not_authorized');

  -- ===== E3 remove_event_role =====
  v_res := v_res || pg_temp.t('E3 role with registrations', R1, format('SELECT public.remove_event_role(%L)::text', RO1), 'role_has_registrations');
  v_res := v_res || pg_temp.t('E3 other recruiter', R2, format('SELECT public.remove_event_role(%L)::text', RO2), 'not_authorized');
  v_res := v_res || pg_temp.t('E3 remove empty role', R1, format('SELECT public.remove_event_role(%L)::text', RO2), 'ok');
  SELECT NOT EXISTS (SELECT 1 FROM public.event_roles WHERE id = RO2) INTO b;
  v_res := v_res || jsonb_build_object('t', 'E3 role row gone', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('E3 role with an hour report (EVH)', A, format('SELECT public.remove_event_role(%L)::text', RH1), 'role_has_registrations');
  v_res := v_res || pg_temp.t('E3 cancelled event read-only', A, format('SELECT public.remove_event_role(%L)::text', RX1), 'event_not_editable');
  -- EVP has RP1 + the role added above; removing RP1 leaves one; then removing the last one is refused
  v_res := v_res || pg_temp.t('E3 remove RP1 (EVP keeps one role)', M, format('SELECT public.remove_event_role(%L)::text', RP1), 'ok');
  v_res := v_res || pg_temp.t('E3 last remaining role refused', M,
     format('SELECT public.remove_event_role((SELECT id FROM public.event_roles WHERE event_id = %L))::text', EVP), 'last_role');

  SELECT NOT has_function_privilege('anon', 'public.list_staff_recruiters()', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.update_event_details(uuid,jsonb)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.upsert_event_role(uuid,uuid,text,int,time,time,numeric,numeric)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.remove_event_role(uuid)', 'EXECUTE') INTO b;
  v_res := v_res || jsonb_build_object('t', 'anon has no EXECUTE on E0-E3', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  RAISE EXCEPTION 'P9_TEST_RESULTS %', v_res::text;
END $do$;
