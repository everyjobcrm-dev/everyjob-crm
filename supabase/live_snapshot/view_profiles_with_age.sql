-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw. Owner-rights view (exposes tz/email/phone); unused by the app; anon had full grants (see M0b).
CREATE OR REPLACE VIEW public.profiles_with_age AS
 SELECT id,
    first_name,
    last_name,
    tz,
    role,
    created_at,
    birth_date,
    email,
    email_verified,
    phone_verified,
    phone_number,
    gender,
    (date_part('year'::text, age((CURRENT_DATE)::timestamp with time zone, (birth_date)::timestamp with time zone)))::integer AS age
   FROM profiles p;
