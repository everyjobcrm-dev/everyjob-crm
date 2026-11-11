-- APPLIED 2026-10-13 via apply_migration (approved: P6-H0..H5 with E1/E2, Q3-Q5). Order: h0 -> h1 -> h4 -> h2 -> h3 -> h5.
-- p6_h0: profiles.recruiter_bonus_rate (NIS per approved hour, Admin-set; spec default 1). Referenced by the glossary,
-- docs/spec-full.md, app/admin/actions.ts setRecruiterBonusRate and lib/supabase/auth.ts, but missing live.
-- Non-admin clients cannot change it: guard_profile_protected_columns only allows first/last name, phone, gender, birth_date.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recruiter_bonus_rate numeric(10,2) NOT NULL DEFAULT 1
  CONSTRAINT profiles_recruiter_bonus_rate_check CHECK (recruiter_bonus_rate > 0);

-- ROLLBACK (by hand, SQL Editor - contains DROP):
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS recruiter_bonus_rate;
-- Dependents after apply: p6_h2 approve_shift_hours; regenerate types.
