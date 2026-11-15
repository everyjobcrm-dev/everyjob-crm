-- APPLIED 2026-11-15 via Supabase MCP apply_migration (owner instruction in chat); history version 20261115073339. Test results in the PR.
-- C4: in-app notifications. AFTER triggers write rows to public.notifications (live table: id, user_id, type,
-- payload jsonb, created_at, read_at; RLS: read own, update own; no INSERT policy, so only SECURITY DEFINER code
-- writes). Shown on /employee/notifications.
--
-- Types (payload always has event_id, event_date, start_time, location, client_name - a snapshot, because the
-- employee may later be unable to read the event, e.g. after it is cancelled):
--   registration_approved | registration_rejected | registration_removed   (event_registrations; + role_name)
--   event_cancelled                                                          (events.status -> cancelled)
--   event_time_changed   (events.event_date / start_time, or event_roles.start_time / end_time; + old_* values)
--   hours_approved       (shift_hour_submissions.status -> approved; + hours, role_name)
-- Recipients: never the actor (auth.uid()). Event changes go to registrations that are approved, pending or
-- waitlisted. A failure to notify never blocks the business action (each insert is guarded; WARNING only).
-- Also: notifications UPDATE narrowed to the read_at column (a user marks own rows read; cannot rewrite them).
-- No DROP, no data change. Lock order unchanged (triggers only INSERT into notifications).
-- Rollback: supabase/pending/20261115120000_c4_notifications_triggers_rollback.sql
-- Test: supabase/tests/c4_notifications_tests.sql

CREATE OR REPLACE FUNCTION public.app_notification_event_payload(p_event_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object('event_id', e.id, 'event_date', e.event_date, 'start_time', e.start_time,
                              'location', e.location, 'client_name', c.name)
      FROM public.events e LEFT JOIN public.clients c ON c.id = e.client_id
     WHERE e.id = p_event_id), jsonb_build_object('event_id', p_event_id))
$$;

CREATE OR REPLACE FUNCTION public.app_notify(p_user_id uuid, p_type text, p_payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id IS NOT DISTINCT FROM auth.uid() THEN RETURN; END IF;
  BEGIN
    INSERT INTO public.notifications (id, user_id, type, payload, created_at)
    VALUES (gen_random_uuid(), p_user_id, p_type, COALESCE(p_payload, '{}'::jsonb), now());
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'app_notify(%, %) failed: %', p_user_id, p_type, SQLERRM;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.notify_registration_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.status::text NOT IN ('approved', 'rejected', 'removed') THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NULL; END IF;
  PERFORM public.app_notify(NEW.user_id, 'registration_' || NEW.status::text,
    public.app_notification_event_payload(NEW.event_id)
      || jsonb_build_object('registration_id', NEW.id,
                            'role_name', (SELECT er.role_name FROM public.event_roles er WHERE er.id = NEW.event_role_id)));
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.notify_event_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_type text; v_payload jsonb; r record;
BEGIN
  IF NEW.status::text = 'cancelled' AND OLD.status::text <> 'cancelled' THEN
    v_type := 'event_cancelled';
  ELSIF NEW.status::text <> 'cancelled'
        AND (NEW.event_date IS DISTINCT FROM OLD.event_date OR NEW.start_time IS DISTINCT FROM OLD.start_time) THEN
    v_type := 'event_time_changed';
  ELSE
    RETURN NULL;
  END IF;
  v_payload := public.app_notification_event_payload(NEW.id)
    || jsonb_build_object('old_event_date', OLD.event_date, 'old_start_time', OLD.start_time);
  FOR r IN SELECT DISTINCT reg.user_id FROM public.event_registrations reg
            WHERE reg.event_id = NEW.id AND reg.status::text IN ('approved', 'pending', 'waitlisted') LOOP
    PERFORM public.app_notify(r.user_id, v_type, v_payload);
  END LOOP;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.notify_event_role_time_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_payload jsonb; r record;
BEGIN
  IF NEW.start_time IS NOT DISTINCT FROM OLD.start_time AND NEW.end_time IS NOT DISTINCT FROM OLD.end_time THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.events e WHERE e.id = NEW.event_id AND e.status::text = 'cancelled') THEN RETURN NULL; END IF;
  v_payload := public.app_notification_event_payload(NEW.event_id)
    || jsonb_build_object('role_name', NEW.role_name, 'role_start_time', NEW.start_time, 'role_end_time', NEW.end_time,
                          'old_role_start_time', OLD.start_time, 'old_role_end_time', OLD.end_time);
  FOR r IN SELECT DISTINCT reg.user_id FROM public.event_registrations reg
            WHERE reg.event_role_id = NEW.id AND reg.status::text IN ('approved', 'pending', 'waitlisted') LOOP
    PERFORM public.app_notify(r.user_id, 'event_time_changed', v_payload);
  END LOOP;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.notify_hours_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.status::text <> 'approved' OR OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.voided_at IS NOT NULL THEN RETURN NULL; END IF;
  PERFORM public.app_notify(NEW.employee_id, 'hours_approved',
    public.app_notification_event_payload(NEW.event_id)
      || jsonb_build_object('submission_id', NEW.id, 'hours', NEW.reported_hours,
                            'role_name', (SELECT er.role_name FROM public.event_registrations reg
                                            JOIN public.event_roles er ON er.id = reg.event_role_id
                                           WHERE reg.id = NEW.registration_id)));
  RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.app_notification_event_payload(uuid), public.app_notify(uuid, text, jsonb),
  public.notify_registration_status(), public.notify_event_change(), public.notify_event_role_time_change(),
  public.notify_hours_approved() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_registration_status') THEN
    CREATE TRIGGER trg_notify_registration_status AFTER INSERT OR UPDATE OF status ON public.event_registrations
      FOR EACH ROW EXECUTE FUNCTION public.notify_registration_status();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_event_change') THEN
    CREATE TRIGGER trg_notify_event_change AFTER UPDATE OF status, event_date, start_time ON public.events
      FOR EACH ROW EXECUTE FUNCTION public.notify_event_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_event_role_time_change') THEN
    CREATE TRIGGER trg_notify_event_role_time_change AFTER UPDATE OF start_time, end_time ON public.event_roles
      FOR EACH ROW EXECUTE FUNCTION public.notify_event_role_time_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_hours_approved') THEN
    CREATE TRIGGER trg_notify_hours_approved AFTER UPDATE OF status ON public.shift_hour_submissions
      FOR EACH ROW EXECUTE FUNCTION public.notify_hours_approved();
  END IF;
END $$;

-- A user may only flip read_at on own rows (RLS notifications_mark_own_read keeps the row scope).
REVOKE ALL ON public.notifications FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.notifications FROM authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
