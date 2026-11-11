# Payroll & Billing - design (draft 2026-10-15, nothing applied)

Scope: handoff §7.6. Internal reports + Excel only, no external accounting API (AGENTS.md §1). Admin only.
Every number is derived on read from views (AGENTS.md §5.1); nothing is stored except what already exists.

## 1. Inputs that already exist (live)
| Input | Where |
|---|---|
| Approved hours per shift | `shift_hour_submissions` (`status = 'approved' AND voided_at IS NULL`), `reported_start/end/hours` |
| Employee hourly wage | `event_registrations.wage_rate` (set by Admin any time, Manager until the 10th of the next month) |
| Travel | `events.travel_budget_per_worker` (per worker per shift; locked once hours are approved - p9 E1) |
| Client price per hour | `event_roles.bill_to_client` (Admin only; p9 E2) |
| Client overtime model | `clients.overtime_threshold_hours`, `clients.min_billable_hours` |
| Recruiter credits | `recruiter_bonuses` (pending / applied, FIFO redemption H6v2) |
| Excluded | events with `status = 'cancelled'` (AGENTS.md §6.1) |

## 2. Rules (defaults - see §5 for the open questions)
**Employee pay per approved shift** (Israeli overtime, per shift):
- regular = min(h, 8); ot125 = min(max(h - 8, 0), 2); ot150 = max(h - 10, 0)
- pay = wage_rate × (regular + 1.25·ot125 + 1.5·ot150); travel = travel_budget_per_worker (once per shift)
- a shift whose registration has no `wage_rate` is listed with `missing_rate = true` and pay NULL (never guessed)
- month = `event_date` month in Asia/Jerusalem (same as `v_my_monthly_hours`)

**Client billing per approved shift:**
- billable = max(h, client.min_billable_hours or 0)
- regular = min(billable, threshold); overtime = billable - regular, where threshold = client.overtime_threshold_hours
  (NULL = no overtime); amount = bill_to_client × (regular + 1.25·overtime)
- travel charged = travel_budget_per_worker (pass-through)
- `bill_to_client = 0/NULL` -> line flagged `missing_price`

**Recruiter credits** are not part of the employee payslip: a separate Admin table per recruiter/month
(pending, applied this month, amount), read from `recruiter_bonuses`.

## 3. DB objects (proposed, §8 approval needed)
- `v_payroll_shift_lines` (view, no grant to anon/authenticated): one row per approved shift with the split above.
- `v_billing_shift_lines` (view, no grant): one row per approved shift with the client calculation.
- `get_payroll_month(p_month date)` / `get_billing_month(p_month date)`: SECURITY DEFINER, `app_current_role() = 'admin'`
  else `not_authorized`; aggregate the views per employee / per client+event. Employees keep `v_my_monthly_hours`.
- Security fix to bundle: `event_roles` is `SELECT true` for every authenticated user, so `bill_to_client` (client
  pricing) is readable by employees today. Proposed: column-level `REVOKE SELECT (bill_to_client) ... FROM authenticated`
  and read it through the Admin RPCs / edit page RPC.

## 4. App
- `/admin/payroll?month=YYYY-MM`: per-employee table (hours by tier, gross, travel, total, missing-rate warnings),
  drill-down to shifts. `/admin/billing?month=YYYY-MM`: per client -> per event lines, totals.
- Export: one .xlsx per report (RTL sheet, Hebrew headers, totals row), generated in a server action after
  `requireRole("admin")`. No Form 101 / bank fields in either report.
- Manual verification after build: a month with a missing wage rate, a shift > 10h, a client with min billable hours,
  a cancelled event (must not appear), a voided submission (must not appear).

## 5. Open questions (answer changes the implementation)
1. Overtime for employees: **per shift 8h / +2h at 125% / rest at 150% (recommended)**, or a flat rate with no overtime.
2. Client overtime above the threshold: **125% of bill_to_client (recommended)**, or a separate per-client overtime rate.
3. Excel library: **exceljs, real .xlsx with RTL (recommended)**, or CSV with BOM (no new dependency, no RTL/formatting).
