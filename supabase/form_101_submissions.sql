-- Supabase table schema for app/employee/101form/page.tsx
-- This table stores the submitted 101 form for the connected user profile.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.form_101_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  identity_number text NOT NULL,
  date_of_birth date,
  phone text NOT NULL,
  email text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  postal_code text,
  marital_status text,
  dependents text,
  employer_name text NOT NULL,
  job_title text NOT NULL,
  department text,
  position text,
  manager text,
  start_date date,
  wage text NOT NULL,
  bank_name text NOT NULL,
  branch_number text NOT NULL,
  account_number text NOT NULL,
  iban text NOT NULL,
  tax_id text,
  emergency_contact text,
  emergency_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  updated_by uuid REFERENCES public.profiles(id)
);

-- Optional index to speed up queries by user
CREATE INDEX IF NOT EXISTS idx_form_101_submissions_user_id ON public.form_101_submissions(user_id);

ALTER TABLE public.form_101_submissions
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS manager text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS emergency_phone text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id);
