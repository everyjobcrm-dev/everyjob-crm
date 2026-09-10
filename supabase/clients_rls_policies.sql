-- supabase/clients_rls_policies.sql
-- Enables Row Level Security (RLS) on public.clients and defines access policies for Admin and Authenticated roles.

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

-- Policy 1: Admins have full CRUD privileges (INSERT, SELECT, UPDATE, DELETE)
CREATE POLICY "Admins can manage all clients" ON public.clients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Policy 2: All authenticated users can view active clients
CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT
  TO authenticated
  USING (true);
