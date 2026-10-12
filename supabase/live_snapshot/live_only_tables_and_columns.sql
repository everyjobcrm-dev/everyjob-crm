-- LIVE SNAPSHOT (read-only capture, documentation only - NOT a migration, do not run). Captured 2026-10-12 from project yjgqunrboxihxtgkxibw.
-- Reference description of tables/columns that exist live but are NOT in supabase/schema.sql. Reconstructed from information_schema / pg_constraint.

-- Enum: registration_status = pending, registered, confirmed, cancelled, no_show, completed, approved, rejected, waitlisted, removed   ('removed' is live-only)
-- events.status CHECK (live) = pending_rates, open, paused, in_progress, completed, cancelled, closed   (column nullable, default 'pending_rates')

-- Columns present live on existing tables, absent from schema.sql:
--   events.lifecycle_status        text NOT NULL DEFAULT 'draft'   (semantics unknown; ignored by decision)
--   events.updated_at              timestamptz NOT NULL DEFAULT now()   (maintained by trg_events_touch_updated_at)
--   events.cancelled_from_status   text NULL   (M3 will write OLD.status on every ->cancelled transition)
--   event_registrations.cancellation_requested_at timestamptz NULL
--   event_registrations.created_by uuid NULL REFERENCES profiles(id)
--   event_registrations UNIQUE (event_id, user_id)   (event_registrations_event_id_user_id_key)
--   shift_hour_submissions.voided_at timestamptz NULL, voided_by uuid NULL REFERENCES profiles(id), void_reason text NULL
--   shift_hour_submissions CHECK (reported_end > reported_start)
-- Objects in the repo that are NOT live: events.recruiter_id, profiles.recruiter_bonus_rate, profiles.form_101_status, v_recruiter_pending_credits,
--   create_recruitment_credit_on_approval(), enforce_recruiter_bonus_rate_admin_only() (i.e. supabase/recruiter_compensation_redesign.sql was never applied).

CREATE TABLE public.registration_status_history (
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id),
  event_id        uuid NOT NULL REFERENCES public.events(id),
  employee_id     uuid NOT NULL REFERENCES public.profiles(id),
  from_status     public.registration_status,
  to_status       public.registration_status,
  action          text NOT NULL,
  actor_id        uuid REFERENCES public.profiles(id),
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (action <> 'organizer_removed' OR NULLIF(btrim(reason), '') IS NOT NULL)
);  -- RLS on; SELECT policy for admin/manager/recruiter; authenticated has SELECT grant only

CREATE TABLE public.event_roster_override_audit (
  id              uuid NOT NULL PRIMARY KEY,
  event_id        uuid NOT NULL REFERENCES public.events(id),
  event_role_id   uuid NOT NULL REFERENCES public.event_roles(id),
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id),
  employee_id     uuid NOT NULL REFERENCES public.profiles(id),
  actor_id        uuid NOT NULL REFERENCES public.profiles(id),
  warning_codes   text[] NOT NULL CHECK (cardinality(warning_codes) > 0),
  created_at      timestamptz NOT NULL
);  -- RLS on; SELECT policy for admin/manager; (defaults not captured)

CREATE TABLE public.notifications (
  id         uuid NOT NULL PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.profiles(id),
  type       text NOT NULL,
  payload    jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  read_at    timestamptz
);  -- RLS on; SELECT/UPDATE own rows (authenticated); (defaults not captured)
