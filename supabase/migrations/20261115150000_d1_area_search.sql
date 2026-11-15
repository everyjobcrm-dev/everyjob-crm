-- D1 (Stage 1b, quote items 2/5/11): employee city/region/role tags, event region, area-aware search.
-- Replaces 4 live functions; the previous definitions are in 20261115150000_d1_area_search_rollback.sql
-- (captured read-only 2026-11-15, md5 of pg_get_functiondef: handle_new_user 56621d4a..., guard_profile_protected_columns
-- ca596d30..., update_event_details 6c197f26..., search_employees c95cc10f...).
-- Contains DROP (search_employees changes signature/return type). Applied 2026-11-15 via execute_sql on the owner's explicit request; verified read-only after.
BEGIN;

-- 1. Columns. Region = fixed list (same on profiles and events); city free text; role tags free text[] (app offers a list).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS role_tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_region_check CHECK (region IS NULL OR region IN ('צפון','חיפה והקריות','שרון','מרכז','ירושלים','שפלה','דרום')),
  ADD CONSTRAINT profiles_city_length CHECK (city IS NULL OR char_length(city) <= 80),
  ADD CONSTRAINT profiles_role_tags_count CHECK (cardinality(role_tags) <= 20);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.events
  ADD CONSTRAINT events_region_check CHECK (region IS NULL OR region IN ('צפון','חיפה והקריות','שרון','מרכז','ירושלים','שפלה','דרום'));

-- 2. Signup: also read city / region from raw_user_meta_data (optional; an invalid region fails the CHECK).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_first_name text;
  v_last_name text;
  v_tz text;
  v_gender text;
  v_phone_number text;
  v_birth_date date;
  v_city text;
  v_region text;
BEGIN
  v_first_name := trim(COALESCE(new.raw_user_meta_data ->> 'first_name', ''));
  v_last_name := trim(COALESCE(new.raw_user_meta_data ->> 'last_name', ''));
  v_tz := trim(COALESCE(new.raw_user_meta_data ->> 'tz', ''));
  v_gender := lower(trim(COALESCE(new.raw_user_meta_data ->> 'gender', '')));
  v_phone_number := trim(COALESCE(new.raw_user_meta_data ->> 'phone_number', ''));
  v_city := NULLIF(trim(COALESCE(new.raw_user_meta_data ->> 'city', '')), '');
  v_region := NULLIF(trim(COALESCE(new.raw_user_meta_data ->> 'region', '')), '');

  IF v_first_name = '' THEN
    RAISE EXCEPTION 'Missing required field: first_name';
  END IF;

  IF v_last_name = '' THEN
    RAISE EXCEPTION 'Missing required field: last_name';
  END IF;

  IF v_tz = '' THEN
    RAISE EXCEPTION 'Missing required field: tz';
  END IF;

  IF v_gender = '' THEN
    RAISE EXCEPTION 'Missing required field: gender';
  END IF;

  IF v_phone_number = '' THEN
    RAISE EXCEPTION 'Missing required field: phone_number';
  END IF;

  IF v_tz !~ '^[0-9]{8,9}$' THEN
    RAISE EXCEPTION 'Invalid tz: must contain 8-9 digits';
  END IF;

  IF v_gender NOT IN ('male', 'female', 'other') THEN
    RAISE EXCEPTION 'Invalid gender: %', v_gender;
  END IF;

  IF v_phone_number !~ '^0(5[0-9]{8}|[23489][0-9]{7})$' THEN
    RAISE EXCEPTION 'Invalid phone_number: %', v_phone_number;
  END IF;

  BEGIN
    v_birth_date := (COALESCE(new.raw_user_meta_data ->> 'birth_date', ''))::date;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid birth_date: %', COALESCE(new.raw_user_meta_data ->> 'birth_date', '');
  END;

  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    tz,
    birth_date,
    phone_number,
    gender,
    role,
    city,
    region
  )
  VALUES (
    new.id,
    new.email,
    v_first_name,
    v_last_name,
    v_tz,
    v_birth_date,
    v_phone_number,
    v_gender,
    'employee',
    v_city,
    v_region
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Profile creation failed for auth user %: %', new.id, SQLERRM;
END;
$function$;

-- 3. The owner may edit city / region / role_tags on their own profile (SECURITY INVOKER, as live).
CREATE OR REPLACE FUNCTION public.guard_profile_protected_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_allowed constant text[] := ARRAY['first_name','last_name','phone_number','gender','birth_date','city','region','role_tags'];
BEGIN
  IF current_user NOT IN ('anon','authenticated') THEN RETURN NEW; END IF;
  IF public.is_current_user_admin() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'employee';  NEW.can_create_events := false;
    NEW.average_rating := 0; NEW.total_ratings := 0;
    NEW.email_verified := false; NEW.phone_verified := false;
    NEW.approval_status := 'pending'; NEW.approval_set_by := NULL; NEW.approval_set_at := NULL;
    NEW.deleted_at := NULL; NEW.deleted_by := NULL;
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - v_allowed) IS DISTINCT FROM (to_jsonb(OLD) - v_allowed)
     OR (NEW.birth_date IS DISTINCT FROM OLD.birth_date AND OLD.birth_date IS NOT NULL) THEN
    RAISE EXCEPTION 'protected profile fields can only be changed by an admin' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $function$;

