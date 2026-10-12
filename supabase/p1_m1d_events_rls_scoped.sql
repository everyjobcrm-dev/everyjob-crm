-- p1_m1d: events RLS, narrowed and split by command (nothing is broadened).
-- Before: one FOR ALL policy for admin/manager/flagged recruiter (any event). After:
--   INSERT: admin/manager, or recruiter with can_create_events (recruiter_id is forced to the creator by p1_m1c);
--   UPDATE: app_can_manage_event(id) (admin/manager: all; recruiter: own events);
--   DELETE: admin only.
-- The SELECT policy "Authenticated users can view events" (USING true) is untouched, so visibility is unchanged for everyone.
DROP POLICY "Admins and authorized recruiters can manage events" ON public.events;
CREATE POLICY events_insert_staff ON public.events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
    AND (p.role IN ('admin','manager') OR (p.role = 'recruiter' AND p.can_create_events))));
CREATE POLICY events_update_scoped ON public.events FOR UPDATE TO authenticated
  USING (public.app_can_manage_event(id)) WITH CHECK (public.app_can_manage_event(id));
CREATE POLICY events_delete_admin ON public.events FOR DELETE TO authenticated
  USING (public.app_current_role() = 'admin');

-- ROLLBACK (qual / with_check below are VERBATIM from pg_policies, captured 2026-10-12):
--   DROP POLICY events_insert_staff ON public.events;
--   DROP POLICY events_update_scoped ON public.events;
--   DROP POLICY events_delete_admin ON public.events;
--   CREATE POLICY "Admins and authorized recruiters can manage events" ON public.events AS PERMISSIVE FOR ALL TO authenticated
--     USING ((EXISTS ( SELECT 1
--      FROM profiles
--     WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::user_role) OR ((profiles.role = 'recruiter'::user_role) AND (profiles.can_create_events = true)) OR (profiles.role = 'manager'::user_role))))))
--     WITH CHECK ((EXISTS ( SELECT 1
--      FROM profiles
--     WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::user_role) OR ((profiles.role = 'recruiter'::user_role) AND (profiles.can_create_events = true)) OR (profiles.role = 'manager'::user_role))))));
