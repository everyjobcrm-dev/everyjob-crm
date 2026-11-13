-- ROLLBACK for 20261113100000_b1_clients_pricing_grants.sql. Contains DROP: run by the owner in the SQL Editor
-- (the Supabase MCP hangs on DROP). Restores the pre-B1 table grant (authenticated reads every column again).
-- Revert the app change on the same branch first, or the clients page breaks on the missing RPC.
DROP TRIGGER IF EXISTS trg_event_roles_apply_client_price ON public.event_roles;
DROP FUNCTION IF EXISTS public.apply_client_price_to_event_role();
DROP FUNCTION IF EXISTS public.list_client_options();
DROP FUNCTION IF EXISTS public.get_clients_admin(uuid);
GRANT SELECT ON public.clients TO authenticated;
-- anon had SELECT before B1 too, but RLS (policies are TO authenticated) already hid every row; not restored on purpose.
