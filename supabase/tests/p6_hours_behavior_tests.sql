-- Phase 6 hours-flow behavior tests (p6_h0..h5 + E1 worker-only review, H7 credit only when profiles.recruited_by = events.recruiter_id,
-- H6v2 FIFO redemption).
-- Fixtures inside ONE DO block; every assertion impersonated (SET LOCAL ROLE authenticated + request.jwt.claims);
-- the block always ends with RAISE EXCEPTION, so nothing persists.
-- Afterwards verify: SELECT count(*) FROM auth.users WHERE email LIKE 'p6test%'; -> 0
DO $do$
DECLARE
  v_res jsonb := '[]'::jsonb; rec record; n int := 0; b boolean;
  A uuid := gen_random_uuid(); M1 uuid := gen_random_uuid(); M2 uuid := gen_random_uuid();
  R1 uuid := gen_random_uuid(); R2 uuid := gen_random_uuid();
  E1 uuid := gen_random_uuid(); E2 uuid := gen_random_uuid(); E3 uuid := gen_random_uuid();
  E4 uuid := gen_random_uuid(); E5 uuid := gen_random_uuid(); E6 uuid := gen_random_uuid(); EVN uuid; RN uuid;
  rE4 uuid; rE5 uuid; rE6 uuid; sE4 uuid; sE5 uuid; sE6 uuid;
  C uuid; EVP uuid; EVQ uuid; EVF uuid; RP uuid; RQ uuid; RF uuid;
  rE1 uuid; rE2 uuid; rE3 uuid; rA uuid; rM1 uuid; rR2 uuid; rFut uuid;
  sE1 uuid; sE2 uuid; sE3 uuid; sA uuid; sR2 uuid;
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
  EXECUTE $f$
  CREATE FUNCTION pg_temp.sub(p_reg uuid, p_hours numeric, p_rating int DEFAULT NULL) RETURNS text LANGUAGE sql AS $b$
    SELECT format('SELECT (public.submit_shift_hours(%L, now() - interval ''2 days'' - make_interval(hours => %s), now() - interval ''2 days'', %s, %s)).status::text',
                  p_reg, p_hours, p_hours, coalesce(p_rating::text, 'NULL'))
  $b$;
  $f$;

  FOR rec IN SELECT * FROM (VALUES (A,'admin'),(M1,'manager'),(M2,'manager'),(R1,'recruiter'),(R2,'recruiter'),
                                   (E1,'employee'),(E2,'employee'),(E3,'employee'),
                                   (E4,'employee'),(E5,'employee'),(E6,'employee')) AS v(id, role) LOOP
    n := n + 1;
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    VALUES (rec.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p6test' || n || '_' || rec.id || '@example.invalid',
      jsonb_build_object('first_name', 'בדיקה' || n, 'last_name', 'P6', 'tz', pg_temp.tz(14142100 + n * 7), 'gender', 'other',
                         'phone_number', '05' || lpad((43000000 + n)::text, 8, '0'), 'birth_date', '1990-01-01'), now(), now(), now());
    UPDATE public.profiles SET role = rec.role::public.user_role WHERE id = rec.id;
  END LOOP;
  UPDATE public.profiles SET recruiter_bonus_rate = 2 WHERE id IN (R1, R2);
  -- H7 attribution fixtures (set as owner; clients cannot set recruited_by - see the guard test below)
  UPDATE public.profiles SET recruited_by = R1 WHERE id IN (E1, E3, E6);
  UPDATE public.profiles SET recruited_by = R2 WHERE id IN (E4, R2);   -- E4: another recruiter; R2: self (own-hours guard)
  -- E2, E5: recruited_by NULL

  INSERT INTO public.clients (name) VALUES ('P6 test client ' || gen_random_uuid()) RETURNING id INTO C;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id)
    VALUES (C, (now() AT TIME ZONE 'Asia/Jerusalem')::date - 2, 'P6 past R1', 'closed', R1) RETURNING id INTO EVP;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id)
    VALUES (C, (now() AT TIME ZONE 'Asia/Jerusalem')::date - 2, 'P6 past R2', 'closed', R2) RETURNING id INTO EVQ;
  INSERT INTO public.events (client_id, event_date, location, status, recruiter_id)
    VALUES (C, (now() AT TIME ZONE 'Asia/Jerusalem')::date + 10, 'P6 future', 'open', R1) RETURNING id INTO EVF;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVP, 'RP', 10, '10:00', 50) RETURNING id INTO RP;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVQ, 'RQ', 10, '10:00', 50) RETURNING id INTO RQ;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVF, 'RF', 10, '10:00', 50) RETURNING id INTO RF;
  INSERT INTO public.events (client_id, event_date, location, status)
    VALUES (C, (now() AT TIME ZONE 'Asia/Jerusalem')::date - 2, 'P6 no recruiter', 'closed') RETURNING id INTO EVN;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, base_rate) VALUES (EVN, 'RN', 10, '10:00', 50) RETURNING id INTO RN;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate) VALUES (EVP, RP, E1, 'approved', 40) RETURNING id INTO rE1;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVP, RP, E2, 'approved') RETURNING id INTO rE2;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVP, RP, E3, 'approved') RETURNING id INTO rE3;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVP, RP, A, 'approved') RETURNING id INTO rA;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVP, RP, M1, 'approved') RETURNING id INTO rM1;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVQ, RQ, R2, 'approved') RETURNING id INTO rR2;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVF, RF, E1, 'approved') RETURNING id INTO rFut;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVP, RP, E4, 'approved') RETURNING id INTO rE4;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVP, RP, E5, 'approved') RETURNING id INTO rE5;
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status) VALUES (EVP, RP, E6, 'approved') RETURNING id INTO rE6;

  -- ===== submit =====
  v_res := v_res || pg_temp.t('submit: employee -> not_authorized', E1, pg_temp.sub(rE1, 6), 'not_authorized');
  v_res := v_res || pg_temp.t('submit: recruiter -> not_authorized', R1, pg_temp.sub(rE1, 6), 'not_authorized');
  v_res := v_res || pg_temp.t('submit: future event -> shift_not_started', M1,
     format('SELECT (public.submit_shift_hours(%L, now(), now() + interval ''4 hours'', 4)).id::text', rFut), 'shift_not_started');
  v_res := v_res || pg_temp.t('submit: invalid hours -> invalid_hours', M1, pg_temp.sub(rE1, 30), 'invalid_hours');
  v_res := v_res || pg_temp.t('submit: staff own hours -> not_own_registration', M1, pg_temp.sub(rM1, 6), 'not_own_registration');
  v_res := v_res || pg_temp.t('submit: manager M1 for E1 with rating 4 -> pending', M1, pg_temp.sub(rE1, 6, 4), 'ok', 'pending');
  SELECT id INTO sE1 FROM public.shift_hour_submissions WHERE registration_id = rE1;
  SELECT (SELECT average_rating FROM public.profiles WHERE id = E1) = 4
     AND (SELECT total_ratings FROM public.profiles WHERE id = E1) = 1
     AND EXISTS (SELECT 1 FROM public.registration_status_history WHERE registration_id = rE1 AND action = 'hours_submitted' AND actor_id = M1) INTO b;
  v_res := v_res || jsonb_build_object('t', 'h4: manager rating insert updated profiles.average_rating (+ history)', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('submit: another manager M2 on any event -> ok', M2, pg_temp.sub(rE2, 5), 'ok', 'pending');
  SELECT id INTO sE2 FROM public.shift_hour_submissions WHERE registration_id = rE2;
  v_res := v_res || pg_temp.t('submit: admin A for E3 -> ok', A, pg_temp.sub(rE3, 5), 'ok', 'pending');
  SELECT id INTO sE3 FROM public.shift_hour_submissions WHERE registration_id = rE3;
  v_res := v_res || pg_temp.t('submit: M1 for admin-as-worker A -> ok', M1, pg_temp.sub(rA, 5), 'ok', 'pending');
  SELECT id INTO sA FROM public.shift_hour_submissions WHERE registration_id = rA;
  v_res := v_res || pg_temp.t('submit: M1 for recruiter-as-worker R2 (R2 owns EVQ) -> ok', M1, pg_temp.sub(rR2, 4), 'ok', 'pending');
  SELECT id INTO sR2 FROM public.shift_hour_submissions WHERE registration_id = rR2;

  -- ===== approve =====
  v_res := v_res || pg_temp.t('approve: manager -> not_authorized', M1, format('SELECT (public.approve_shift_hours(%L)).status::text', sE1), 'not_authorized');
  v_res := v_res || pg_temp.t('approve: admin own worked hours -> self_review', A, format('SELECT (public.approve_shift_hours(%L)).status::text', sA), 'self_review');
  v_res := v_res || pg_temp.t('approve (E1): admin approves hours the admin submitted -> ok', A, format('SELECT (public.approve_shift_hours(%L)).status::text', sE3), 'ok', 'approved');
  v_res := v_res || pg_temp.t('approve: admin approves E1 -> ok', A, format('SELECT (public.approve_shift_hours(%L)).status::text', sE1), 'ok', 'approved');
  SELECT EXISTS (SELECT 1 FROM public.recruiter_bonuses WHERE source_registration_id = rE1 AND recruiter_id = R1 AND bonus_amount = 12 AND status = 'pending')
     AND EXISTS (SELECT 1 FROM public.recruiter_bonuses WHERE source_registration_id = rE3 AND recruiter_id = R1 AND bonus_amount = 10) INTO b;
  v_res := v_res || jsonb_build_object('t', 'H7: credit to events.recruiter_id R1 when recruited_by = R1 (6x2=12, 5x2=10)', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('approve: R2 own hours on R2''s event -> ok', A, format('SELECT (public.approve_shift_hours(%L)).status::text', sR2), 'ok', 'approved');
  SELECT NOT EXISTS (SELECT 1 FROM public.recruiter_bonuses WHERE source_registration_id = rR2) INTO b;
  v_res := v_res || jsonb_build_object('t', 'H7: never for the recruiter''s own hours (R2 recruited_by = R2, own event)', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('submit E4 (recruited by R2) / E5 (no recruiter) / E6 (R1)', M1,
     format('SELECT (public.submit_shift_hours(%L, now() - interval ''2 days 3 hours'', now() - interval ''2 days'', 3)).status::text || (public.submit_shift_hours(%L, now() - interval ''2 days 3 hours'', now() - interval ''2 days'', 3)).status::text || (public.submit_shift_hours(%L, now() - interval ''2 days 3 hours'', now() - interval ''2 days'', 3)).status::text', rE4, rE5, rE6),
     'ok', 'pendingpendingpending');
  SELECT id INTO sE4 FROM public.shift_hour_submissions WHERE registration_id = rE4;
  SELECT id INTO sE5 FROM public.shift_hour_submissions WHERE registration_id = rE5;
  SELECT id INTO sE6 FROM public.shift_hour_submissions WHERE registration_id = rE6;
  v_res := v_res || pg_temp.t('approve E4, E5, E6', A,
     format('SELECT (public.approve_shift_hours(%L)).status::text || (public.approve_shift_hours(%L)).status::text || (public.approve_shift_hours(%L)).status::text', sE4, sE5, sE6),
     'ok', 'approvedapprovedapproved');
  SELECT NOT EXISTS (SELECT 1 FROM public.recruiter_bonuses WHERE source_registration_id = rE4) INTO b;
  v_res := v_res || jsonb_build_object('t', 'H7: no credit when recruited_by is a different recruiter', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  SELECT NOT EXISTS (SELECT 1 FROM public.recruiter_bonuses WHERE source_registration_id = rE5) INTO b;
  v_res := v_res || jsonb_build_object('t', 'H7: no credit when recruited_by is NULL', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  SELECT EXISTS (SELECT 1 FROM public.recruiter_bonuses WHERE source_registration_id = rE6 AND recruiter_id = R1 AND bonus_amount = 6) INTO b;
  v_res := v_res || jsonb_build_object('t', 'H7: credit for E6 recruited by R1 (3x2=6)', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('guard: non-admin cannot set own profiles.recruited_by', E5,
     format('UPDATE public.profiles SET recruited_by = %L WHERE id = %L RETURNING id::text', R1, E5), 'protected profile fields');
  v_res := v_res || pg_temp.t('guard: manager cannot set an employee''s recruited_by', M1,
     format('WITH u AS (UPDATE public.profiles SET recruited_by = %L WHERE id = %L RETURNING 1) SELECT count(*)::text FROM u', R1, E5), 'ok', '0');
  SELECT (SELECT recruited_by FROM public.profiles WHERE id = E5) IS NULL INTO b;
  v_res := v_res || jsonb_build_object('t', 'guard: E5.recruited_by still NULL after both attempts', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('approve: twice -> invalid_submission_transition', A, format('SELECT (public.approve_shift_hours(%L)).status::text', sE1), 'invalid_submission_transition');
  v_res := v_res || pg_temp.t('resubmit approved -> hours_already_approved', M1, pg_temp.sub(rE1, 7), 'hours_already_approved');

  -- ===== reject =====
  v_res := v_res || pg_temp.t('reject: without reason -> reason_required', A, format('SELECT (public.reject_shift_hours(%L, %L)).status::text', sE2, ' '), 'reason_required');
  v_res := v_res || pg_temp.t('reject: admin rejects E2 -> rejected', A, format('SELECT (public.reject_shift_hours(%L, %L)).status::text', sE2, 'שעות לא תואמות'), 'ok', 'rejected');

  -- ===== void =====
  v_res := v_res || pg_temp.t('resubmit after reject -> pending', M2, pg_temp.sub(rE2, 4), 'ok', 'pending');
  v_res := v_res || pg_temp.t('void: manager voids pending -> ok', M1, format('SELECT (public.void_shift_hours(%L, %L)).voided_at IS NOT NULL', sE2, 'הוזן בטעות'), 'ok', 'true');
  v_res := v_res || pg_temp.t('void: manager voids approved -> not_authorized', M1, format('SELECT (public.void_shift_hours(%L, %L)).id::text', sE1, 'x'), 'not_authorized');
  v_res := v_res || pg_temp.t('void: admin voids approved E1 -> ok', A, format('SELECT (public.void_shift_hours(%L, %L)).voided_at IS NOT NULL', sE1, 'תיקון'), 'ok', 'true');
  SELECT (SELECT status FROM public.recruiter_bonuses WHERE source_registration_id = rE1) = 'voided' INTO b;
  v_res := v_res || jsonb_build_object('t', 'void: E1 credit becomes voided', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('resubmit after void (7h) -> pending', M1, pg_temp.sub(rE1, 7), 'ok', 'pending');
  v_res := v_res || pg_temp.t('approve after resubmit -> ok', A, format('SELECT (public.approve_shift_hours(%L)).status::text', sE1), 'ok', 'approved');
  SELECT EXISTS (SELECT 1 FROM public.recruiter_bonuses WHERE source_registration_id = rE1 AND status = 'pending' AND bonus_amount = 14 AND recruiter_id = R1) INTO b;
  v_res := v_res || jsonb_build_object('t', 'credit revived (pending, 7x2=14)', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);

  -- ===== RLS (h3) and views (h5) =====
  INSERT INTO public.recruiter_bonuses (recruiter_id, source_registration_id, bonus_amount, status) VALUES (R2, rM1, 1, 'pending');  -- fixture: another recruiter's credit
  v_res := v_res || pg_temp.t('RLS: employee sees own submissions only (own:other)', E1,
     format('SELECT count(*) FILTER (WHERE registration_id = %L) || '':'' || count(*) FILTER (WHERE registration_id <> %L) FROM public.shift_hour_submissions', rE1, rE1), 'ok', '1:0');
  v_res := v_res || pg_temp.t('RLS: recruiter sees 0 submissions', R1, 'SELECT count(*)::text FROM public.shift_hour_submissions', 'ok', '0');
  v_res := v_res || pg_temp.t('RLS: recruiter sees own credits only (own:other)', R1,
     format('SELECT count(*) FILTER (WHERE recruiter_id = %L) || '':'' || count(*) FILTER (WHERE recruiter_id <> %L) FROM public.recruiter_bonuses', R1, R1), 'ok', '3:0');
  v_res := v_res || pg_temp.t('RLS: manager sees all credits', M1, format('SELECT (count(*) >= 3)::text FROM public.recruiter_bonuses WHERE recruiter_id IN (%L, %L)', R1, R2), 'ok', 'true');
  v_res := v_res || pg_temp.t('RLS: employee reads no ratings', E1, 'SELECT count(*)::text FROM public.employee_ratings', 'ok', '0');
  v_res := v_res || pg_temp.t('RLS: direct INSERT by authenticated refused', M1,
     format('INSERT INTO public.shift_hour_submissions (registration_id, reported_start, reported_end, reported_hours, submitted_by) VALUES (%L, now() - interval ''1 day'', now(), 1, %L) RETURNING id::text', rE2, M1), 'permission denied');
  v_res := v_res || pg_temp.t('view: v_my_monthly_hours own rows only (own:other)', E1,
     format('SELECT count(*) FILTER (WHERE employee_id = %L) || '':'' || count(*) FILTER (WHERE employee_id <> %L) FROM public.v_my_monthly_hours', E1, E1), 'ok', '1:0');
  v_res := v_res || pg_temp.t('view: E1 approved hours and estimated pay (7h x 40)', E1,
     format('SELECT approved_hours::numeric(10,2) || '':'' || estimated_pay::numeric(10,2) FROM public.v_my_monthly_hours WHERE employee_id = %L', E1), 'ok', '7.00:280.00');
  v_res := v_res || pg_temp.t('view: v_recruiter_pending_credits own only (R1)', R1,
     format('SELECT count(*) FILTER (WHERE recruiter_id <> %L) || '':'' || coalesce(sum(pending_amount) FILTER (WHERE recruiter_id = %L), 0)::numeric(10,2) FROM public.v_recruiter_pending_credits', R1, R1), 'ok', '0:30.00');

  -- ===== H6v2 redeem_recruiter_credits =====
  -- deterministic FIFO order (all rows were created in this transaction): rE3 oldest, then rE1, then rE6
  UPDATE public.recruiter_bonuses SET created_at = now() - interval '3 hours' WHERE source_registration_id = rE3;
  UPDATE public.recruiter_bonuses SET created_at = now() - interval '2 hours' WHERE source_registration_id = rE1;
  UPDATE public.recruiter_bonuses SET created_at = now() - interval '1 hour'  WHERE source_registration_id = rE6;
  v_res := v_res || pg_temp.t('redeem: recruiter -> not_authorized', R1, format('SELECT public.redeem_recruiter_credits(%L, 1)::text', EVP), 'not_authorized');
  v_res := v_res || pg_temp.t('redeem: employee -> not_authorized', E1, format('SELECT public.redeem_recruiter_credits(%L, 1)::text', EVP), 'not_authorized');
  v_res := v_res || pg_temp.t('redeem: p_count 0 -> invalid_count', M1, format('SELECT public.redeem_recruiter_credits(%L, 0)::text', EVP), 'invalid_count');
  v_res := v_res || pg_temp.t('redeem: event without recruiter -> event_has_no_recruiter', M1, format('SELECT public.redeem_recruiter_credits(%L, 1)::text', EVN), 'event_has_no_recruiter');
  v_res := v_res || pg_temp.t('redeem: more than available (5 of 3) -> insufficient_credits', M1, format('SELECT public.redeem_recruiter_credits(%L, 5)::text', EVP), 'insufficient_credits');
  v_res := v_res || pg_temp.t('redeem: manager redeems 2 of 3 -> 2', M1, format('SELECT public.redeem_recruiter_credits(%L, 2)::text', EVP), 'ok', '2');
  SELECT (SELECT status = 'applied' AND redeemed_by = M1 AND redeemed_event_id = EVP AND applied_at IS NOT NULL FROM public.recruiter_bonuses WHERE source_registration_id = rE3)
     AND (SELECT status = 'applied' AND redeemed_by = M1 AND redeemed_event_id = EVP FROM public.recruiter_bonuses WHERE source_registration_id = rE1)
     AND (SELECT status = 'pending' AND redeemed_by IS NULL FROM public.recruiter_bonuses WHERE source_registration_id = rE6) INTO b;
  v_res := v_res || jsonb_build_object('t', 'redeem: the two oldest applied (redeemed_by, redeemed_event_id set), third pending', 'r', CASE WHEN b THEN 'PASS' ELSE 'FAIL' END, 'got', b::text);
  v_res := v_res || pg_temp.t('void hours with an applied credit -> credit_already_applied', A,
     format('SELECT (public.void_shift_hours(%L, %L)).id::text', sE3, 'תיקון'), 'credit_already_applied');

  RAISE EXCEPTION 'P6_TEST_RESULTS %', v_res::text;
END $do$;