-- 4. Staff edit of an employee's area / role tags (Admin any profile, Manager employees only).
CREATE OR REPLACE FUNCTION public.set_employee_area(p_employee_id uuid, p_city text, p_region text, p_role_tags text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor public.profiles.role%TYPE;
  v_target public.profiles.role%TYPE;
BEGIN
  SELECT p.role INTO v_actor FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL;
  IF v_actor IS NULL OR v_actor NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT p.role INTO v_target FROM public.profiles p WHERE p.id = p_employee_id AND p.deleted_at IS NULL;
  IF v_target IS NULL THEN RAISE EXCEPTION 'employee_not_found'; END IF;
  IF v_actor = 'manager' AND v_target <> 'employee' THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles p
     SET city = NULLIF(btrim(p_city), ''),
         region = NULLIF(btrim(p_region), ''),
         role_tags = COALESCE(ARRAY(SELECT DISTINCT btrim(t) FROM unnest(p_role_tags) t WHERE btrim(t) <> ''), '{}')
   WHERE p.id = p_employee_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.set_employee_area(uuid, text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_employee_area(uuid, text, text, text[]) TO authenticated;

-- 5. Event edit: 'region' joins the allow-list (live body otherwise unchanged).
CREATE OR REPLACE FUNCTION public.update_event_details(p_event_id uuid, p_patch jsonb)
 RETURNS events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := COALESCE(public.app_current_role()::text, '');
  v_ev public.events%ROWTYPE;
  v_key text;
  v_today date := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
  v_has_hours boolean;
  v_has_approved boolean;
  v_location text;
  v_date date;
  v_start time;
  v_client uuid;
  v_recruiter uuid;
  v_travel numeric;
  v_min_age int;
  v_min_rating numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN RAISE EXCEPTION 'invalid_patch'; END IF;

  SELECT * INTO v_ev FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found'; END IF;
  IF NOT public.app_can_manage_event(p_event_id) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  IF v_ev.status NOT IN ('pending_rates', 'open', 'closed') THEN RAISE EXCEPTION 'event_not_editable'; END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_patch) LOOP
    IF NOT v_key = ANY (ARRAY['location', 'event_date', 'start_time', 'notes', 'dress_code', 'min_age', 'min_rating',
                              'travel_budget_per_worker', 'client_id', 'recruiter_id', 'region']) THEN
      RAISE EXCEPTION 'forbidden_column: %', v_key USING ERRCODE = '42501';
    END IF;
  END LOOP;

  v_location  := CASE WHEN p_patch ? 'location' THEN btrim(p_patch->>'location') ELSE v_ev.location END;
  v_date      := CASE WHEN p_patch ? 'event_date' THEN (p_patch->>'event_date')::date ELSE v_ev.event_date END;
  v_start     := CASE WHEN p_patch ? 'start_time' THEN (p_patch->>'start_time')::time ELSE v_ev.start_time END;
  v_client    := CASE WHEN p_patch ? 'client_id' THEN (p_patch->>'client_id')::uuid ELSE v_ev.client_id END;
  v_recruiter := CASE WHEN p_patch ? 'recruiter_id' THEN (p_patch->>'recruiter_id')::uuid ELSE v_ev.recruiter_id END;
  v_travel    := CASE WHEN p_patch ? 'travel_budget_per_worker' THEN COALESCE((p_patch->>'travel_budget_per_worker')::numeric, 0)
                      ELSE v_ev.travel_budget_per_worker END;
  v_min_age   := CASE WHEN p_patch ? 'min_age' THEN (p_patch->>'min_age')::int ELSE v_ev.min_age END;
  v_min_rating := CASE WHEN p_patch ? 'min_rating' THEN (p_patch->>'min_rating')::numeric ELSE v_ev.min_rating END;

  IF v_location IS NULL OR v_location = '' OR v_date IS NULL OR v_start IS NULL OR v_client IS NULL THEN
    RAISE EXCEPTION 'invalid_value';
  END IF;
  IF v_travel < 0 OR (v_min_age IS NOT NULL AND v_min_age < 1) OR (v_min_rating IS NOT NULL AND (v_min_rating < 0 OR v_min_rating > 5)) THEN
    RAISE EXCEPTION 'invalid_value';
  END IF;

  IF v_client IS DISTINCT FROM v_ev.client_id AND v_role <> 'admin' THEN
    RAISE EXCEPTION 'forbidden_column: client_id' USING ERRCODE = '42501';
  END IF;
  IF v_recruiter IS DISTINCT FROM v_ev.recruiter_id THEN
    IF v_role NOT IN ('admin', 'manager') THEN RAISE EXCEPTION 'forbidden_column: recruiter_id' USING ERRCODE = '42501'; END IF;
    IF v_recruiter IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_recruiter AND p.role = 'recruiter') THEN
      RAISE EXCEPTION 'recruiter_not_found';
    END IF;
  END IF;

  v_has_hours := EXISTS (SELECT 1 FROM public.shift_hour_submissions s
                          WHERE s.event_id = p_event_id AND s.voided_at IS NULL AND s.status IN ('pending', 'approved'));
  v_has_approved := public.app_event_has_approved_hours(p_event_id);

  IF v_date IS DISTINCT FROM v_ev.event_date THEN
    IF v_has_hours THEN RAISE EXCEPTION 'event_has_hours'; END IF;
    IF v_date < v_today THEN RAISE EXCEPTION 'event_date_past'; END IF;
  END IF;
  IF v_start IS DISTINCT FROM v_ev.start_time AND v_has_hours THEN RAISE EXCEPTION 'event_has_hours'; END IF;
  IF v_has_approved AND (v_travel IS DISTINCT FROM COALESCE(v_ev.travel_budget_per_worker, 0) OR v_recruiter IS DISTINCT FROM v_ev.recruiter_id) THEN
    RAISE EXCEPTION 'event_has_approved_hours';
  END IF;

  UPDATE public.events e
     SET location = v_location,
         event_date = v_date,
         start_time = v_start,
         client_id = v_client,
         recruiter_id = v_recruiter,
         travel_budget_per_worker = v_travel,
         min_age = v_min_age,
         min_rating = v_min_rating,
         notes = CASE WHEN p_patch ? 'notes' THEN NULLIF(btrim(p_patch->>'notes'), '') ELSE e.notes END,
         dress_code = CASE WHEN p_patch ? 'dress_code' THEN NULLIF(btrim(p_patch->>'dress_code'), '') ELSE e.dress_code END,
         region = CASE WHEN p_patch ? 'region' THEN NULLIF(btrim(p_patch->>'region'), '') ELSE e.region END
   WHERE e.id = p_event_id
  RETURNING * INTO v_ev;
  RETURN v_ev;
