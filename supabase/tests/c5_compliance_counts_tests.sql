-- C5 behavior test: get_compliance_counts (Admin only; document counts locked without aal2). Never reads or
-- writes document fields. Same harness as b2; everything rolls back ('C5_TEST_RESULTS'). No DROP.
-- Run AFTER supabase/pending/20261115130000_c5_compliance_counts.sql.
-- Afterwards verify: SELECT count(*) FROM auth.users WHERE email LIKE 'c5test%'; -> 0
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

  FOR rec IN SELECT * FROM (VALUES (A,'admin'),(M,'manager'),(E1,'employee')) AS v(id, role) LOOP
    n := n + 1;
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c5test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'C5', 'tz', pg_temp.tz(31427000 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((45000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role WHERE id = rec.id;
  END LOOP;

  v_res := v_res || pg_temp.t('admin without aal2: document counts locked (NULL), others returned', A,
     'SELECT (documents_locked AND missing_form_101 IS NULL AND missing_bank_details IS NULL AND active_employees >= 1 AND duplicate_tz_groups >= 0)::text FROM public.get_compliance_counts()',
     'ok', 'true');
  v_res := v_res || pg_temp.t('manager refused', M, 'SELECT count(*)::text FROM public.get_compliance_counts()', 'not_authorized');
  v_res := v_res || pg_temp.t('employee refused', E1, 'SELECT count(*)::text FROM public.get_compliance_counts()', 'not_authorized');

  -- with an aal2 claim the counts unlock; the fixture employee E1 has no documents, so both counts are >= 1
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated', 'aal', 'aal2')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    SELECT (NOT documents_locked AND missing_form_101 >= 1 AND missing_bank_details >= 1) INTO b FROM public.get_compliance_counts();
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    b := false;
  END;
  v_res := v_res || jsonb_build_object('t', 'admin with aal2: counts returned', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', COALESCE(b::text, 'null'));

  SELECT NOT has_function_privilege('anon', 'public.get_compliance_counts()', 'EXECUTE') INTO b;
  v_res := v_res || jsonb_build_object('t', 'anon has no EXECUTE', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  RAISE EXCEPTION 'C5_TEST_RESULTS %', v_res::text;
END $do$;
