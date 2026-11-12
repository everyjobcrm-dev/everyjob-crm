-- P10f behavior tests: billing cycles + Form 101 purge gate (cycle must be closed AND session must be aal2).
-- Same harness as p9/p10 plus an aal parameter; everything rolls back ('P10F_TEST_RESULTS').
-- Run AFTER supabase/pending/20261110100500_p10f_billing_cycles_form101_purge.sql. Afterwards verify:
--   SELECT count(*) FROM auth.users WHERE email LIKE 'p10ftest%'; -> 0 ; SELECT count(*) FROM public.form_101_submissions; -> unchanged
DO $do$
DECLARE
  v_res jsonb := '[]'::jsonb; rec record; n int := 0; b boolean;
  A uuid := gen_random_uuid(); M uuid := gen_random_uuid(); E1 uuid := gen_random_uuid();
  v_last date := (date_trunc('month', (now() AT TIME ZONE 'Asia/Jerusalem')::date) - interval '1 month')::date;
  v_this date := date_trunc('month', (now() AT TIME ZONE 'Asia/Jerusalem')::date)::date;
  v_before int;
BEGIN
  EXECUTE $f$
  CREATE FUNCTION pg_temp.t(p_name text, p_uid uuid, p_sql text, p_expect text, p_val text DEFAULT NULL, p_aal text DEFAULT 'aal1') RETURNS jsonb
  LANGUAGE plpgsql AS $b$
  DECLARE v_out text; v_err text; v_ok boolean;
  BEGIN
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
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

  FOR rec IN SELECT * FROM (VALUES (A,'admin'),(M,'manager'),(E1,'employee')) AS v(id, role) LOOP
    n := n + 1;
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p10ftest' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'P10F', 'tz', pg_temp.tz(31419000 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((47000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role WHERE id = rec.id;
  END LOOP;

  SELECT count(*) INTO v_before FROM public.form_101_submissions;
  -- two fixture submissions (owner context): one from last month, one from this month
  INSERT INTO public.form_101_submissions (user_id, full_name, identity_number, phone, email, address, city, employer_name, job_title, wage, bank_name, branch_number, account_number, iban, created_at)
  VALUES (E1, 'p10f old', '000000000', '0500000000', 'p10f@example.invalid', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', v_last + 3),
         (E1, 'p10f new', '000000000', '0500000000', 'p10f@example.invalid', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', v_this + 1);

  -- ===== table lock-down =====
  v_res := v_res || pg_temp.t('employee cannot read form_101_submissions', E1, 'SELECT count(*)::text FROM public.form_101_submissions', 'permission denied');
  v_res := v_res || pg_temp.t('admin cannot read form_101_submissions directly (locked until 2FA)', A, 'SELECT count(*)::text FROM public.form_101_submissions', 'permission denied');
  v_res := v_res || pg_temp.t('employee cannot insert form_101_submissions', E1,
     'INSERT INTO public.form_101_submissions (user_id, full_name, identity_number, phone, email, address, city, employer_name, job_title, wage, bank_name, branch_number, account_number, iban) VALUES (auth.uid(), ''x'',''x'',''x'',''x'',''x'',''x'',''x'',''x'',''x'',''x'',''x'',''x'',''x'') RETURNING id::text', 'permission denied');
  v_res := v_res || pg_temp.t('admin cannot read billing_cycles directly', A, 'SELECT count(*)::text FROM public.billing_cycles', 'permission denied');

  -- ===== cycles =====
  v_res := v_res || pg_temp.t('manager cannot close a cycle', M, format('SELECT (public.close_billing_cycle(%L)).month::text', v_last), 'not_authorized');
  v_res := v_res || pg_temp.t('current month cannot be closed yet', A, format('SELECT (public.close_billing_cycle(%L)).month::text', v_this), 'cycle_not_ended');
  v_res := v_res || pg_temp.t('reopen of a never-closed cycle refused', A, format('SELECT (public.reopen_billing_cycle(%L)).month::text', v_last), 'billing_cycle_open');

  -- ===== purge gate: before closing =====
  v_res := v_res || pg_temp.t('purge without aal2 refused (fails closed)', A, format('SELECT public.purge_form_101_submissions(%L)::text', v_last), 'aal2_required');
  v_res := v_res || pg_temp.t('purge with aal2 but open cycle refused', A, format('SELECT public.purge_form_101_submissions(%L)::text', v_last), 'billing_cycle_open', NULL, 'aal2');
  v_res := v_res || pg_temp.t('manager with aal2 refused', M, format('SELECT public.purge_form_101_submissions(%L)::text', v_last), 'not_authorized', NULL, 'aal2');

  -- ===== close, then purge =====
  v_res := v_res || pg_temp.t('admin closes last month', A, format('SELECT (public.close_billing_cycle(%L)).closed_by::text', v_last), 'ok', A::text);
  v_res := v_res || pg_temp.t('closing twice refused', A, format('SELECT (public.close_billing_cycle(%L)).month::text', v_last), 'cycle_already_closed');
  v_res := v_res || pg_temp.t('admin sees the cycle through the RPC', A, format('SELECT count(*)::text FROM public.get_billing_cycles() WHERE month = %L', v_last), 'ok', '1');
  v_res := v_res || pg_temp.t('purge after closing still needs aal2', A, format('SELECT public.purge_form_101_submissions(%L)::text', v_last), 'aal2_required');
  v_res := v_res || pg_temp.t('purge with aal2 on a closed cycle deletes only last-month rows', A, format('SELECT public.purge_form_101_submissions(%L)::text', v_last), 'ok', '1', 'aal2');
  SELECT count(*) = v_before + 1 INTO b FROM public.form_101_submissions;
  v_res := v_res || jsonb_build_object('t', 'this-month submission kept', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('purge recorded on the cycle', A,
     format('SELECT (form_101_purged_count = 1 AND form_101_purged_by = %L)::text FROM public.get_billing_cycles() WHERE month = %L', A, v_last), 'ok', 'true');
  v_res := v_res || pg_temp.t('admin reopens the cycle', A, format('SELECT (public.reopen_billing_cycle(%L)).reopened_by::text', v_last), 'ok', A::text);
  v_res := v_res || pg_temp.t('purge refused again once reopened', A, format('SELECT public.purge_form_101_submissions(%L)::text', v_last), 'billing_cycle_open', NULL, 'aal2');

  SELECT NOT has_function_privilege('anon', 'public.purge_form_101_submissions(date)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.close_billing_cycle(date)', 'EXECUTE')
     AND NOT has_table_privilege('authenticated', 'public.form_101_submissions', 'SELECT')
     AND NOT has_table_privilege('authenticated', 'public.billing_cycles', 'SELECT') INTO b;
  v_res := v_res || jsonb_build_object('t', 'grants locked down', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  RAISE EXCEPTION 'P10F_TEST_RESULTS %', v_res::text;
END $do$;
