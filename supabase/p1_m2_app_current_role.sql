-- p1_m2: caller's role from profiles (SECURITY DEFINER so it works regardless of profiles RLS).
CREATE OR REPLACE FUNCTION public.app_current_role() RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;
REVOKE ALL ON FUNCTION public.app_current_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_current_role() TO authenticated, service_role;

-- ROLLBACK (after p1_m1c, p1_m1d, p1_m3, p1_m6 are rolled back):
--   DROP FUNCTION public.app_current_role();
