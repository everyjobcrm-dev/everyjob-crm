# Next-phase plan - everyJob CRM (2026-11-13)

Companion to `docs/handoff.md`, which holds the current-state facts. This file says what to build next and in what
order. `AGENTS.md` wins over both. Every DB change follows AGENTS §8.1/§11: SQL goes to `supabase/pending/` with a
rollback and a test in `supabase/tests/`, and the owner approves its exact contents before it runs.

## Where we are
- `master` (`f424e05`, deployed on Vercel production): Phases 1-6, the event edit, the light redesign, and the p10
  batch (final closure, employee approval, soft delete, Admin-only role pricing, billing cycles + Form 101 purge gate).
- Dev DB `yjgqunrboxihxtgkxibw`: p10a-p10f live, 83/83 DB tests pass.
- Browser verification mostly done (handoff §10). Six follow-up fixes are on `claude/verification-fixes` (not merged yet).
- Not built yet: payroll, client billing, Excel export, notifications writes, employee home, compliance dashboard, 2FA,
  Form 101 / bank-details flow.

## Milestone A - close out the current release (small, do first)
1. **Merge `claude/verification-fixes`**: open its PR if there is none, run tsc/lint/build, then merge with the owner's go-ahead.
2. **Finish verification** (handoff §0 list): hours flow submit -> approve/reject/void, the Manager rate window,
   "final closure blocked by pending hours", staff-as-worker, the min-rating warning, approving a pending employee from
   the picker. The first three need a past-dated test event. Write it as a seed SQL in `supabase/pending/` and get the
   owner's approval before it runs. For the last one the owner registers a fresh test employee.
3. **Ship checks** (handoff §7 step 5): Vercel Preview anon key and service-role key, `DEV_SKIP_EMAIL_VERIFICATION` absent
   in production, smoke-test production by role.
4. **Repo hygiene**: the owner runs the `supabase migration repair` command (handoff §0) if not done; close PRs #3 and #1;
   add `.gitattributes` (`*.sql *.ts *.tsx *.md text eol=lf`).

Done when: the fixes are merged, every verification row passes or has a filed fix, and production is smoke-tested.

## Milestone B - Payroll & Billing (the next feature phase)
Design: `docs/payroll-billing-design.md`. Admin only, internal reports and Excel only (no external accounting API).

**B0 - owner decisions (ANSWERED 2026-11-13, do not reopen):**
- Q1 employee pay: legal overtime **per shift**, with the first 8h at 100%, the next 2h at 125% and the rest at 150%,
  times the registration `wage_rate`.
- Q2 client billing: **one flat hourly price per role per client, with no overtime uplift.**
  `amount = bill_to_client × billable_hours`, and `clients.overtime_threshold_hours` is not used for billing.
  `billable_hours = max(h, clients.min_billable_hours)` stays as in the design (confirm with the owner when building B2).
  Update `docs/payroll-billing-design.md` §2 to match.
- Q3 export: **real Excel (.xlsx) via `exceljs`**, an RTL sheet with Hebrew headers (a new dependency, approved).

**B1 - security first (O3):** `clients` is readable by every authenticated user, so the client price list leaks.
  - Add a column-level grant on `clients` without the pricing columns, plus an Admin RPC for the clients page.
  - Add a BEFORE INSERT trigger on `event_roles` that applies the price list, so event creators never read it.
  - Files: one migration, `app/admin/clients/actions.ts`, `app/admin/actions.ts` (`createEvent` price prefill),
    `components/events/CreateEventForm.tsx`.
  - Test: an employee or recruiter gets `permission denied` on the pricing columns, the Admin RPC works, and new
    event roles get the client price.

**B2 - DB layer (one approved migration):**
  - Views `v_payroll_shift_lines` and `v_billing_shift_lines`, with no anon/authenticated grant.
  - RPCs `get_payroll_month(month)` and `get_billing_month(month)`, SECURITY DEFINER, Admin only.
  - Rules are in the design doc §2:
    - cancelled events and voided submissions are excluded;
    - a missing wage rate or price is flagged, never guessed;
    - months are counted in Asia/Jerusalem time.
  - Test file covers a missing rate, a shift over 10h, client min-billable hours, a cancelled event and a voided report.

**B3 - app:** `/admin/payroll?month=YYYY-MM` (per employee, drill-down to shifts) and `/admin/billing?month=YYYY-MM`
  (per client, then per event). Server actions go in `app/admin/actions.ts` after `requireRole("admin")`. Hebrew, RTL,
  phone layout, light theme tokens.

**B4 - export:** one .xlsx per report (RTL sheet, Hebrew headers, totals row). No Form 101 or bank fields.

**B5 - billing-cycle screen:** close and reopen a month with `close_billing_cycle` / `reopen_billing_cycle` (already
  live). The Form 101 purge button stays hidden until Milestone D.

Done when: the DB tests pass, the payroll and billing numbers for a hand-built test month match a hand calculation,
the export opens correctly in Excel, and the screens are checked by role in the browser.

## Milestone C - remaining product screens (roadmap Phases 4-5)
- Employee home: assigned vs pending shifts and this month's hours and estimated pay (reuse `v_my_monthly_hours`).
- Recruiter: FIFO credit redemption from the event screen (`redeem_recruiter_credits` is live).
- Admin: recruiter-credit overview per recruiter and month; the client pricing editor (per-role price list, overtime rules).
- Notifications: write rows to `notifications` on the events that matter: registration approved, rejected or removed,
  event cancelled, date or time changed, hours approved.
- Compliance dashboard: missing bank details or Form 101 and duplicate national IDs. The counts only; the data itself
  stays behind 2FA.
- Owner decisions still open: O2 (block unapproved employees from self-registering?) and O4 (may a recruiter set
  `base_rate`?).

## Milestone D - pre-launch (mandatory before real users)
1. **Separate production Supabase project.** Today dev and Vercel production share `yjgqunrboxihxtgkxibw`, so every dev
   migration and test run hits production data. Create a prod project, replay `supabase/migrations/` there, point the
   Vercel Production env at it, and keep the current project as dev. Highest-risk item: plan it with the owner.
2. **2FA (aal2)** for Admin (AGENTS §6). Only after it exists:
   - the Form 101 / bank-details flow (`form_101_submissions` gets its policies);
   - encryption at rest;
   - the monthly purge, scheduled with `purge_form_101_submissions`.
3. Schedule `cleanup-unverified-users` after the owner reviews a dry run (AGENTS §5.7).
4. Backups, an error-monitoring hook, and a final production smoke test by role.

## Working rules (recap)
- Branch from `origin/master`; local `master` (`9c13cb6`) is a stale stub.
- Push with the `everyjobcrm-dev` account (`yosefsam2008` has no write access).
- Never run DDL/DML without the owner's explicit approval in chat. Run tests in a transaction that always rolls back.
  The Supabase MCP hangs on statements that contain `DROP`.
- Regenerate `types/supabase.ts` after every applied migration (UTF-8, LF).
- Each slice ships as its own conventional commit with tsc, lint and build clean. Say what is not verified.
