-- ROLLBACK ARTIFACT R6b: verbatim live definition captured 2026-10-12 from project yjgqunrboxihxtgkxibw (md5-verified against pg_get_*def). Rolls back p1_m6b.
-- Apply ONLY to roll back the corresponding p1_* migration.
CREATE OR REPLACE FUNCTION public.auto_promote_from_waitlist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.event_roles%ROWTYPE;
  v_filled int;
  v_next_waitlist_id uuid;
BEGIN
  -- Only act if a registration was removed or its status changed from pending/approved to cancelled/rejected
  IF (TG_OP = 'DELETE' AND OLD.status IN ('pending', 'approved'))
     OR (TG_OP = 'UPDATE' AND OLD.status IN ('pending', 'approved') AND NEW.status IN ('cancelled', 'rejected')) THEN

    -- Lock the event_role row to serialize concurrent cancellations and signups
    SELECT * INTO v_role FROM public.event_roles WHERE id = OLD.event_role_id FOR UPDATE;
    IF FOUND THEN
      SELECT count(*) INTO v_filled
      FROM public.event_registrations
      WHERE event_role_id = OLD.event_role_id
        AND status IN ('pending', 'approved');

      -- If headcount capacity is now available, promote the earliest waitlisted employee
      IF v_filled < v_role.headcount THEN
        SELECT id INTO v_next_waitlist_id
        FROM public.event_registrations
        WHERE event_role_id = OLD.event_role_id
          AND status = 'waitlisted'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

        IF v_next_waitlist_id IS NOT NULL THEN
          UPDATE public.event_registrations
          SET status = 'pending'
          WHERE id = v_next_waitlist_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;
