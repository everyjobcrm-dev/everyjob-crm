-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_functiondef (CRLF normalised to LF). Live-only: not defined anywhere else in this repo.
CREATE OR REPLACE FUNCTION public.update_employee_average_rating()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.profiles
    SET 
        average_rating = (
            SELECT ROUND(AVG(rating)::numeric, 2) 
            FROM public.employee_ratings 
            WHERE employee_id = NEW.employee_id
        ),
        total_ratings = (
            SELECT COUNT(*) 
            FROM public.employee_ratings 
            WHERE employee_id = NEW.employee_id
        )
    WHERE id = NEW.employee_id;
    RETURN NEW;
END;
$function$
;
