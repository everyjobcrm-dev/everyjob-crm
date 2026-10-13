-- p1_m6b: auto_promote_from_waitlist (explicitly SECURITY DEFINER with a fixed search_path - CREATE OR REPLACE resets it):
--  * also promotes when a registration becomes 'removed' (staff removal);
--  * does not promote on cancelled events (closed events still promote).
CREATE OR REPLACE FUNCTION public.auto_promote_from_waitlist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_role public.event_roles%ROWTYPE;
  v_filled int;
  v_next_waitlist_id uuid;
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.status IN ('pending','approved'))
     OR (TG_OP = 'UPDATE' AND OLD.status IN ('pending','approved') AND NEW.status IN ('cancelled','rejected','removed')) THEN
    SELECT * INTO v_role FROM public.event_roles WHERE id = OLD.event_role_id FOR UPDATE;
    IF FOUND THEN
      SELECT count(*) INTO v_filled FROM public.event_registrations
       WHERE event_role_id = OLD.event_role_id AND status IN ('pending','approved');
      IF v_filled < v_role.headcount
         AND (SELECT e.status FROM public.events e WHERE e.id = v_role.event_id) IS DISTINCT FROM 'cancelled' THEN
        SELECT id INTO v_next_waitlist_id FROM public.event_registrations
         WHERE event_role_id = OLD.event_role_id AND status = 'waitlisted'
         ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
        IF v_next_waitlist_id IS NOT NULL THEN
          UPDATE public.event_registrations SET status = 'pending' WHERE id = v_next_waitlist_id;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $function$;

-- ROLLBACK: apply supabase/auto_promote_from_waitlist_v1_live.sql (R6b).
