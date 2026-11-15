-- PENDING (not applied). Sales-demo data, NOT a migration (do not save to supabase/migrations/).
-- Owner runs it in the SQL Editor (runs as postgres, so the app guards are bypassed on purpose for the seed only).
-- Idempotent: does nothing if the demo clients already exist. Remove with 20261115_demo_seed_rollback.sql.
-- No Form 101 / bank data (AGENTS §8.2). Requires migration D1 (20261115150000_d1_area_search: city / region / role_tags).
--
-- Creates:
--   * 16 roster employees (auth.users -> profiles via on_auth_user_created). No password: they cannot sign in,
--     they only fill rosters. Emails *@everyjob-demo.invalid (the rollback key). 14 approved, 2 pending approval
--     (to demo "אישור עובד חדש"). Odd-numbered ones have recruited_by = rec1 (recruitment credits on approval).
--     tz 27180001..27180016: digits-only, no Israeli check digit (shortcut: fine for a demo DB, not for prod data).
--   * 4 clients with contacts and a per-role price list.
--   * 7 events (today = 2026-11-15):
--       past   E1 2026-10-18 closed, hours APPROVED   E2 2026-11-02 closed, hours APPROVED
--              E3 2026-11-12 closed, hours PENDING (the Admin approval board has work; approving creates credits)
--       future E4 2026-11-20 open (bartender role full + waitlist)   E5 2026-11-27 open, min_age 18
--              E6 2026-12-04 open   E7 2026-12-11 pending_rates (one role without a rate)
-- Sign-in accounts are the existing demo users (handoff §2): ADM, MGR, REC1, EMP1, EMP2 below. EMP1/EMP2 get shifts.
-- Areas (Stage 1b): every event has a region (E6 is in the south); EMP1 = באר שבע / דרום, EMP2 = תל אביב / מרכז;
--   the 16 roster employees get a city, region and role tags (4 bartenders in מרכז: "ברמנים במרכז").
DO $seed$
DECLARE
  ADM uuid := '27e864c1-a76e-4086-9ac3-42e8f0605103'; MGR uuid := 'c57bd119-7f4e-4b13-b4b5-352c6656560d';
  REC1 uuid := 'c73c98f5-8c85-4301-9638-1561d773fda5';
  EMP1 uuid := '52d36bda-8352-4031-b72b-2acbc7d11779'; EMP2 uuid := '3d693927-0ce8-4cb6-8c9a-c11d40b2f2a5';
  fn text[] := ARRAY['נועה','איתי','מאיה','דניאל','שירה','עומר','תמר','יונתן','רוני','אלון','ליה','אורי','הילה','עידו','יעל','אביב'];
  ln text[] := ARRAY['לוי','כהן','פרץ','אברהם','מזרחי','ביטון','אוחיון','דהן','גבאי','שפירא','חדד','אזולאי','סויסה','מלכה','בן דוד','נחום'];
  gd text[] := ARRAY['female','male','female','male','female','male','female','male','female','male','female','male','female','male','female','male'];
  yr int[]  := ARRAY[2001,1999,2003,1997,2002,2000,1995,2004,1998,1993,2005,2001,1996,2002,1999,2003];
  ct text[] := ARRAY['ראשון לציון','תל אביב','באר שבע','רמת גן','חולון','הרצליה','אשדוד','תל אביב','נתניה','באר שבע','חיפה','גבעתיים','ירושלים','רחובות','אשקלון','קריית ביאליק'];
  rg text[] := ARRAY['שפלה','מרכז','דרום','מרכז','מרכז','שרון','דרום','מרכז','שרון','דרום','חיפה והקריות','מרכז','ירושלים','שפלה','דרום','חיפה והקריות'];
  tg text[] := ARRAY['מלצר/ית','מלצר/ית,ברמן/ית','מלצר/ית,סדרן/ית','סדרן/ית','ברמן/ית,מלצר/ית','ברמן/ית','מלצר/ית,מארח/ת','מלצר/ית,ברמן/ית','מלצר/ית','מלצר/ית,קופאי/ת','ברמן/ית','ברמן/ית,קופאי/ת','סדרן/ית','סדרן/ית,מאבטח/ת','מלצר/ית','מארח/ת'];
  W uuid[] := '{}'; uid uuid;
  C1 uuid; C2 uuid; C3 uuid; C4 uuid;
  E uuid[] := '{}'; R uuid[] := '{}'; ev uuid;
  i int;
