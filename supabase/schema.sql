-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  tz text NOT NULL UNIQUE,
  role USER-DEFINED DEFAULT 'employee'::user_role,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  birth_date date,
  email text UNIQUE,
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  phone_number text CHECK (phone_number IS NULL OR phone_number ~ '^0(5[0-9]{8}|[23489][0-9]{7})$'::text),
  gender text CHECK (gender IS NULL OR (gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))),
  average_rating numeric DEFAULT 0.00,
  total_ratings integer DEFAULT 0,
  can_create_events boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  preferred_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'paused'::text])),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  industry text,
  contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  company_id text,
  overtime_threshold_hours numeric,
  min_billable_hours numeric,
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.event_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::registration_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  event_role_id uuid,
  hours_reported numeric,
  actual_start_time time without time zone,
  actual_end_time time without time zone,
  recruiter_id uuid,
  wage_rate numeric CHECK (wage_rate IS NULL OR wage_rate > 0::numeric),
  rate_set_by uuid,
  rate_set_at timestamp with time zone,
  CONSTRAINT event_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT event_registrations_event_role_id_fkey FOREIGN KEY (event_role_id) REFERENCES public.event_roles(id),
  CONSTRAINT event_registrations_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.profiles(id),
  CONSTRAINT event_registrations_rate_set_by_fkey FOREIGN KEY (rate_set_by) REFERENCES public.profiles(id),
  CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.employee_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  rater_id uuid NOT NULL,
  event_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT employee_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT employee_ratings_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id),
  CONSTRAINT employee_ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  event_date date NOT NULL,
  start_time time without time zone,
  location text NOT NULL,
  notes text,
  dress_code text,
  min_age integer,
  travel_budget_per_worker numeric DEFAULT 0,
  status text DEFAULT 'pending_rates'::text CHECK (status = ANY (ARRAY['pending_rates'::text, 'open'::text, 'in_progress'::text, 'completed'::text, 'closed'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  min_rating numeric CHECK (min_rating IS NULL OR min_rating >= 0::numeric AND min_rating <= 5::numeric),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.event_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  role_name text NOT NULL,
  headcount integer NOT NULL CHECK (headcount > 0),
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  base_rate numeric CHECK (base_rate IS NULL OR base_rate > 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  wage_to_worker numeric DEFAULT 0,
  bill_to_client numeric DEFAULT 0,
  CONSTRAINT event_roles_pkey PRIMARY KEY (id),
  CONSTRAINT event_roles_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.event_closures (
  event_id uuid NOT NULL,
  total_hours_reported numeric NOT NULL DEFAULT 0,
  travel_paid_to_workers numeric NOT NULL DEFAULT 0,
  travel_charged_to_client numeric NOT NULL DEFAULT 0,
  actual_income numeric NOT NULL DEFAULT 0,
  actual_expense numeric NOT NULL DEFAULT 0,
  closed_by uuid,
  closed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_closures_pkey PRIMARY KEY (event_id),
  CONSTRAINT event_closures_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_closures_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.employee_role_skills (
  employee_id uuid NOT NULL,
  role_name USER-DEFINED NOT NULL,
  approved_by uuid,
  approved_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT employee_role_skills_pkey PRIMARY KEY (employee_id, role_name),
  CONSTRAINT employee_role_skills_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id),
  CONSTRAINT employee_role_skills_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.employee_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  doc_type USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'missing'::doc_status,
  file_url text,
  submitted_at timestamp with time zone,
  verified_by uuid,
  verified_at timestamp with time zone,
  CONSTRAINT employee_documents_pkey PRIMARY KEY (id),
  CONSTRAINT employee_documents_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id),
  CONSTRAINT employee_documents_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.client_role_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  role_name USER-DEFINED NOT NULL,
  bill_rate numeric NOT NULL CHECK (bill_rate > 0::numeric),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT client_role_rates_pkey PRIMARY KEY (id),
  CONSTRAINT client_role_rates_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.recruiter_bonuses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL,
  source_registration_id uuid NOT NULL UNIQUE,
  bonus_amount numeric NOT NULL CHECK (bonus_amount > 0::numeric),
  status USER-DEFINED NOT NULL DEFAULT 'pending'::bonus_status,
  applied_to_registration_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  applied_at timestamp with time zone,
  CONSTRAINT recruiter_bonuses_pkey PRIMARY KEY (id),
  CONSTRAINT recruiter_bonuses_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.profiles(id),
  CONSTRAINT recruiter_bonuses_source_registration_id_fkey FOREIGN KEY (source_registration_id) REFERENCES public.event_registrations(id),
  CONSTRAINT recruiter_bonuses_applied_to_registration_id_fkey FOREIGN KEY (applied_to_registration_id) REFERENCES public.event_registrations(id)
);
CREATE TABLE public.shift_hour_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL UNIQUE,
  reported_start timestamp with time zone NOT NULL,
  reported_end timestamp with time zone NOT NULL,
  reported_hours numeric NOT NULL CHECK (reported_hours > 0::numeric),
  performance_rating smallint CHECK (performance_rating >= 1 AND performance_rating <= 5),
  performance_notes text,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::submission_status,
  submitted_by uuid NOT NULL,
  submitted_at timestamp with time zone,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  employee_id uuid,
  event_id uuid,
  CONSTRAINT shift_hour_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT shift_hour_submissions_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.event_registrations(id),
  CONSTRAINT shift_hour_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id),
  CONSTRAINT shift_hour_submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id),
  CONSTRAINT shift_hour_submissions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id),
  CONSTRAINT shift_hour_submissions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);