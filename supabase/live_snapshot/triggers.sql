-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_triggerdef for every non-internal trigger in schema public, plus the auth.users trigger. Platform event triggers (pgrst_*, graphql, pg_cron/pg_net grants) omitted; ensure_rls runs public.rls_auto_enable().

CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_recalc_rating AFTER INSERT OR DELETE OR UPDATE ON public.employee_ratings FOR EACH ROW EXECUTE FUNCTION recalc_employee_rating();
CREATE TRIGGER trigger_update_rating AFTER INSERT OR DELETE OR UPDATE ON public.employee_ratings FOR EACH ROW EXECUTE FUNCTION update_employee_average_rating();
CREATE TRIGGER trg_auto_promote_from_waitlist AFTER DELETE OR UPDATE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION auto_promote_from_waitlist();
CREATE TRIGGER trg_promote_waitlist AFTER UPDATE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION fn_promote_waitlist();
CREATE TRIGGER trg_check_event_rates_complete BEFORE UPDATE OF status ON public.events FOR EACH ROW EXECUTE FUNCTION check_event_rates_complete();
CREATE TRIGGER trg_events_touch_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION touch_event_updated_at();
CREATE TRIGGER trg_guard_profile_protected_columns BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION guard_profile_protected_columns();
CREATE TRIGGER trg_set_shift_submission_refs BEFORE INSERT ON public.shift_hour_submissions FOR EACH ROW EXECUTE FUNCTION set_shift_submission_refs();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
