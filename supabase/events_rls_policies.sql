-- supabase/events_rls_policies.sql
-- Enables Row Level Security (RLS) on events, event_roles, and event_registrations tables
-- and defines access policies for each role.
--
-- Who can create events?
--   - Admins (role = 'admin')
--   - Recruiters with can_create_events = true (role = 'recruiter' AND can_create_events)
--
-- Who can view events?
--   - All authenticated users (employees see open events, managers/recruiters/admins see all)

-- ============================================================
-- events
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and authorized recruiters can manage events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;

-- Admins: full CRUD
-- Recruiters with can_create_events flag: full CRUD on their own events
CREATE POLICY "Admins and authorized recruiters can manage events" ON public.events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.role = 'recruiter' AND profiles.can_create_events = true)
          OR profiles.role = 'manager'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.role = 'recruiter' AND profiles.can_create_events = true)
          OR profiles.role = 'manager'
        )
    )
  );

-- All authenticated users can read events
CREATE POLICY "Authenticated users can view events" ON public.events
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- event_roles
-- ============================================================
ALTER TABLE public.event_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and authorized recruiters can manage event_roles" ON public.event_roles;
DROP POLICY IF EXISTS "Authenticated users can view event_roles" ON public.event_roles;

CREATE POLICY "Admins and authorized recruiters can manage event_roles" ON public.event_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.role = 'recruiter' AND profiles.can_create_events = true)
          OR profiles.role = 'manager'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.role = 'recruiter' AND profiles.can_create_events = true)
          OR profiles.role = 'manager'
        )
    )
  );

CREATE POLICY "Authenticated users can view event_roles" ON public.event_roles
  FOR SELECT
  TO authenticated
  USING (true);
