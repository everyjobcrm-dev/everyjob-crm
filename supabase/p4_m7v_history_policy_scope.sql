-- p4_m7v: registration_status_history read access scoped by the role hierarchy (recruiter: own events only).
ALTER POLICY registration_history_organizers_read ON public.registration_status_history
  USING (public.app_can_manage_event(event_id));

-- ROLLBACK (R7v):
--   ALTER POLICY registration_history_organizers_read ON public.registration_status_history USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['admin'::user_role,'manager'::user_role,'recruiter'::user_role])));
