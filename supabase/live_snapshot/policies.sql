-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Reconstructed from pg_policies (schema public); the events/event_roles manage policies are VERBATIM (see markers). RLS is ENABLED on every table below (relrowsecurity = true, not forced).
-- Tables with RLS enabled and NO policy at all (deny-all to anon/authenticated): employee_documents, employee_ratings, employee_role_skills,
--   event_closures, client_role_rates, recruiter_bonuses, shift_hour_submissions, signup_tz_attempts.

-- clients
CREATE POLICY "Admins can manage all clients" ON public.clients FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role));
CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT TO authenticated USING (true);

-- event_registrations  (roles = {public}, i.e. anon + authenticated; auth.uid() is NULL for anon so it matches nothing)
CREATE POLICY er_employee_select_own ON public.event_registrations FOR SELECT TO public USING (user_id = auth.uid());
CREATE POLICY "users manage own registrations" ON public.event_registrations FOR ALL TO public
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- event_roles
-- event_roles: the ALL policy below is VERBATIM from pg_policies (qual and with_check text exactly as stored; captured 2026-10-12)
CREATE POLICY "Admins and authorized recruiters can manage event_roles" ON public.event_roles AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::user_role) OR ((profiles.role = 'recruiter'::user_role) AND (profiles.can_create_events = true)) OR (profiles.role = 'manager'::user_role))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::user_role) OR ((profiles.role = 'recruiter'::user_role) AND (profiles.can_create_events = true)) OR (profiles.role = 'manager'::user_role))))));
CREATE POLICY "Authenticated users can view event_roles" ON public.event_roles FOR SELECT TO authenticated USING (true);

-- events
-- events: the ALL policy below is VERBATIM from pg_policies (qual and with_check text exactly as stored; captured 2026-10-12)
CREATE POLICY "Admins and authorized recruiters can manage events" ON public.events AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::user_role) OR ((profiles.role = 'recruiter'::user_role) AND (profiles.can_create_events = true)) OR (profiles.role = 'manager'::user_role))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::user_role) OR ((profiles.role = 'recruiter'::user_role) AND (profiles.can_create_events = true)) OR (profiles.role = 'manager'::user_role))))));
CREATE POLICY "Authenticated users can view events" ON public.events FOR SELECT TO authenticated USING (true);

-- profiles  (roles = {public} unless noted; note the duplicated INSERT/UPDATE policies)
CREATE POLICY "Service role can manage all profiles" ON public.profiles FOR ALL TO public
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text) WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO public WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT TO public WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_owner_insert" ON public.profiles FOR INSERT TO public WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE TO public USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO public USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO public USING (auth.uid() = id);
CREATE POLICY profiles_owner_or_admin_select ON public.profiles FOR SELECT TO authenticated
  USING (((SELECT auth.uid() AS uid) = id) OR (SELECT is_current_user_admin() AS is_current_user_admin));
CREATE POLICY profiles_owner_or_admin_update ON public.profiles FOR UPDATE TO authenticated
  USING (((SELECT auth.uid() AS uid) = id) OR (SELECT is_current_user_admin() AS is_current_user_admin))
  WITH CHECK (((SELECT auth.uid() AS uid) = id) OR (SELECT is_current_user_admin() AS is_current_user_admin));

-- event_roster_override_audit
CREATE POLICY roster_override_audit_admin_manager_read ON public.event_roster_override_audit FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])));

-- notifications
CREATE POLICY notifications_mark_own_read ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_read_own ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

-- registration_status_history
CREATE POLICY registration_history_organizers_read ON public.registration_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'recruiter'::user_role])));
