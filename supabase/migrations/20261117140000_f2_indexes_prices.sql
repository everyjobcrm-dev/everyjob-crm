-- APPLIED 2026-11-17 by the agent via MCP execute_sql (owner approved in chat); verify queries passed.
-- F2 (owner request 2026-11-17). No DROP: runnable through the MCP after approval. Independent of F1.
-- 1) Indexes for the hot lookups that had none (live check 2026-11-17: only PK / event_id / event_role_id existed).
--    Tables are small today, so plain CREATE INDEX (short lock) is fine; IF NOT EXISTS makes it idempotent.
-- 2) Client price list: (a) the price is also applied when a role is renamed and still has no price;
--    (b) a change in clients.preferred_roles now updates the price of roles in UPCOMING, not-final events
--    whose price was empty or still equal to the old list price (a manually changed price is kept).
--    Past / completed / cancelled events never change (billing history stays as it was).
-- Rollback: DROP INDEX IF EXISTS <names below>; DROP TRIGGER IF EXISTS trg_clients_propagate_prices ON public.clients;
--   CREATE OR REPLACE TRIGGER trg_event_roles_apply_client_price BEFORE INSERT ON public.event_roles
--     FOR EACH ROW EXECUTE FUNCTION public.apply_client_price_to_event_role();

BEGIN;

CREATE INDEX IF NOT EXISTS events_event_date_idx ON public.events (event_date);
CREATE INDEX IF NOT EXISTS events_client_id_idx ON public.events (client_id);
CREATE INDEX IF NOT EXISTS event_registrations_user_id_idx ON public.event_registrations (user_id);
CREATE INDEX IF NOT EXISTS event_registrations_role_status_idx ON public.event_registrations (event_role_id, status);
CREATE INDEX IF NOT EXISTS employee_ratings_employee_id_idx ON public.employee_ratings (employee_id);
CREATE INDEX IF NOT EXISTS registration_status_history_registration_idx ON public.registration_status_history (registration_id);
CREATE INDEX IF NOT EXISTS registration_status_history_event_idx ON public.registration_status_history (event_id);
CREATE INDEX IF NOT EXISTS recruiter_bonuses_recruiter_status_idx ON public.recruiter_bonuses (recruiter_id, status);

-- 2a) also on rename (the function only fills an empty price, so a set price is never overwritten)
CREATE OR REPLACE TRIGGER trg_event_roles_apply_client_price
  BEFORE INSERT OR UPDATE OF role_name ON public.event_roles
  FOR EACH ROW EXECUTE FUNCTION public.apply_client_price_to_event_role();

-- 2b) price list change -> upcoming events
CREATE OR REPLACE FUNCTION public.app_role_price(p_list jsonb, p_role text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT (r->>'rate')::numeric
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_list) = 'array' THEN p_list ELSE '[]'::jsonb END) r
   WHERE lower(btrim(r->>'role')) = lower(btrim(p_role))
     AND jsonb_typeof(r->'rate') = 'number' AND (r->>'rate')::numeric > 0
   LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.propagate_client_prices()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.preferred_roles IS NOT DISTINCT FROM OLD.preferred_roles THEN RETURN NULL; END IF;
  UPDATE public.event_roles er
     SET bill_to_client = public.app_role_price(NEW.preferred_roles, er.role_name)
    FROM public.events e
   WHERE e.id = er.event_id
     AND e.client_id = NEW.id
     AND e.status IN ('pending_rates','open','closed')
     AND e.event_date >= (now() AT TIME ZONE 'Asia/Jerusalem')::date
     AND public.app_role_price(NEW.preferred_roles, er.role_name) IS NOT NULL
     AND er.bill_to_client IS DISTINCT FROM public.app_role_price(NEW.preferred_roles, er.role_name)
     AND (COALESCE(er.bill_to_client, 0) = 0
          OR er.bill_to_client = public.app_role_price(OLD.preferred_roles, er.role_name));
  RETURN NULL;
END $function$;
REVOKE ALL ON FUNCTION public.propagate_client_prices() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER trg_clients_propagate_prices
  AFTER UPDATE OF preferred_roles ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.propagate_client_prices();

COMMIT;

-- Verify (read-only)
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN
  ('events_event_date_idx','events_client_id_idx','event_registrations_user_id_idx','event_registrations_role_status_idx',
   'employee_ratings_employee_id_idx','registration_status_history_registration_idx','registration_status_history_event_idx',
   'recruiter_bonuses_recruiter_status_idx');
SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger
 WHERE tgname IN ('trg_event_roles_apply_client_price','trg_clients_propagate_prices');
