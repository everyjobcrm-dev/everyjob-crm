-- APPLIED 2026-11-13 by the owner in the SQL Editor. B1 / O3: the client price list (clients.preferred_roles[].rate, overtime_threshold_hours,
-- min_billable_hours) is Admin-only to READ.
-- Owner runs this in the SQL Editor TOGETHER with the app change on the same branch (clients page + create/edit client
-- read through get_clients_admin; event creation reads role names through list_client_options and no longer reads the
-- price list - the trigger below applies it). Then: save as supabase/migrations/20261113100000_b1_clients_pricing_grants.sql,
-- `supabase migration repair --status applied 20261113100000 --linked`, regenerate types.
-- Idempotent: REVOKE / GRANT / CREATE OR REPLACE / CREATE TRIGGER guarded by a catalog check. No DROP, no data change.
-- Rollback: supabase/pending/20261113100000_b1_clients_pricing_grants_rollback.sql
--
-- Why: the live SELECT policy on clients is `true` for every authenticated user and the table grant covers every column
-- (anon too), so employees and recruiters can read what each client pays per role (handoff §9, next-phase plan B1).
-- Column list below = the LIVE columns of clients on 2026-11-13 minus preferred_roles, overtime_threshold_hours,
-- min_billable_hours. GOTCHA (same as p10b): any new clients column is INVISIBLE to the app until added to this GRANT.
-- INSERT/UPDATE/DELETE grants and the RLS policies are untouched. The app's clients(name) embeds keep working.

REVOKE SELECT ON public.clients FROM anon, authenticated;
GRANT SELECT (id, name, address, notes, status, created_by, created_at, updated_at, industry, contacts, company_id)
  ON public.clients TO authenticated;

-- Admin-only full read (clients page, create/edit client result). Same jsonb shape as
-- `select("*, events(count)")` so the app mapper (lib/admin/clients-data.ts mapClientRow) is unchanged.
CREATE OR REPLACE FUNCTION public.get_clients_admin(p_client_id uuid DEFAULT NULL)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF COALESCE(public.app_current_role()::text, '') <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  RETURN QUERY
    SELECT to_jsonb(c) || jsonb_build_object('events', jsonb_build_array(jsonb_build_object('count',
             (SELECT count(*) FROM public.events e WHERE e.client_id = c.id))))
      FROM public.clients c
     WHERE p_client_id IS NULL OR c.id = p_client_id
     ORDER BY c.name;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_clients_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_clients_admin(uuid) TO authenticated, service_role;

-- Event creators (recruiter and up) get the client list with role NAMES only, never the rates.
CREATE OR REPLACE FUNCTION public.list_client_options()
 RETURNS TABLE(id uuid, name text, address text, role_names text[])
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF COALESCE(public.app_current_role()::text, '') NOT IN ('admin', 'manager', 'recruiter') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY
    SELECT c.id, c.name::text, c.address::text,
           COALESCE(ARRAY(SELECT btrim(r->>'role')
                            FROM jsonb_array_elements(CASE WHEN jsonb_typeof(c.preferred_roles) = 'array'
                                                           THEN c.preferred_roles ELSE '[]'::jsonb END) r
                           WHERE COALESCE(btrim(r->>'role'), '') <> ''), '{}')
      FROM public.clients c
     ORDER BY c.name;
END;
$function$;
REVOKE ALL ON FUNCTION public.list_client_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_client_options() TO authenticated, service_role;

-- New event roles get the client's price for a role with the same name (case/space-insensitive) when no price was given.
-- Runs for every insert path (createEvent, upsert_event_role), so creators never need to read the price list.
CREATE OR REPLACE FUNCTION public.apply_client_price_to_event_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.bill_to_client IS NULL THEN
    SELECT (r->>'rate')::numeric INTO NEW.bill_to_client
      FROM public.events e
      JOIN public.clients c ON c.id = e.client_id
     CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(c.preferred_roles) = 'array'
                                                  THEN c.preferred_roles ELSE '[]'::jsonb END) r
     WHERE e.id = NEW.event_id
       AND lower(btrim(r->>'role')) = lower(btrim(NEW.role_name))
       AND jsonb_typeof(r->'rate') = 'number' AND (r->>'rate')::numeric > 0
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.apply_client_price_to_event_role() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_event_roles_apply_client_price'
                   AND tgrelid = 'public.event_roles'::regclass) THEN
    CREATE TRIGGER trg_event_roles_apply_client_price BEFORE INSERT ON public.event_roles
      FOR EACH ROW EXECUTE FUNCTION public.apply_client_price_to_event_role();
  END IF;
END $$;

-- Verify read-only afterwards:
--   SELECT has_column_privilege('authenticated', 'public.clients', 'preferred_roles', 'SELECT');  -- false
--   SELECT has_table_privilege('anon', 'public.clients', 'SELECT');                                -- false
--   SELECT has_function_privilege('anon', 'public.get_clients_admin(uuid)', 'EXECUTE');            -- false
-- Then run supabase/tests/b1_clients_pricing_tests.sql (rolls back; expect every 'r' = PASS).
