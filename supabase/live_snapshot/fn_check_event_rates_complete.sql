-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_functiondef (CRLF normalised to LF). Live-only: not defined anywhere else in this repo.
CREATE OR REPLACE FUNCTION public.check_event_rates_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.status = 'open'
    AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
    AND EXISTS (
      SELECT 1 FROM public.event_roles er
      WHERE er.event_id = NEW.id AND er.base_rate IS NULL
    )
  THEN
    RAISE EXCEPTION 'Every event role must have a base rate before opening the event';
  END IF;
  RETURN NEW;
END;
$function$
;
