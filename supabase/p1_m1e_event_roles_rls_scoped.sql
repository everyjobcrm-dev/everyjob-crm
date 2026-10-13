-- p1_m1e: event_roles RLS scoped to the parent event (amendment A: a recruiter only touches roles of events they own).
-- Admin/manager: all events. The SELECT policy "Authenticated users can view event_roles" (USING true) is untouched.
DROP POLICY "Admins and authorized recruiters can manage event_roles" ON public.event_roles;
CREATE POLICY event_roles_insert_scoped ON public.event_roles FOR INSERT TO authenticated
  WITH CHECK (public.app_can_manage_event(event_id));
CREATE POLICY event_roles_update_scoped ON public.event_roles FOR UPDATE TO authenticated
  USING (public.app_can_manage_event(event_id)) WITH CHECK (public.app_can_manage_event(event_id));
CREATE POLICY event_roles_delete_scoped ON public.event_roles FOR DELETE TO authenticated
  USING (public.app_can_manage_event(event_id));

-- ROLLBACK (qual / with_check below are VERBATIM from pg_policies, captured 2026-10-12):
--   DROP POLICY event_roles_insert_scoped ON public.event_roles;
--   DROP POLICY event_roles_update_scoped ON public.event_roles;
--   DROP POLICY event_roles_delete_scoped ON public.event_roles;
--   CREATE POLICY "Admins and authorized recruiters can manage event_roles" ON public.event_roles AS PERMISSIVE FOR ALL TO authenticated
--     USING ((EXISTS ( SELECT 1
--      FROM profiles
--     WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::user_role) OR ((profiles.role = 'recruiter'::user_role) AND (profiles.can_create_events = true)) OR (profiles.role = 'manager'::user_role))))))
--     WITH CHECK ((EXISTS ( SELECT 1
--      FROM profiles
--     WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::user_role) OR ((profiles.role = 'recruiter'::user_role) AND (profiles.can_create_events = true)) OR (profiles.role = 'manager'::user_role))))));
