-- Rollback for C4 (contains DROP: run by hand in the SQL Editor). Notification rows already written are kept.
DROP TRIGGER IF EXISTS trg_notify_registration_status ON public.event_registrations;
DROP TRIGGER IF EXISTS trg_notify_event_change ON public.events;
DROP TRIGGER IF EXISTS trg_notify_event_role_time_change ON public.event_roles;
DROP TRIGGER IF EXISTS trg_notify_hours_approved ON public.shift_hour_submissions;
DROP FUNCTION IF EXISTS public.notify_registration_status();
DROP FUNCTION IF EXISTS public.notify_event_change();
DROP FUNCTION IF EXISTS public.notify_event_role_time_change();
DROP FUNCTION IF EXISTS public.notify_hours_approved();
DROP FUNCTION IF EXISTS public.app_notify(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.app_notification_event_payload(uuid);
-- Before C4 authenticated had SELECT only on notifications (checked live 2026-11-15): drop the read_at UPDATE grant.
REVOKE UPDATE (read_at) ON public.notifications FROM authenticated;
