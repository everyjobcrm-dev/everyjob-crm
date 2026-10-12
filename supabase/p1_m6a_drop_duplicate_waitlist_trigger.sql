-- p1_m6a: remove the duplicate, capacity-blind waitlist trigger (it promoted a SECOND waitlisted user on every cancellation,
-- over-filling the role). trg_auto_promote_from_waitlist stays authoritative. Must run BEFORE p1_m6 (this trigger function is SECURITY INVOKER).
-- The function fn_promote_waitlist() is kept (unused).
DROP TRIGGER IF EXISTS trg_promote_waitlist ON public.event_registrations;

-- ROLLBACK:
--   CREATE TRIGGER trg_promote_waitlist AFTER UPDATE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION fn_promote_waitlist();
