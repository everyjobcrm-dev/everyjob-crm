-- Phase 6 hours-flow behavior tests - NOT RUN. Run only AFTER p6_h0..p6_h5 are approved and applied.
-- Same pattern as p3/p4: fixtures inside ONE DO block, every assertion impersonated (SET LOCAL ROLE authenticated +
-- request.jwt.claims), and the block always ends with RAISE EXCEPTION, so nothing persists.
-- Afterwards verify: SELECT count(*) FROM auth.users WHERE email LIKE 'p6test%'; -> 0
DO $do$
DECLARE
  v_res jsonb := '[]'::jsonb; rec record; n int := 0; b boolean;
  A uuid := gen_random_uuid(); A2 uuid := gen_random_uuid(); M uuid := gen_random_uuid(); R1 uuid := gen_random_uuid();
  E1 uuid := gen_random_uuid(); E2 uuid := gen_random_uuid();
  C uuid; EVP uuid; EVF uuid; RP uuid; RF uuid;
  rE1 uuid; rE2 uuid; rA uuid; rM uuid; rF uuid; sE1 uuid; sE2 uuid; sA uuid;
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

  FOR rec IN SELECT * FROM (VALUES (A,'admin'),(A2,'admin'),(M,'manager'),(R1,'recruiter'),(E1,'employee'),(E2,'employee')) AS v(id, role) LOOP
    n := n + 1;
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p6test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'P6', 'tz', pg_temp.tz(14142100 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((43000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role WHERE id = rec.id;
  END LOOP;
  UPDATE public.profiles SET recruiter_bonus_rate = 2 WHERE id = R1;

  INSERT INTO public.clients (name) VALUES ('P6 test client ' || gen_random_uuid()) RETURNING id INTO C;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id)
    VALUES (C, (now() AT TIME ZONE 'Asia/Jerusalem')::date - 2, 'P6 past', 'closed', R1) RETURNING id INTO EVP;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id)
    VALUES (C, (now() AT TIME ZONE 'Asia/Jerusalem')::date + 10, 'P6 future', 'open', R1) RETURNING id INTO EVF;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVP, 'RP', 10, '10:00', 50) RETURNING id INTO RP;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVF, 'RF', 10, '10:00', 50) RETURNING id INTO RF;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, recruiter_id, wage_rate)
    VALUES (EVP, RP, E1, 'approved', R1, 40) RETURNING id INTO rE1;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVP, RP, E2, 'approved') RETURNING id INTO rE2;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVP, RP, A, 'approved') RETURNING id INTO rA;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVP, RP, M, 'approved') RETURNING id INTO rM;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVF, RF, E1, 'approved') RETURNING id INTO rF;

  -- submit
  v_res := v_res || pg_temp.t('submit: recruiter refused', R1,
     format('SELECT (public.submit_shift_hours(%L, now() - interval ''2 days 6 hours'', now() - interval ''2 days'', 6)).id::text', rE1), 'not_authorized');
  v_res := v_res || pg_temp.t('submit: future event refused', M,
     format('SELECT (public.submit_shift_hours(%L, now(), now() + interval ''4 hours'', 4)).id::text', rF), 'shift_not_started');
  v_res := v_res || pg_temp.t('submit: own registration refused', M,
     format('SELECT (public.submit_shift_hours(%L, now() - interval ''2 days 6 hours'', now() - interval ''2 days'', 6)).id::text', rM), 'not_own_registration');
  v_res := v_res || pg_temp.t('submit: manager for E1 (+rating 4) -> pending', M,
     format('SELECT (public.submit_shift_hours(%L, now() - interval ''2 days 6 hours'', now() - interval ''2 days'', 6, 4, %L)).status::text', rE1, 'טוב'), 'ok', 'pending');
  SELECT id INTO sE1 FROM public.shift_hour_submissions WHERE registration_id = rE1;
  SELECT (SELECT average_rating FROM public.profiles WHERE id = E1) = 4
     AND EXISTS (SELECT 1 FROM public.registration_status_history WHERE registration_id = rE1 AND action = 'hours_submitted') INTO b;
  v_res := v_res || jsonb_build_object('t', 'submit: rating trigger (DEFINER) updated average + history', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('submit: A2 for E2', A2,
     format('SELECT (public.submit_shift_hours(%L, now() - interval ''2 days 5 hours'', now() - interval ''2 days'', 5)).status::text', rE2), 'ok', 'pending');
  SELECT id INTO sE2 FROM public.shift_hour_submissions WHERE registration_id = rE2;
  v_res := v_res || pg_temp.t('submit: manager for admin A (staff-as-worker)', M,
     format('SELECT (public.submit_shift_hours(%L, now() - interval ''2 days 5 hours'', now() - interval ''2 days'', 5)).status::text', rA), 'ok', 'pending');
  SELECT id INTO sA FROM public.shift_hour_submissions WHERE registration_id = rA;

  -- approve / reject
  v_res := v_res || pg_temp.t('approve: manager refused', M, format('SELECT (public.approve_shift_hours(%L)).status::text', sE1), 'not_authorized');
  v_res := v_res || pg_temp.t('approve: admin on own hours -> self_review', A, format('SELECT (public.approve_shift_hours(%L)).status::text', sA), 'self_review');
  v_res := v_res || pg_temp.t('approve: submitter cannot approve -> two_person_review', A2, format('SELECT (public.approve_shift_hours(%L)).status::text', sE2), 'two_person_review');
  v_res := v_res || pg_temp.t('approve: admin A approves E1', A, format('SELECT (public.approve_shift_hours(%L)).status::text', sE1), 'ok', 'approved');
  SELECT EXISTS (SELECT 1 FROM public.recruiter_bonuses WHERE source_registration_id = rE1 AND recruiter_id = R1 AND bonus_amount = 12 AND status = 'pending') INTO b;
  v_res := v_res || jsonb_build_object('t', 'approve: credit 6h x 2 = 12 for R1', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('resubmit approved -> hours_already_approved', M,
     format('SELECT (public.submit_shift_hours(%L, now() - interval ''2 days 6 hours'', now() - interval ''2 days'', 7)).id::text', rE1), 'hours_already_approved');
  v_res := v_res || pg_temp.t('reject: empty reason', A, format('SELECT (public.reject_shift_hours(%L, %L)).status::text', sE2, ' '), 'reason_required');
  v_res := v_res || pg_temp.t('reject: admin A rejects E2', A, format('SELECT (public.reject_shift_hours(%L, %L)).status::text', sE2, 'שעות לא תואמות'), 'ok', 'rejected');

  -- void
  v_res := v_res || pg_temp.t('void: manager voids rejected', M, format('SELECT (public.void_shift_hours(%L, %L)).voided_at IS NOT NULL', sE2, 'הוזן בטעות'), 'ok', 'true');
  v_res := v_res || pg_temp.t('void: manager cannot void approved', M, format('SELECT (public.void_shift_hours(%L, %L)).id::text', sE1, 'x'), 'not_authorized');
  v_res := v_res || pg_temp.t('void: admin voids approved', A, format('SELECT (public.void_shift_hours(%L, %L)).voided_at IS NOT NULL', sE1, 'תיקון'), 'ok', 'true');
  SELECT (SELECT status FROM public.recruiter_bonuses WHERE source_registration_id = rE1) = 'voided' INTO b;
  v_res := v_res || jsonb_build_object('t', 'void: pending credit voided', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('resubmit after void -> pending', M,
     format('SELECT (public.submit_shift_hours(%L, now() - interval ''2 days 6 hours'', now() - interval ''2 days'', 6)).status::text', rE1), 'ok', 'pending');

  -- RLS (p6_h3) and views (p6_h5)
  v_res := v_res || pg_temp.t('RLS: employee sees own submission only', E1,
     format('SELECT count(*) FILTER (WHERE registration_id = %L) || '':'' || count(*) FILTER (WHERE registration_id = %L) FROM public.shift_hour_submissions', rE1, rE2), 'ok', '1:0');
  v_res := v_res || pg_temp.t('RLS: recruiter sees no submissions', R1, 'SELECT count(*)::text FROM public.shift_hour_submissions', 'ok', '0');
  v_res := v_res || pg_temp.t('RLS: employee direct INSERT refused', E1,
     format('INSERT INTO public.shift_hour_submissions (registration_id, reported_start, reported_end, reported_hours, submitted_by) VALUES (%L, now() - interval ''1 day'', now(), 1, %L) RETURNING id::text', rE1, E1), 'permission denied');
  v_res := v_res || pg_temp.t('RLS: recruiter reads own credits', R1, format('SELECT count(*)::text FROM public.recruiter_bonuses WHERE source_registration_id = %L', rE1), 'ok', '1');
  v_res := v_res || pg_temp.t('RLS: employee reads no ratings', E1, 'SELECT count(*)::text FROM public.employee_ratings', 'ok', '0');

  RAISE EXCEPTION 'P6_TEST_RESULTS %', v_res::text;
END $do$;
