-- APPLIED 2026-11-14 by the owner (B1 tests 16/16). B1b: fix the B1 trigger. event_roles.bill_to_client has DEFAULT 0, so on insert the trigger
-- saw 0 (not NULL) and never applied the client price. 0 is never a real price (design §2: 0/NULL = missing_price),
-- so treat NULL and 0 alike. Unmatched roles keep their value (0 or NULL).
-- Idempotent: CREATE OR REPLACE only. No DROP, no data change (existing roles are not touched).
-- Rollback: re-run the function block of supabase/migrations/20261113100000_b1_clients_pricing_grants.sql.
CREATE OR REPLACE FUNCTION public.apply_client_price_to_event_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_price numeric;
BEGIN
  IF COALESCE(NEW.bill_to_client, 0) = 0 THEN
    SELECT (r->>'rate')::numeric INTO v_price
      FROM public.events e
      JOIN public.clients c ON c.id = e.client_id
     CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(c.preferred_roles) = 'array'
                                                  THEN c.preferred_roles ELSE '[]'::jsonb END) r
     WHERE e.id = NEW.event_id
       AND lower(btrim(r->>'role')) = lower(btrim(NEW.role_name))
       AND jsonb_typeof(r->'rate') = 'number' AND (r->>'rate')::numeric > 0
     LIMIT 1;
    IF v_price IS NOT NULL THEN NEW.bill_to_client := v_price; END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.apply_client_price_to_event_role() FROM PUBLIC, anon, authenticated;
