-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_functiondef (CRLF normalised to LF). Live-only: not defined anywhere else in this repo.
CREATE OR REPLACE FUNCTION public.touch_event_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$function$
;