BEGIN
  IF EXISTS (SELECT 1 FROM public.clients WHERE name = 'אולמי הגן הקסום') THEN
    RAISE NOTICE 'demo seed already present, nothing done'; RETURN;
  END IF;

  -- employees
  FOR i IN 1..16 LOOP
    uid := gen_random_uuid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
            format('demo.emp%s@everyjob-demo.invalid', lpad(i::text, 2, '0')), '', now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('first_name', fn[i], 'last_name', ln[i], 'gender', gd[i],
                               'tz', '271800' || lpad(i::text, 2, '0'),
                               'phone_number', '05012300' || lpad(i::text, 2, '0'),
                               'birth_date', make_date(yr[i], 1 + (i % 12), 1 + (i * 3 % 27))::text,
                               'city', ct[i], 'region', rg[i]),
            now(), now(), '', '', '', '');
    W := W || uid;
  END LOOP;
  UPDATE public.profiles p SET role = 'employee',
         approval_status = CASE WHEN p.id IN (W[15], W[16]) THEN 'pending' ELSE 'approved' END,
         recruited_by = CASE WHEN array_position(W, p.id) % 2 = 1 THEN REC1 END,
         role_tags = string_to_array(tg[array_position(W, p.id)], ',')
   WHERE p.id = ANY(W);
  -- the two demo sign-in employees: EMP1 in the south (sees E6 first), EMP2 in the centre
  UPDATE public.profiles SET city = 'באר שבע', region = 'דרום', role_tags = '{מלצר/ית}' WHERE id = EMP1;
  UPDATE public.profiles SET city = 'תל אביב', region = 'מרכז', role_tags = '{סדרן/ית}' WHERE id = EMP2;

  -- clients (preferred_roles = per-role client price list, contacts = jsonb list)
  INSERT INTO public.clients (name, industry, company_id, address, notes, min_billable_hours, contacts, preferred_roles, status, created_by)
  VALUES ('אולמי הגן הקסום', 'אולמות אירועים', '514000001', 'דרך השדות 12, ראשון לציון', 'חתונות ואירועי ערב, חניה לעובדים מאחורי האולם', 4,
          '[{"name":"מיכל אדרי","phone":"0523001001"}]',
          '[{"role":"מלצר/ית","rate":85},{"role":"ברמן/ית","rate":95}]', 'active', ADM) RETURNING id INTO C1;
  INSERT INTO public.clients (name, industry, company_id, address, notes, min_billable_hours, contacts, preferred_roles, status, created_by)
  VALUES ('קייטרינג טעמים', 'קייטרינג', '514000002', 'המלאכה 7, חולון', 'אירועי חברה בצהריים', 4,
          '[{"name":"רועי שטרן","phone":"0523001002"},{"name":"דנה גל","phone":"0523001003"}]',
          '[{"role":"מלצר/ית","rate":80},{"role":"מארח/ת","rate":82}]', 'active', ADM) RETURNING id INTO C2;
  INSERT INTO public.clients (name, industry, company_id, address, notes, min_billable_hours, contacts, preferred_roles, status, created_by)
  VALUES ('מרכז הכנסים ים התיכון', 'כנסים ותערוכות', '514000003', 'שדרות התערוכה 3, תל אביב', 'כניסת עובדים משער 4', 6,
          '[{"name":"אסף ברק","phone":"0523001004"}]',
          '[{"role":"סדרן/ית","rate":78},{"role":"מארח/ת","rate":82}]', 'active', ADM) RETURNING id INTO C3;
  INSERT INTO public.clients (name, industry, company_id, address, notes, min_billable_hours, contacts, preferred_roles, status, created_by)
  VALUES ('פסטיבל אור בפארק', 'פסטיבלים', '514000004', 'פארק הירקון, תל אביב', NULL, 5,
          '[{"name":"ענבל רז","phone":"0523001005"}]',
          '[{"role":"סדרן/ית","rate":78},{"role":"קופאי/ת","rate":86}]', 'active', ADM) RETURNING id INTO C4;

  -- events + roles. R[] index is referenced by the registrations below.
  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id, travel_budget_per_worker, dress_code, notes)
  VALUES (C1, '2026-10-18', '18:00', 'אולמי הגן הקסום - אולם הגפן', 'closed', REC1, 25, 'חולצה לבנה, מכנס שחור', 'חתונה, 350 אורחים') RETURNING id INTO ev; E := E || ev;
  -- מלצר/ית, ברמן/ית -> R1, R2
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client)
  VALUES (ev, 'מלצר/ית', 6, '18:00', '23:30', 50, 85) RETURNING id INTO uid; R := R || uid;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client)
  VALUES (ev, 'ברמן/ית', 2, '18:00', '23:30', 58, 95) RETURNING id INTO uid; R := R || uid;

  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id, travel_budget_per_worker, dress_code, notes)
  VALUES (C2, '2026-11-02', '10:30', 'מגדלי הייטק, הרצליה פיתוח', 'closed', REC1, 20, 'שחור מלא', 'כנס מכירות שנתי') RETURNING id INTO ev; E := E || ev;
  -- R3 מלצר/ית, R4 מארח/ת
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client)
  VALUES (ev, 'מלצר/ית', 5, '11:00', '16:00', 48, 80) RETURNING id INTO uid; R := R || uid;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client)
  VALUES (ev, 'מארח/ת', 2, '10:30', '15:00', 50, 82) RETURNING id INTO uid; R := R || uid;

  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id, travel_budget_per_worker, dress_code, notes)
  VALUES (C3, '2026-11-12', '08:00', 'מרכז הכנסים ים התיכון - ביתן 2', 'closed', REC1, 30, 'חולצת צוות (תסופק במקום)', 'תערוכת טכנולוגיה') RETURNING id INTO ev; E := E || ev;
  -- R5 סדרן/ית, R6 מארח/ת
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client)
  VALUES (ev, 'סדרן/ית', 6, '08:00', '16:00', 47, 78) RETURNING id INTO uid; R := R || uid;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client)
  VALUES (ev, 'מארח/ת', 2, '08:00', '14:00', 50, 82) RETURNING id INTO uid; R := R || uid;

  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id, travel_budget_per_worker, dress_code, notes)
  VALUES (C1, '2026-11-20', '18:30', 'אולמי הגן הקסום - אולם הזית', 'open', REC1, 25, 'חולצה לבנה, מכנס שחור', 'בר מצווה') RETURNING id INTO ev; E := E || ev;
  -- R7 מלצר/ית, R8 ברמן/ית
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client)
  VALUES (ev, 'מלצר/ית', 6, '18:30', '23:30', 50, 85) RETURNING id INTO uid; R := R || uid;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client)
  VALUES (ev, 'ברמן/ית', 2, '18:30', '23:30', 58, 95) RETURNING id INTO uid; R := R || uid;

  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id, travel_budget_per_worker, min_age, notes)
  VALUES (C4, '2026-11-27', '15:30', 'פארק הירקון - מתחם הדשא הגדול', 'open', REC1, 40, 18, 'פסטיבל מוזיקה, 5,000 מבקרים') RETURNING id INTO ev; E := E || ev;
  -- R9 סדרן/ית, R10 קופאי/ת
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client)
  VALUES (ev, 'סדרן/ית', 10, '16:00', '23:00', 47, 78) RETURNING id INTO uid; R := R || uid;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client)
  VALUES (ev, 'קופאי/ת', 3, '15:30', '22:30', 52, 86) RETURNING id INTO uid; R := R || uid;

  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id, travel_budget_per_worker, dress_code)
  VALUES (C2, '2026-12-04', '19:00', 'היכל התרבות, באר שבע', 'open', NULL, 20, 'שחור מלא') RETURNING id INTO ev; E := E || ev;
  -- R11
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client)
  VALUES (ev, 'מלצר/ית', 8, '19:00', '23:30', 48, 80) RETURNING id INTO uid; R := R || uid;

  INSERT INTO public.events (client_id, event_date, start_time, location, status, recruiter_id, travel_budget_per_worker, notes)
  VALUES (C3, '2026-12-11', '07:30', 'מרכז הכנסים ים התיכון - ביתן 1', 'pending_rates', REC1, 30, 'ממתין לאישור תעריף סדרנים מהלקוח') RETURNING id INTO ev; E := E || ev;
  INSERT INTO public.event_roles (event_id, role_name, headcount, start_time, end_time, base_rate, bill_to_client) VALUES
    (ev, 'סדרן/ית', 8, '07:30', '17:00', NULL, NULL), (ev, 'מארח/ת', 3, '07:30', '15:00', 50, 82);

  -- event regions (E1..E7)
  UPDATE public.events e SET region = v.rg
    FROM unnest(E, ARRAY['שפלה','שרון','מרכז','שפלה','מרכז','דרום','מרכז']) AS v(id, rg) WHERE e.id = v.id;

  -- registrations: (role index, worker: 0 = EMP1, -1 = EMP2, 1..16 = W[n], status, wage_rate)
  INSERT INTO public.event_registrations (event_id, event_role_id, user_id, status, wage_rate, created_by)
  SELECT er.event_id, er.id, CASE v.w WHEN 0 THEN EMP1 WHEN -1 THEN EMP2 ELSE W[v.w] END,
         v.st::public.registration_status, v.rate, ADM
    FROM (VALUES
      (1,0,'approved',50),(1,-1,'approved',50),(1,1,'approved',50),(1,2,'approved',50),(1,3,'approved',50),(1,4,'approved',50),
      (2,5,'approved',58),(2,6,'approved',58),
      (3,0,'approved',48),(3,7,'approved',48),(3,8,'approved',48),(3,9,'approved',48),(3,10,'approved',48),
      (4,11,'approved',50),(4,12,'approved',50),
      (5,-1,'approved',47),(5,1,'approved',47),(5,3,'approved',47),(5,5,'approved',47),(5,13,'approved',47),(5,14,'approved',47),
      (6,2,'approved',50),(6,4,'approved',50),
      (7,0,'approved',50),(7,6,'approved',50),(7,8,'approved',50),(7,9,'pending',NULL),(7,10,'pending',NULL),
      (8,11,'approved',58),(8,12,'approved',58),(8,13,'waitlisted',NULL),
      (9,1,'approved',47),(9,2,'approved',47),(9,3,'approved',47),(9,5,'approved',47),(9,7,'approved',47),
      (9,-1,'pending',NULL),(9,14,'pending',NULL),
      (10,4,'approved',52),(10,12,'pending',NULL),
      (11,9,'approved',48),(11,10,'approved',48),(11,0,'pending',NULL)
    ) AS v(r, w, st, rate)
    JOIN public.event_roles er ON er.id = R[v.r];

  -- hour reports for the three past events: E1/E2 approved by Admin, E3 pending (submitted by the Manager)
  INSERT INTO public.shift_hour_submissions (registration_id, reported_start, reported_end, reported_hours, submitted_by,
                                             submitted_at, status, reviewed_by, reviewed_at, performance_rating)
  SELECT r.id,
         (e.event_date + er.start_time) AT TIME ZONE 'Asia/Jerusalem',
         (e.event_date + er.end_time) AT TIME ZONE 'Asia/Jerusalem',
         round((extract(epoch FROM er.end_time - er.start_time) / 3600)::numeric, 2),
         MGR, (e.event_date + 1)::timestamptz,
         (CASE WHEN e.id = E[3] THEN 'pending' ELSE 'approved' END)::public.submission_status,
         CASE WHEN e.id <> E[3] THEN ADM END,
         CASE WHEN e.id <> E[3] THEN (e.event_date + 3)::timestamptz END,
         3 + abs(hashtext(r.id::text)) % 3
    FROM public.event_registrations r
    JOIN public.event_roles er ON er.id = r.event_role_id
    JOIN public.events e ON e.id = r.event_id
   WHERE r.event_id IN (E[1], E[2], E[3]) AND r.status = 'approved';

  -- ratings for the two approved past events (skip any a trigger already wrote)
  INSERT INTO public.employee_ratings (employee_id, event_id, rater_id, rating)
  SELECT r.user_id, r.event_id, MGR, 4 + abs(hashtext(r.id::text || 'r')) % 2
    FROM public.event_registrations r
   WHERE r.event_id IN (E[1], E[2]) AND r.status = 'approved'
     AND NOT EXISTS (SELECT 1 FROM public.employee_ratings x WHERE x.employee_id = r.user_id AND x.event_id = r.event_id);

  RAISE NOTICE 'demo seed created: 16 employees, 4 clients, % events', array_length(E, 1);
END $seed$;

-- Verify (read-only):
--   SELECT c.name, e.event_date, e.status, count(r.*) FILTER (WHERE r.status = 'approved') AS approved,
--          count(r.*) FILTER (WHERE r.status = 'pending') AS pending, count(r.*) FILTER (WHERE r.status = 'waitlisted') AS waitlisted
--     FROM public.events e JOIN public.clients c ON c.id = e.client_id LEFT JOIN public.event_registrations r ON r.event_id = e.id
--    WHERE c.name IN ('אולמי הגן הקסום','קייטרינג טעמים','מרכז הכנסים ים התיכון','פסטיבל אור בפארק')
--    GROUP BY 1,2,3 ORDER BY 2;                                   -- expect 7 rows
--   SELECT status, count(*) FROM public.shift_hour_submissions s JOIN public.events e ON e.id = s.event_id
--     JOIN public.clients c ON c.id = e.client_id WHERE c.name IN ('אולמי הגן הקסום','קייטרינג טעמים','מרכז הכנסים ים התיכון')
--    GROUP BY 1;                                                  -- approved 15, pending 8
