-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_functiondef (CRLF normalised to LF). The repo copy (alter_shift_hour_submissions.sql) has a typo ("tr  igger"); this is what runs live.
CREATE OR REPLACE FUNCTION public.set_shift_submission_refs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  SELECT er.user_id, er.event_id
    INTO NEW.employee_id, NEW.event_id
    FROM public.event_registrations er
    WHERE er.id = NEW.registration_id;

  IF NEW.employee_id IS NULL THEN
    RAISE EXCEPTION 'Invalid registration_id: %', NEW.registration_id;
  END IF;
  RETURN NEW;
END;
$function$
;
