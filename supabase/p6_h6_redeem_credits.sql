-- PROPOSED - not applied. Needs an explicit approval line (AGENTS.md 8.1) AND an answer to the semantics question below.
-- p6_h6: FIFO redemption of recruitment credits by Manager / Admin, using the EXISTING live columns of recruiter_bonuses
-- (status pending -> applied, applied_at, applied_to_registration_id). No redeemed_* columns.
--
-- SEMANTICS QUESTION (open): what does "applied_to_registration_id" point at?
--   (a) [assumed below] the RECRUITER's own approved registration on the event where the credit is paid out
--       (the credit is added to that shift's payroll line). Requires the recruiter to work the event.
--   (b) the event context only (any registration of the event, e.g. the first recruited worker's) - then the column is
--       just a pointer for reports and the payout is separate.
--   (c) no registration at all - then applied_to_registration_id stays NULL and only applied_at is set.
-- Until answered, the redeem UI stays hidden (app/manager/events/[eventId]/page.tsx).
--
-- Lock order: events (SHARE) -> event_registrations (SHARE) -> recruiter_bonuses (UPDATE, FIFO by created_at, id).
CREATE OR REPLACE FUNCTION public.redeem_recruiter_credits(p_recruiter_id uuid, p_count int, p_applied_to_registration_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_reg public.event_registrations%ROWTYPE;
  v_event_id uuid;
  v_done int;
BEGIN
  IF v_uid IS NULL OR COALESCE(public.app_current_role()::text, '') NOT IN ('admin', 'manager') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION 'invalid_count'; END IF;
  IF p_recruiter_id = v_uid THEN RAISE EXCEPTION 'not_own_registration'; END IF;   -- nobody redeems own credits

  SELECT r.event_id INTO v_event_id FROM public.event_registrations r WHERE r.id = p_applied_to_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  PERFORM 1 FROM public.events e WHERE e.id = v_event_id AND e.status IS DISTINCT FROM 'cancelled' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_cancelled'; END IF;
  SELECT r.* INTO v_reg FROM public.event_registrations r WHERE r.id = p_applied_to_registration_id FOR SHARE;
  -- semantics (a): the target is the recruiter's own approved registration
  IF v_reg.user_id IS DISTINCT FROM p_recruiter_id OR v_reg.status <> 'approved' THEN RAISE EXCEPTION 'invalid_redeem_target'; END IF;

  IF (SELECT count(*) FROM public.recruiter_bonuses b WHERE b.recruiter_id = p_recruiter_id AND b.status = 'pending') < p_count THEN
    RAISE EXCEPTION 'not_enough_credits';
  END IF;

  WITH picked AS (
    SELECT b.id FROM public.recruiter_bonuses b
     WHERE b.recruiter_id = p_recruiter_id AND b.status = 'pending'
     ORDER BY b.created_at, b.id
     LIMIT p_count
     FOR UPDATE
  )
  UPDATE public.recruiter_bonuses b
     SET status = 'applied', applied_at = now(), applied_to_registration_id = p_applied_to_registration_id
    FROM picked WHERE b.id = picked.id;
  GET DIAGNOSTICS v_done = ROW_COUNT;

  INSERT INTO public.registration_status_history (registration_id, event_id, employee_id, from_status, to_status, action, actor_id, reason)
  VALUES (v_reg.id, v_event_id, v_reg.user_id, v_reg.status, v_reg.status, 'credits_redeemed', v_uid, 'credits: ' || v_done::text);
  RETURN v_done;
END;
$function$;
REVOKE ALL ON FUNCTION public.redeem_recruiter_credits(uuid, int, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_recruiter_credits(uuid, int, uuid) TO authenticated, service_role;

-- ROLLBACK (by hand, SQL Editor - contains DROP; new function, nothing replaced):
--   DROP FUNCTION IF EXISTS public.redeem_recruiter_credits(uuid, int, uuid);
-- Note: void_shift_hours already refuses to void hours whose credit is 'applied' (credit_already_applied).
