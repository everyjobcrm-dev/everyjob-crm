-- p4_m6c: NOT APPLIED - TO BE RUN BY HAND IN THE SQL EDITOR (contains DROP; the MCP apply_migration tool hangs on DROP).
-- Removes the legacy FOR ALL policy that let a user INSERT/UPDATE/DELETE their own registration rows directly.
--
-- Safe as of Phase 4 (verified 2026-10-13):
--  * the app makes NO direct writes to event_registrations (grep of app/ components/ lib/: only SELECTs remain);
--  * every write path is a SECURITY DEFINER RPC that runs as the table owner and does not depend on this policy:
--    register_for_event_role, schedule_employee, remove_scheduled_employee, staff_transition_registration,
--    set_registration_wage_rate, request_registration_cancellation, add_historical_event_attendee,
--    and the trigger auto_promote_from_waitlist;
--  * own-row reads stay covered by er_employee_select_own (SELECT USING user_id = auth.uid()).
DROP POLICY IF EXISTS "users manage own registrations" ON public.event_registrations;

-- READ-ONLY VERIFICATION afterwards (expected: exactly one row, er_employee_select_own / SELECT):
--   SELECT policyname, cmd, roles, qual, with_check FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'event_registrations';
-- plus: supabase/tests/p4_behavior_tests.sql must still pass (M8 + integration rows exercise the RPC paths).
--
-- ROLLBACK (verbatim from pg_policies, captured 2026-10-12):
--   CREATE POLICY "users manage own registrations" ON public.event_registrations AS PERMISSIVE FOR ALL TO public
--     USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
