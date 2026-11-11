-- APPROVED (P6-H6v2) 2026-10-13. p6_h6v2: FIFO redemption of recruitment credits per docs/spec-full.md - Manager/Admin redeem
-- N pending credits of the EVENT's recruiter from the event screen, oldest first, recording the actor and the event context.
-- Replaces the never-applied p6_h6_redeem_credits.sql.
ALTER TABLE public.recruiter_bonuses
  ADD COLUMN IF NOT EXISTS redeemed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redeemed_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.redeem_recruiter_credits(p_event_id uuid, p_count int)
 RETURNS int
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_recruiter uuid;
  v_available int;
  v_done int;
BEGIN
  IF v_uid IS NULL OR COALESCE(public.app_current_role()::text, '') NOT IN ('admin', 'manager') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION 'invalid_count'; END IF;
  SELECT e.recruiter_id INTO v_recruiter FROM public.events e WHERE e.id = p_event_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found'; END IF;
  IF v_recruiter IS NULL THEN RAISE EXCEPTION 'event_has_no_recruiter'; END IF;

  PERFORM 1 FROM public.recruiter_bonuses b
   WHERE b.recruiter_id = v_recruiter AND b.status = 'pending'
   ORDER BY b.created_at, b.id FOR UPDATE;
  SELECT count(*) INTO v_available FROM public.recruiter_bonuses b WHERE b.recruiter_id = v_recruiter AND b.status = 'pending';
  IF v_available < p_count THEN RAISE EXCEPTION 'insufficient_credits'; END IF;

  UPDATE public.recruiter_bonuses b
     SET status = 'applied', applied_at = now(), redeemed_by = v_uid, redeemed_event_id = p_event_id
   WHERE b.id IN (SELECT b2.id FROM public.recruiter_bonuses b2
                   WHERE b2.recruiter_id = v_recruiter AND b2.status = 'pending'
                   ORDER BY b2.created_at, b2.id LIMIT p_count);
  GET DIAGNOSTICS v_done = ROW_COUNT;
  RETURN v_done;
END;
$function$;
REVOKE ALL ON FUNCTION public.redeem_recruiter_credits(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_recruiter_credits(uuid, int) TO authenticated, service_role;
-- Rollback (by hand): DROP FUNCTION IF EXISTS public.redeem_recruiter_credits(uuid, int); the columns are dropped by hand.
