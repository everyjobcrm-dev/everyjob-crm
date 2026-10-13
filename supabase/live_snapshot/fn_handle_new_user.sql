-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_functiondef (CRLF normalised to LF). Live-only: not defined anywhere else in this repo. Fired by auth.users trigger on_auth_user_created.
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
BEGIN
  v_first_name := trim(COALESCE(new.raw_user_meta_data ->> 'first_name', ''));
  v_last_name := trim(COALESCE(new.raw_user_meta_data ->> 'last_name', ''));
  v_tz := trim(COALESCE(new.raw_user_meta_data ->> 'tz', ''));
  v_gender := lower(trim(COALESCE(new.raw_user_meta_data ->> 'gender', '')));
  v_phone_number := trim(COALESCE(new.raw_user_meta_data ->> 'phone_number', ''));

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
    role
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
    'employee'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Profile creation failed for auth user %: %', new.id, SQLERRM;
END;
$function$
;
