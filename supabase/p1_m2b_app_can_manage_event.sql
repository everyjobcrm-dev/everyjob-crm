-- p1_m2b: DB mirror of the role hierarchy Admin >= Manager >= Recruiter.
-- admin/manager manage every event; a recruiter manages only events they own (events.recruiter_id = auth.uid()).
CREATE OR REPLACE FUNCTION public.app_can_manage_event(p_event_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (
    p.role IN ('admin','manager')
    OR (p.role = 'recruiter' AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.recruiter_id = p.id))));
$$;
REVOKE ALL ON FUNCTION public.app_can_manage_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_can_manage_event(uuid) TO authenticated, service_role;

-- ROLLBACK (after p1_m1d, p1_m1e, p1_m3, p1_m6 are rolled back):
--   DROP FUNCTION public.app_can_manage_event(uuid);
