-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw. Owner-rights view; unused by the app; anon had full grants (see M0b).
CREATE OR REPLACE VIEW public.profiles_public AS
 SELECT id,
    email,
    first_name,
    last_name,
    gender,
    birth_date,
    role,
    created_at
   FROM profiles p;
