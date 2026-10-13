-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_functiondef (CRLF normalised to LF). Live-only: not defined anywhere else in this repo.
CREATE OR REPLACE FUNCTION public.recalc_employee_rating()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.profiles
  SET average_rating = sub.avg_rating, total_ratings = sub.cnt
  FROM (
    SELECT AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS cnt
    FROM public.employee_ratings
    WHERE employee_id = COALESCE(NEW.employee_id, OLD.employee_id)
  ) sub
  WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  RETURN NULL;
END;
$function$
;