END;
$function$;

-- 6. search_employees v4: optional event (NULL = staff directory, Admin/Manager only) + region / city / role-tag filters,
--    returns city, region, role_tags, joined_at. Event mode keeps the v3 scope (app_can_manage_event) and warnings.
DROP FUNCTION IF EXISTS public.search_employees(text, uuid);
CREATE FUNCTION public.search_employees(p_query text, p_event_id uuid DEFAULT NULL, p_region text DEFAULT NULL,
                                        p_city text DEFAULT NULL, p_role_tag text DEFAULT NULL)
 RETURNS TABLE(employee_id uuid, first_name text, last_name text, phone_number text, age_years integer, average_rating numeric,
               registration_id uuid, registration_status text, registered_at timestamp with time zone, wage_rate numeric,
               base_rate numeric, event_role_id uuid, event_role_name text, warnings text[],
               city text, region text, role_tags text[], joined_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_actor_role public.profiles.role%TYPE;
  v_q text := lower(btrim(coalesce(p_query, '')));
  v_city text := lower(btrim(coalesce(p_city, '')));
  v_tag text := btrim(coalesce(p_role_tag, ''));
  v_region text := NULLIF(btrim(coalesce(p_region, '')), '');
  v_filtered boolean;
BEGIN
  SELECT p.role INTO v_actor_role
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.deleted_at IS NULL;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'manager', 'recruiter') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_event_id IS NULL THEN
    -- directory mode: Admin/Manager act on all employees; a Recruiter only through an own event
    IF v_actor_role NOT IN ('admin', 'manager') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id) THEN
      RAISE EXCEPTION 'event_not_found';
    END IF;
    IF NOT public.app_can_manage_event(p_event_id) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  END IF;
  v_filtered := v_region IS NOT NULL OR v_city <> '' OR v_tag <> '';

  RETURN QUERY
  WITH target_event AS (
    SELECT e.id, e.event_date, e.min_age, e.min_rating
    FROM public.events e
    WHERE e.id = p_event_id
  ),
  matching_employees AS (
    SELECT p.id
    FROM public.profiles p
    WHERE p.role = 'employee'
      AND p.deleted_at IS NULL
      AND (CASE
             WHEN length(v_q) >= 2 THEN
               position(v_q IN lower(concat_ws(' ', p.first_name, p.last_name))) > 0
               OR position(v_q IN lower(coalesce(p.phone_number, ''))) > 0
               OR position(v_q IN lower(coalesce(p.city, ''))) > 0
             WHEN length(v_q) = 0 THEN v_filtered OR p_event_id IS NULL
             ELSE false
           END)
      AND (v_region IS NULL OR p.region = v_region)
      AND (v_city = '' OR position(v_city IN lower(coalesce(p.city, ''))) > 0)
      AND (v_tag = '' OR v_tag = ANY (p.role_tags))
    ORDER BY p.last_name, p.first_name, p.id
    LIMIT CASE WHEN p_event_id IS NULL THEN 200 ELSE 20 END
  ),
  employees AS (
    SELECT p.id
    FROM public.profiles p
    WHERE p.role = 'employee'
      AND p.deleted_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.event_registrations r
        WHERE r.event_id = p_event_id AND r.user_id = p.id
      )
    UNION
    SELECT m.id FROM matching_employees m
  )
  SELECT
    p.id::uuid,
    p.first_name::text,
    p.last_name::text,
    p.phone_number::text,
    (CASE WHEN p.birth_date IS NULL THEN NULL
      ELSE extract(year FROM age(current_date, p.birth_date))::integer
    END)::integer,
    p.average_rating::numeric,
    r.id::uuid,
    r.status::text,
    r.created_at::timestamptz,
    (CASE WHEN v_actor_role IN ('admin', 'manager') THEN r.wage_rate END)::numeric,
    (CASE WHEN v_actor_role IN ('admin', 'manager') THEN role.base_rate END)::numeric,
    r.event_role_id::uuid,
    role.role_name::text,
    array_remove(ARRAY[
      CASE WHEN p.approval_status = 'pending' THEN 'pending_approval' END,
      CASE WHEN p.approval_status = 'rejected' THEN 'approval_rejected' END,
      CASE
        WHEN target_event.min_rating IS NOT NULL
          AND coalesce(p.average_rating, 0) < target_event.min_rating
        THEN 'below_min_rating'
      END,
      CASE
        WHEN target_event.min_age IS NOT NULL
          AND (p.birth_date IS NULL OR extract(year FROM age(current_date, p.birth_date)) < target_event.min_age)
        THEN 'below_min_age'
      END,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM public.event_registrations other_registration
          JOIN public.events other_event ON other_event.id = other_registration.event_id
          JOIN public.event_roles other_role ON other_role.id = other_registration.event_role_id
          JOIN public.event_roles target_role ON target_role.event_id = target_event.id
          WHERE other_registration.user_id = p.id
            AND other_registration.status = 'approved'
            AND other_event.event_date = target_event.event_date
            AND other_event.id <> target_event.id
            AND (
              other_role.end_time IS NULL
              OR target_role.end_time IS NULL
              OR (
                other_event.event_date + other_role.start_time,
                other_event.event_date + other_role.end_time
                  + CASE WHEN other_role.end_time <= other_role.start_time
                    THEN interval '1 day' ELSE interval '0' END
              ) OVERLAPS (
                target_event.event_date + target_role.start_time,
                target_event.event_date + target_role.end_time
                  + CASE WHEN target_role.end_time <= target_role.start_time
                    THEN interval '1 day' ELSE interval '0' END
              )
            )
        )
        THEN 'overlap'
      END
    ], NULL::text)::text[],
    p.city::text,
    p.region::text,
    p.role_tags::text[],
    p.created_at::timestamptz
  FROM employees selected
  JOIN public.profiles p ON p.id = selected.id
  LEFT JOIN target_event ON true
  LEFT JOIN public.event_registrations r
    ON r.event_id = target_event.id AND r.user_id = p.id
  LEFT JOIN public.event_roles role ON role.id = r.event_role_id
  ORDER BY (r.id IS NOT NULL) DESC, p.last_name, p.first_name, p.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.search_employees(text, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_employees(text, uuid, text, text, text) TO authenticated, service_role;

COMMIT;
