-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Source: pg_get_functiondef (CRLF normalised to LF). Live-only: not defined anywhere else in this repo.
CREATE OR REPLACE FUNCTION public.fn_promote_waitlist()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_next_waitlist_id uuid;
BEGIN
  -- If status changes to cancelled/rejected/no_show, try to promote a waitlisted user
  IF NEW.status IN ('cancelled', 'rejected', 'no_show') AND OLD.status NOT IN ('cancelled', 'rejected', 'no_show') THEN
    
    SELECT id INTO v_next_waitlist_id
    FROM public.event_registrations
    WHERE event_role_id = NEW.event_role_id
      AND status = 'waitlisted'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_next_waitlist_id IS NOT NULL THEN
      UPDATE public.event_registrations
      SET status = 'pending'
      WHERE id = v_next_waitlist_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;
