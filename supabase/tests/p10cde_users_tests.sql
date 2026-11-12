-- P10c/d/e behavior tests: soft delete (deleted_at, soft_delete_user / restore_user, helpers deny deleted users),
-- employee approval (approval_status default + guard + set_employee_approval), search_employees v3 warnings.
-- Same harness as p9/p10; everything rolls back ('P10CDE_TEST_RESULTS').
-- Run AFTER p10c, p10d and p10e. Afterwards verify: SELECT count(*) FROM auth.users WHERE email LIKE 'p10ctest%'; -> 0
DO $do$
DECLARE
  v_res jsonb := '[]'::jsonb; rec record; n int := 0; b boolean; v_txt text;
  A uuid := gen_random_uuid(); M uuid := gen_random_uuid(); R1 uuid := gen_random_uuid(); R2 uuid := gen_random_uuid();
  E1 uuid := gen_random_uuid(); E2 uuid := gen_random_uuid(); E3 uuid := gen_random_uuid();
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

  -- fixtures are created by the auth trigger (handle_new_user, SECURITY DEFINER) -> column default applies: 'pending'
  FOR rec IN SELECT * FROM (VALUES (A,'admin'),(M,'manager'),(R1,'recruiter'),(R2,'recruiter'),(E1,'employee'),(E2,'employee'),(E3,'employee')) AS v(id, role) LOOP
    n := n + 1;
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p10ctest' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'P10C', 'tz', pg_temp.tz(31418000 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((46000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role, can_create_events = (rec.role = 'recruiter') WHERE id = rec.id;
  END LOOP;
  UPDATE public.profiles SET approval_status = 'approved' WHERE id IN (A, M, R1, R2, E2);  -- E1, E3 stay pending

  INSERT INTO public.clients (name) VALUES ('P10C test client ' || gen_random_uuid()) RETURNING id INTO C1;
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id) VALUES (C1, '2026-12-01', '18:00', 'P10C EV', 'open', R1) RETURNING id INTO EV;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EV, 'R', 3, '18:00', 50) RETURNING id INTO RO;

  -- ===== d: approval default + guard =====
  SELECT approval_status = 'pending' INTO b FROM public.profiles WHERE id = E1;
  v_res := v_res || jsonb_build_object('t', 'd new signup is pending', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('d employee cannot self-approve (guard)', E1,
     format('UPDATE public.profiles SET approval_status = %L WHERE id = %L RETURNING approval_status', 'approved', E1), 'protected profile fields');
  v_res := v_res || pg_temp.t('d employee cannot approve another (RPC)', E2, format('SELECT public.set_employee_approval(%L, %L)::text', E1, 'approved'), 'not_authorized');
  v_res := v_res || pg_temp.t('d recruiter approves E1', R2, format('SELECT public.set_employee_approval(%L, %L)::text', E1, 'approved'), 'ok');
  SELECT approval_status = 'approved' AND approval_set_by = R2 AND approval_set_at IS NOT NULL INTO b FROM public.profiles WHERE id = E1;
  v_res := v_res || jsonb_build_object('t', 'd approval recorded with actor', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('d manager rejects E3', M, format('SELECT public.set_employee_approval(%L, %L)::text', E3, 'rejected'), 'ok');
  v_res := v_res || pg_temp.t('d invalid status', A, format('SELECT public.set_employee_approval(%L, %L)::text', E2, 'maybe'), 'invalid_value');
  v_res := v_res || pg_temp.t('d target must be an employee', A, format('SELECT public.set_employee_approval(%L, %L)::text', R1, 'approved'), 'employee_not_found');
  v_res := v_res || pg_temp.t('d admin can still write the column directly', A,
     format('UPDATE public.profiles SET approval_status = %L WHERE id = %L RETURNING approval_status', 'pending', E3), 'ok', 'pending');

  -- ===== e: picker warnings (E3 pending again, E1 approved) =====
  v_res := v_res || pg_temp.t('e pending employee carries pending_approval warning', R1,
     format('SELECT (warnings @> ARRAY[%L])::text FROM public.search_employees(%L, %L) WHERE employee_id = %L', 'pending_approval', 'בדיקה', EV, E3), 'ok', 'true');
  v_res := v_res || pg_temp.t('e approved employee has no approval warning', R1,
     format('SELECT (NOT (warnings && ARRAY[%L, %L]))::text FROM public.search_employees(%L, %L) WHERE employee_id = %L', 'pending_approval', 'approval_rejected', 'בדיקה', EV, E1), 'ok', 'true');
  v_res := v_res || pg_temp.t('e pending employee is still listed (no filtering)', R1,
     format('SELECT count(*)::text FROM public.search_employees(%L, %L) WHERE employee_id = %L', 'בדיקה', EV, E3), 'ok', '1');
  v_res := v_res || pg_temp.t('e pending employee can still be scheduled (warning only)', R1,
     format('SELECT (warnings @> ARRAY[%L])::text FROM public.schedule_employee(%L, %L)', 'x', RO, E3), 'ok', 'false');

  -- ===== c: soft delete =====
  v_res := v_res || pg_temp.t('c manager cannot soft-delete', M, format('SELECT public.soft_delete_user(%L)::text', E2), 'not_authorized');
  v_res := v_res || pg_temp.t('c admin cannot delete self', A, format('SELECT public.soft_delete_user(%L)::text', A), 'cannot_delete_self');
  v_res := v_res || pg_temp.t('c admin soft-deletes E2', A, format('SELECT public.soft_delete_user(%L)::text', E2), 'ok');
  SELECT deleted_at IS NOT NULL AND deleted_by = A INTO b FROM public.profiles WHERE id = E2;
  v_res := v_res || jsonb_build_object('t', 'c deleted_at/deleted_by recorded', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('c deleting twice refused', A, format('SELECT public.soft_delete_user(%L)::text', E2), 'already_deleted');
  v_res := v_res || pg_temp.t('c deleted employee disappears from the picker', R1,
     format('SELECT count(*)::text FROM public.search_employees(%L, %L) WHERE employee_id = %L', 'בדיקה', EV, E2), 'ok', '0');
  v_res := v_res || pg_temp.t('c deleted employee cannot be scheduled', R1,
     format('SELECT registration_id::text FROM public.schedule_employee(%L, %L)', RO, E2), 'employee_not_found');
  v_res := v_res || pg_temp.t('c cannot approve a deleted employee', M, format('SELECT public.set_employee_approval(%L, %L)::text', E2, 'approved'), 'user_deleted');
  v_res := v_res || pg_temp.t('c admin soft-deletes recruiter R2', A, format('SELECT public.soft_delete_user(%L)::text', R2), 'ok');
  v_res := v_res || pg_temp.t('c deleted recruiter: app_current_role() is NULL', R2, 'SELECT COALESCE(public.app_current_role()::text, ''none'')', 'ok', 'none');
  v_res := v_res || pg_temp.t('c deleted recruiter cannot manage own event (app_can_manage_event)', R2, format('SELECT public.app_can_manage_event(%L)::text', EV), 'ok', 'false');
  v_res := v_res || pg_temp.t('c deleted recruiter cannot search employees', R2, format('SELECT count(*)::text FROM public.search_employees(%L, %L)', 'בדיקה', EV), 'not_authorized');
  v_res := v_res || pg_temp.t('c deleted recruiter cannot approve employees', R2, format('SELECT public.set_employee_approval(%L, %L)::text', E3, 'approved'), 'not_authorized');
  v_res := v_res || pg_temp.t('c deleted recruiter gone from list_staff_recruiters', M,
     format('SELECT (NOT bool_or(id = %L))::text FROM public.list_staff_recruiters()', R2), 'ok', 'true');
  v_res := v_res || pg_temp.t('c restore refused for a live user', A, format('SELECT public.restore_user(%L)::text', E1), 'not_deleted');
  v_res := v_res || pg_temp.t('c admin restores E2', A, format('SELECT public.restore_user(%L)::text', E2), 'ok');
  v_res := v_res || pg_temp.t('c restored employee is back in the picker', R1,
     format('SELECT count(*)::text FROM public.search_employees(%L, %L) WHERE employee_id = %L', 'בדיקה', EV, E2), 'ok', '1');
  v_res := v_res || pg_temp.t('c deleted admin loses admin (is_current_user_admin)', A, format('SELECT public.soft_delete_user(%L)::text', M), 'ok');
  UPDATE public.profiles SET deleted_at = now() WHERE id = A;   -- simulate a deleted admin (owner context)
  v_res := v_res || pg_temp.t('c deleted admin: is_current_user_admin() false', A, 'SELECT public.is_current_user_admin()::text', 'ok', 'false');
  v_res := v_res || pg_temp.t('c deleted admin cannot restore anyone', A, format('SELECT public.restore_user(%L)::text', M), 'not_authorized');

  SELECT NOT has_function_privilege('anon', 'public.soft_delete_user(uuid)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.restore_user(uuid)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.set_employee_approval(uuid,text)', 'EXECUTE') INTO b;
  v_res := v_res || jsonb_build_object('t', 'anon has no EXECUTE on the new RPCs', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  RAISE EXCEPTION 'P10CDE_TEST_RESULTS %', v_res::text;
END $do$;
