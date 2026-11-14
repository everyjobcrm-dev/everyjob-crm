-- APPLIED 2026-11-14 by the owner (B2 tests 12/12). B2: payroll + client billing, derived on read (AGENTS §5.1). Admin only.
-- Rules (docs/payroll-billing-design.md §2, owner decisions B0 2026-11-13):
--   employee pay per approved shift: first 8h ×1, next 2h ×1.25, rest ×1.5, × registration wage_rate; travel once per shift.
--   client billing per approved shift: billable = max(h, client.min_billable_hours), amount = bill_to_client × billable,
--   no overtime uplift; travel passed through.
--   Only status 'approved' and not voided; cancelled events excluded. Missing wage_rate / price (NULL or 0) -> flagged,
--   amount NULL (never guessed). Month = month of events.event_date (a local Israeli date, same as v_my_monthly_hours).
-- Views have NO grant to anon/authenticated: only the SECURITY DEFINER RPCs below read them.
-- No Form 101 / bank fields. Idempotent: CREATE OR REPLACE + REVOKE/GRANT. No DROP, no data change.
-- Rollback: supabase/pending/20261114110000_b2_payroll_billing_views_rollback.sql (DROP, SQL Editor).

CREATE OR REPLACE VIEW public.v_payroll_shift_lines AS
SELECT s.id AS submission_id,
       s.employee_id,
       btrim(p.first_name || ' ' || p.last_name) AS employee_name,
       e.id AS event_id,
       e.event_date,
       date_trunc('month', e.event_date::timestamp)::date AS month,
       c.name AS client_name,
       er.role_name,
       s.reported_start,
       s.reported_end,
       s.reported_hours AS hours,
       least(s.reported_hours, 8) AS hours_100,
       least(greatest(s.reported_hours - 8, 0), 2) AS hours_125,
       greatest(s.reported_hours - 10, 0) AS hours_150,
       nullif(r.wage_rate, 0) AS wage_rate,
       (nullif(r.wage_rate, 0) IS NULL) AS missing_rate,
       round(nullif(r.wage_rate, 0) * (least(s.reported_hours, 8)
                                       + 1.25 * least(greatest(s.reported_hours - 8, 0), 2)
                                       + 1.5 * greatest(s.reported_hours - 10, 0)), 2) AS pay,
       COALESCE(e.travel_budget_per_worker, 0) AS travel
  FROM public.shift_hour_submissions s
  JOIN public.event_registrations r ON r.id = s.registration_id
  JOIN public.events e ON e.id = r.event_id
  JOIN public.clients c ON c.id = e.client_id
  LEFT JOIN public.event_roles er ON er.id = r.event_role_id
  JOIN public.profiles p ON p.id = r.user_id
 WHERE s.status = 'approved' AND s.voided_at IS NULL AND e.status <> 'cancelled';

CREATE OR REPLACE VIEW public.v_billing_shift_lines AS
SELECT s.id AS submission_id,
       c.id AS client_id,
       c.name AS client_name,
       e.id AS event_id,
       e.event_date,
       e.location,
       date_trunc('month', e.event_date::timestamp)::date AS month,
       er.role_name,
       r.user_id AS employee_id,
       s.reported_hours AS hours,
       greatest(s.reported_hours, COALESCE(c.min_billable_hours, 0)) AS billable_hours,
       nullif(er.bill_to_client, 0) AS price,
       (nullif(er.bill_to_client, 0) IS NULL) AS missing_price,
       round(nullif(er.bill_to_client, 0) * greatest(s.reported_hours, COALESCE(c.min_billable_hours, 0)), 2) AS amount,
       COALESCE(e.travel_budget_per_worker, 0) AS travel
  FROM public.shift_hour_submissions s
  JOIN public.event_registrations r ON r.id = s.registration_id
  JOIN public.events e ON e.id = r.event_id
  JOIN public.clients c ON c.id = e.client_id
  LEFT JOIN public.event_roles er ON er.id = r.event_role_id
 WHERE s.status = 'approved' AND s.voided_at IS NULL AND e.status <> 'cancelled';

REVOKE ALL ON public.v_payroll_shift_lines, public.v_billing_shift_lines FROM PUBLIC, anon, authenticated;

-- Payroll lines for a month (drill-down + Excel). p_month: any day of the month.
CREATE OR REPLACE FUNCTION public.get_payroll_lines(p_month date)
 RETURNS SETOF public.v_payroll_shift_lines
 LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF COALESCE(public.app_current_role()::text, '') <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  RETURN QUERY SELECT * FROM public.v_payroll_shift_lines l
                WHERE l.month = date_trunc('month', p_month::timestamp)::date
                ORDER BY l.employee_name, l.event_date, l.reported_start;
END;
$function$;

-- Payroll per employee for a month. gross_pay sums priced shifts only; missing_rate_shifts > 0 means incomplete.
CREATE OR REPLACE FUNCTION public.get_payroll_month(p_month date)
 RETURNS TABLE(employee_id uuid, employee_name text, shifts bigint, hours numeric, hours_100 numeric,
               hours_125 numeric, hours_150 numeric, gross_pay numeric, travel numeric, missing_rate_shifts bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF COALESCE(public.app_current_role()::text, '') <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  RETURN QUERY
    SELECT l.employee_id, l.employee_name, count(*), sum(l.hours)::numeric, sum(l.hours_100)::numeric, sum(l.hours_125)::numeric, sum(l.hours_150)::numeric,
           COALESCE(sum(l.pay), 0)::numeric, sum(l.travel)::numeric, count(*) FILTER (WHERE l.missing_rate)
      FROM public.v_payroll_shift_lines l
     WHERE l.month = date_trunc('month', p_month::timestamp)::date
     GROUP BY l.employee_id, l.employee_name
     ORDER BY l.employee_name;
END;
$function$;

-- Client billing per client + event for a month. amount sums priced shifts only; missing_price_shifts > 0 = incomplete.
CREATE OR REPLACE FUNCTION public.get_billing_month(p_month date)
 RETURNS TABLE(client_id uuid, client_name text, event_id uuid, event_date date, location text, shifts bigint,
               hours numeric, billable_hours numeric, amount numeric, travel numeric, missing_price_shifts bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF COALESCE(public.app_current_role()::text, '') <> 'admin' THEN RAISE EXCEPTION 'not_authorized'; END IF;
  RETURN QUERY
    SELECT l.client_id, l.client_name::text, l.event_id, l.event_date, l.location::text, count(*), sum(l.hours)::numeric,
           sum(l.billable_hours)::numeric, COALESCE(sum(l.amount), 0)::numeric, sum(l.travel)::numeric, count(*) FILTER (WHERE l.missing_price)
      FROM public.v_billing_shift_lines l
     WHERE l.month = date_trunc('month', p_month::timestamp)::date
     GROUP BY l.client_id, l.client_name, l.event_id, l.event_date, l.location
     ORDER BY l.client_name, l.event_date;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_payroll_lines(date), public.get_payroll_month(date), public.get_billing_month(date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_payroll_lines(date), public.get_payroll_month(date), public.get_billing_month(date)
  TO authenticated, service_role;

-- Verify read-only afterwards:
--   SELECT has_table_privilege('authenticated', 'public.v_payroll_shift_lines', 'SELECT');   -- false
--   SELECT has_function_privilege('anon', 'public.get_payroll_month(date)', 'EXECUTE');       -- false
-- Then run supabase/tests/b2_payroll_billing_tests.sql (rolls back; expect every 'r' = PASS).
