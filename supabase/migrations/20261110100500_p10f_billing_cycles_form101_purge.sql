-- PENDING (not applied). p10f: billing cycles + Form 101 purge gate. Independent of p10a-e.
-- Owner runs this in the SQL Editor, then: save as supabase/migrations/20261110100500_p10f_billing_cycles_form101_purge.sql,
-- `supabase migration repair --status applied 20261110100500 --linked`, regenerate types.
-- Idempotent: CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE / REVOKE / GRANT. No DROP, no data change.
-- Rollback (owner, SQL Editor): DROP FUNCTION IF EXISTS purge_form_101_submissions(date), close_billing_cycle(date),
--   reopen_billing_cycle(date), get_billing_cycles(); the tables may stay (billing_cycles holds only cycle metadata).
--
-- Rules (AGENTS.md §8.2, §8.5 and the owner's notes):
--   * form_101_submissions (referenced by app/employee/101form/page.tsx, never created live - gap G1) is created here
--     LOCKED: RLS on, NO policies, NO grants to anon/authenticated. Nobody - Admin included - can read or write it from
--     the app until the 2FA (aal2) work adds the policies. The employee page keeps failing closed exactly as today.
--   * billing_cycles: one row per month (first day of the month). Admin closes a cycle only after the month has ended
--     ('cycle_not_ended'); reopen is Admin too. RPC-only (no client grants).
--   * purge_form_101_submissions(month): Admin only AND auth.jwt()->>'aal' = 'aal2' ('aal2_required' - fails closed
--     until 2FA exists) AND the cycle for that month is closed ('billing_cycle_open'). Deletes every submission last
--     updated before the end of that month, records count/actor/time on the cycle row, returns the count.
--     The purge can therefore NEVER run before the billing cycle is closed, and never without a 2FA session.
--   * No app UI for the purge in this run (it would always fail 'aal2_required'); the admin billing-cycle screen comes
--     with the payroll batch (docs/payroll-billing-design.md).

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
CREATE INDEX IF NOT EXISTS idx_form_101_submissions_user_id ON public.form_101_submissions(user_id);
ALTER TABLE public.form_101_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.form_101_submissions FROM PUBLIC, anon, authenticated;   -- locked until 2FA: no policies, no grants

CREATE TABLE IF NOT EXISTS public.billing_cycles (
  month date PRIMARY KEY CHECK (month = date_trunc('month', month)::date),
  closed_at timestamptz,
  closed_by uuid REFERENCES public.profiles(id),
  reopened_at timestamptz,
  reopened_by uuid REFERENCES public.profiles(id),
  form_101_purged_at timestamptz,
  form_101_purged_by uuid REFERENCES public.profiles(id),
  form_101_purged_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_cycles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_cycles FROM PUBLIC, anon, authenticated;        -- RPC only

CREATE OR REPLACE FUNCTION public.get_billing_cycles()
 RETURNS SETOF public.billing_cycles
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF COALESCE(public.app_current_role()::text, '') <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  RETURN QUERY SELECT * FROM public.billing_cycles ORDER BY month DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.close_billing_cycle(p_month date)
 RETURNS public.billing_cycles
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_month date := date_trunc('month', p_month)::date;
  v_today date := (now() AT TIME ZONE 'Asia/Jerusalem')::date;
  v_row public.billing_cycles;
BEGIN
  IF v_uid IS NULL OR COALESCE(public.app_current_role()::text, '') <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_month IS NULL THEN RAISE EXCEPTION 'invalid_value'; END IF;
  IF (v_month + interval '1 month')::date > v_today THEN RAISE EXCEPTION 'cycle_not_ended'; END IF;
  INSERT INTO public.billing_cycles (month, closed_at, closed_by) VALUES (v_month, now(), v_uid)
  ON CONFLICT (month) DO UPDATE SET closed_at = now(), closed_by = EXCLUDED.closed_by, reopened_at = NULL, reopened_by = NULL
  WHERE public.billing_cycles.closed_at IS NULL
  RETURNING * INTO v_row;
  IF v_row.month IS NULL THEN RAISE EXCEPTION 'cycle_already_closed'; END IF;
  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reopen_billing_cycle(p_month date)
 RETURNS public.billing_cycles
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.billing_cycles;
BEGIN
  IF v_uid IS NULL OR COALESCE(public.app_current_role()::text, '') <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  UPDATE public.billing_cycles
     SET closed_at = NULL, closed_by = NULL, reopened_at = now(), reopened_by = v_uid
   WHERE month = date_trunc('month', p_month)::date AND closed_at IS NOT NULL
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'billing_cycle_open'; END IF;
  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.purge_form_101_submissions(p_month date)
 RETURNS integer
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_month date := date_trunc('month', p_month)::date;
  v_closed_at timestamptz;
  v_count integer;
BEGIN
  IF v_uid IS NULL OR COALESCE(public.app_current_role()::text, '') <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  -- 2FA gate (AGENTS.md §8.2): fails closed until the aal2 flow exists. Never weaken.
  IF COALESCE(auth.jwt() ->> 'aal', '') <> 'aal2' THEN RAISE EXCEPTION 'aal2_required'; END IF;
  SELECT c.closed_at INTO v_closed_at FROM public.billing_cycles c WHERE c.month = v_month FOR UPDATE;
  IF NOT FOUND OR v_closed_at IS NULL THEN RAISE EXCEPTION 'billing_cycle_open'; END IF;

  DELETE FROM public.form_101_submissions s
   WHERE COALESCE(s.updated_at, s.created_at) < (v_month + interval '1 month');
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.billing_cycles
     SET form_101_purged_at = now(), form_101_purged_by = v_uid, form_101_purged_count = v_count
   WHERE month = v_month;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_billing_cycles(), public.close_billing_cycle(date), public.reopen_billing_cycle(date),
  public.purge_form_101_submissions(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_billing_cycles(), public.close_billing_cycle(date), public.reopen_billing_cycle(date),
  public.purge_form_101_submissions(date) TO authenticated, service_role;

-- Verify read-only afterwards:
--   SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('form_101_submissions','billing_cycles');            -- true, true
--   SELECT count(*) FROM pg_policies WHERE tablename IN ('form_101_submissions','billing_cycles');                        -- 0
--   SELECT has_table_privilege('authenticated', 'public.form_101_submissions', 'SELECT');                                  -- false
-- Tests: supabase/tests/p10f_form101_purge_tests.sql.
