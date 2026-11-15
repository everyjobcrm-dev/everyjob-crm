# everyJob CRM — Master Development Plan & System Architecture
Last updated: 15 November 2026

# Status Legend
Done — development complete, code reviewed and merged

In Progress — current sprint priority / active bottleneck

Planned — on the roadmap, not yet started

<!-- // TODO(pre-launch): remove dev email verification bypass -->
Email verification is currently bypassed during development.

# Pre-launch
- [ ] Re-enable two-step email verification (mandatory before launch)
	- Purchase a domain and verify it in Resend (SPF, DKIM, MX, DMARC); a subdomain like `mail.<domain>` is preferred
	- Configure Custom SMTP in Supabase (`smtp.resend.com`, port 465) using a sender address from the verified domain
	- Ensure the "Confirm signup" template uses `{{ .Token }}` and is correctly formatted for RTL/Hebrew
	- Increase the email rate limit in Supabase
	- Remove `DEV_SKIP_EMAIL_VERIFICATION` from the code, `.env.example`, and all environments (search for: "pre-launch")
	- Test the end-to-end sign-up flow using Gmail, Outlook, and iCloud

- [ ] Separate production Supabase project: today dev and Vercel production share `yjgqunrboxihxtgkxibw`; create a prod project, replay `supabase/migrations/`, point Vercel Production at it
- [ ] 2FA (aal2) for Admin, then the Form 101 / bank-details flow, encryption at rest, and the monthly Form 101 purge as a cron job
- [ ] Owner runs `supabase migration repair` for the hand-applied migrations so the CLI history matches the live DB
- [ ] Schedule `cleanup-unverified-users` after a reviewed dry run; backups, error monitoring, final production smoke test by role

# Path to Sale — full IP acquisition by a staffing company
Added 15 November 2026. Goal: sell the product outright (code, database schema, domain, documentation) to one staffing
company. Stages run in order; each ends with an exit criterion. Owner tags: **[Dev]** engineering, **[Owner]** the
product owner (accounts, purchases, decisions), **[Legal]** the owner's lawyer. Rule for every stage: no work that only
the buyer can specify (their pay rules, branding, accounting format) before the deal is signed.

## Stage 1 — Demo readiness (now, before the first meeting; ~3 working days)
- [ ] [Dev] Demo data: `supabase/pending/20261115_demo_seed.sql` (4 clients, 7 events across past/open/pending_rates,
      16 roster employees, approved and pending hour reports, ratings, a full role with a waitlist); rollback beside it.
      [Owner] runs it in the SQL Editor
- [ ] [Owner] Remove the Milestone A test data (`supabase/pending/20261113_seed_a_past_events_rollback.sql`) and any other
      test clients/events, so the demo shows only realistic data
- [ ] [Owner] Give the demo sign-in users (Admin, Manager, Recruiter, Employee) real-looking Hebrew names and simple
      passwords kept outside the repo
- [ ] [Dev] Close the open browser-verification rows (staff-as-worker, min-rating warning, approving a pending employee
      from the picker, sign-in after restore) and fix what fails
- [ ] [Dev] Mobile pass at 390px on every screen of the demo script (employee screens first: they are used on a phone)
- [ ] [Dev] Hebrew error/empty/404/500 pages: no English or stack text can reach the screen during a demo
- [ ] [Dev] Map the remaining DB errors to Hebrew (22007 bad date/time, 22P02 bad uuid/number) in `lib/events/errors.ts`
- [ ] [Dev] Basics a buyer notices: favicon, page titles, share preview (Open Graph), loading states on slow actions
- [ ] [Owner] Buy the domain (the only purchase before the deal) and point it at the Vercel production deployment
- [ ] [Dev+Owner] 10-minute demo script by business pain: signup → approval → scheduling → attendance → hour approval →
      payroll and client billing Excel; plus a 3-minute recorded backup video
- [ ] [Dev] One-page product sheet (Hebrew): what it does per role, screenshots, what is next

Exit: the whole script runs on a phone and a laptop on the production URL with no error and no test data.

## Stage 1b — Feature gaps from the price quote (items 2, 5, 11; owner decision 15 November 2026)
Needs one migration (owner confirms the exact SQL, runs it in the SQL Editor, then types are regenerated).
- [ ] [Dev] Quote item 2 — full employee card: add city and region to the employee profile (set at signup, editable
      by the employee and by staff); show name, tz, phone, age (from `birth_date`), city/region and join date
      (`profiles.created_at`) on the staff employee card. The Form 101 secure upload part stays in Stage 5: it is blocked
      for everyone until Admin 2FA exists (AGENTS §8, §11)
- [ ] [Dev] Quote item 5 — employee portal by area: events get a region; the employee's open-shifts list defaults to
      their own region with a control to show all regions. Upcoming shifts and shift history already exist (C1)
- [ ] [Dev] Quote item 11 — search and filters: staff filter employees by city/region and by role tags (the roles a
      worker does: waiter, bartender, usher...), filter events by region/status/date, and one search box that finds
      employees, clients and events from the app shell
- [ ] [Dev] Add city, region and role tags to the demo seed (`supabase/pending/20261115_demo_seed.sql`)

Exit: an employee in the south sees southern shifts first; a manager finds "bartenders in the centre" in two clicks.

## Stage 2 — Due-diligence package (before signing; ~1 week)
A buyer's technical reviewer will ask for these. Having them ready shortens the deal and supports the price.
- [ ] [Dev] Security sweep: Supabase security and performance advisors clean or explained; `npm audit` triaged;
      secret scan of the full git history (e.g. gitleaks) — rotate any key that ever reached git
- [ ] [Dev] Narrow direct UPDATE on `events` / `event_roles` to the RPCs (backlog item; the reviewer will find it)
- [ ] [Dev] Remaining backlog fixes: `min_age` raise re-checks existing registrants (warn), direct `events.recruiter_id`
      writes validate the target role, `.gitattributes` (`eol=lf`), optional removal of the duplicate rating trigger
- [ ] [Dev] Automated smoke tests for the critical flows (Playwright, ~5 tests: sign-in per role, register for a shift,
      approve a registration, submit and approve hours, export payroll). Today only SQL behaviour tests exist
- [ ] [Dev] Technical documentation: README with local setup, architecture overview, data model diagram, RLS and role
      model summary, environment-variable list, migration and deployment runbook
- [ ] [Dev] Dependency licence inventory (all production dependencies and their licences; flag anything non-permissive)
- [ ] [Owner] `supabase migration repair` so the CLI migration history matches the live database (clean replay is what
      the buyer's production setup will rely on)
- [ ] [Owner+Legal] Statement of IP ownership: authored by the owner (with AI coding tools), no third-party code
      beyond open-source dependencies, no employer or client claim on the code
- [ ] [Owner+Legal] Privacy and compliance answers the buyer will need: what personal data is stored (national ID,
      phone, birth date; Form 101 and bank details once 2FA exists), where it is hosted, who can read it (RLS by role),
      retention (monthly Form 101 purge)

Exit: a reviewer can clone, run, read and assess the system without the owner in the room.

## Stage 3 — Commercial and legal (in parallel with Stage 2)
- [ ] [Owner+Legal] NDA before showing code or the database; product demos need none
- [ ] [Owner] Decide the model and price floor: outright IP sale (exclusive, highest price) vs. licence/SaaS (can be
      sold to more companies). An exclusive sale should be priced accordingly
- [ ] [Owner+Legal] Letter of intent, then the IP assignment / sale agreement: scope of what transfers (code, schema,
      domain, docs, design), warranties and their limits, the handover period and its price, paid change requests after
      it, and any non-compete (keep it narrow: this product, this market, limited time)
- [ ] [Owner+Legal] Payment structure: escrow or staged payments; code and accounts transfer only against payment
- [ ] [Owner+Legal] Define Stage 5 (production launch) as a separately priced milestone, or with an explicit scope

Exit: signed agreement and first payment received.

## Stage 4 — Handover (at closing; ~1 week)
- [ ] [Owner] Transfer the GitHub repository to the buyer's organisation
- [ ] [Owner] Transfer or recreate the Supabase project in the buyer's organisation (Supabase supports project transfer
      between organisations); transfer the Vercel project and the domain
- [ ] [Dev] Rotate every secret after transfer (Supabase service-role and anon keys, any API keys); remove the owner's
      personal accounts from all services
- [ ] [Dev] Remove all demo data from the buyer's database; create the buyer's first Admin
- [ ] [Dev] Import the buyer's existing clients and employees (CSV/Excel import script, run once, verified counts)
- [ ] [Dev+Owner] Training: one session per role (Admin, Manager, Recruiter) and a short Hebrew user guide

Exit: the buyer signs in with their own accounts on their own infrastructure; the owner holds no credentials.

## Stage 5 — Production launch on the buyer's infrastructure (post-closing, milestone-paid; ~2–4 weeks)
The "Pre-launch" list above, in this order:
- [ ] [Dev] Separate production Supabase project, replay `supabase/migrations/`, point Vercel Production at it
- [ ] [Dev+Owner] Email verification: verified domain in Resend, Custom SMTP, Hebrew template, remove
      `DEV_SKIP_EMAIL_VERIFICATION`, end-to-end signup test on Gmail/Outlook/iCloud
- [ ] [Dev] 2FA (aal2) for Admin — deliberately last per the owner; only then the Form 101 / bank-details flow,
      encryption at rest and the monthly purge cron
- [ ] [Dev] Operations: daily backups / point-in-time recovery, error monitoring, uptime alert, rate limiting on the
      public auth endpoints, scheduled `cleanup-unverified-users` after a reviewed dry run
- [ ] [Legal] Terms of use, privacy policy and an accessibility statement in Hebrew (Israeli accessibility regulations
      apply to a service offered to the public, i.e. the employee-facing screens); database registration if required
- [ ] [Dev] Accessibility pass on the employee-facing screens (keyboard, contrast, labels, screen reader basics)
- [ ] [Dev] Production smoke test by role

Exit: real workers sign up and work real shifts; payroll and billing exports match the buyer's manual check for one month.

## Stage 6 — After the sale (paid change requests, buyer's choice)
Buyer-specific: their pay rules (overtime, Shabbat/holiday rates, travel), per-client overtime billing, their Excel
format, their branding. Product: smart shift filtering by role and age, bulk approval screen for managers, unread
notification badge, push/SMS/WhatsApp, native app (Expo) with GPS for field managers, accounting integration
(explicitly out of scope today, AGENTS §1).

# Phase 0: Infrastructure, Stack & Build Pipeline
Done — Next.js (App Router) + TypeScript

Done — Full Supabase (PostgreSQL) integration

Done — Tailwind CSS v4 with RTL (logical properties); design system replaced in Nov 2026 (PR #5) by a light theme from the logo: ink #131217, pink #FF84A7, sun #FDD559, sky #83D9FF, tokens in app/globals.css

Done — CI/CD Pipeline: GitHub Actions for automated type-checking (tsc --noEmit) and ESLint before allowing merges to main.

Done — Vercel Deployment: Connect main branch to Vercel for automated production builds; connect dev branch for staging preview deployments.

Done — Configure allowedDevOrigins in next.config.ts before production.

Done — Database Migrations: Standard Supabase CLI workflow (supabase db push) for moving schema changes from Dev -> Staging -> Prod environments.

# Phase 1: Data Architecture & Core Schema
Done — Type/constraint audit; new tables: shift_hour_submissions, recruiter_bonuses, employee_documents

Done — Automated business triggers

Done — Views for staffing-status calculation and hour-approval board (single source of truth)

Done — Hour-approval state machine (Pending -> Approved / Rejected)

Done — Confirmed and ran migration blocks B, D, E in production

# Phase 2: Auth & Authorization
Done — RBAC: four roles (Admin, Manager, Recruiter, Employee) in auth-context.tsx

Done — Independent permission check on every server action

Done — Fixed routing bug for the field-manager role

Planned (pre-launch, Milestone D; deliberately deferred by the owner) — 2FA (aal2) for Admin login. Until it exists Form 101 and bank details stay blocked for everyone, Admin included (every aal2 gate fails closed)

Done — Signup form with national ID, gender, phone and date of birth (age derived; min_age enforced on scheduling)

Done — Strict RLS on all new tables, based on profiles.role (standing rule for every new table)

Done (Nov 2026, p10c/p10d/C6a) — Soft delete for users (profiles.deleted_at + auth ban, restore by Admin); new-employee approval ("ממתין/ה לאישור", approved by Admin/Manager/Recruiter); an unapproved employee cannot self-register for shifts (staff can still schedule them)

# Phase 3: Events Management & Shift Registration Lifecycle
Done — Multi-role roster, derived staffing status, travel budget, flexible base_rate (pending_rates)

Done — Waitlist: signup for full shifts with automatic promotion trigger on cancellation (auto_promote_from_waitlist)

Done — cancellation_requests: controlled cancellation flow, not self-service

Done — Events lifecycle (October 2026): DB enforcement (status state machine, registration write guard, role hierarchy with recruiter scope), staff RPCs and roster (Phase 3), worker cancellation requests and "המשמרות שלי" (Phase 4). M6c applied; browser verification by role done in Nov 2026 (docs/handoff.md §10), a few rows still open (staff-as-worker, min-rating warning, approving a pending employee from the picker).

Done (Oct-Nov 2026) — Shift Registration State Machine: Full UI/Server implementation of the registration lifecycle:

Pending: Employee requests a shift.

Approved: Manager/Recruiter approves request; employee is assigned; event_role_fill_counts updates automatically.

Rejected: Manager/Recruiter denies request; slot remains open.

Waitlisted: Shift is full; employee joins queue.

Cancellation semantics (decided): an approved cancellation request -> `cancelled` (employee may re-register); staff removal -> `removed` (no self re-registration); `rejected` cannot re-apply.

Done (Oct-Nov 2026, Phase 6 h0-h5 + H6v2 FIFO redemption applied; docs/design-hours-flow.md) — Hours flow, verified in the browser (submit / approve / reject / void, Manager rate window); Admin can void approved hours (PR #10). Remaining: optional removal of the duplicate rating trigger. Original scope: attendance guards, RLS policies for shift_hour_submissions / employee_ratings / recruiter_bonuses, two-person review constraint, recruiter-credit trigger (supabase/recruiter_compensation_redesign.sql was never applied live and is superseded: it re-adds events.recruiter_id).

Done (Oct-Nov 2026, P9 + p10a) — Event edit (details, roles, responsible recruiter) through allow-list RPCs; roles prefilled from the client's preferred roles; two closure levels: `closed` = closed for registration, `completed` = final closure (Admin/Manager, reopen for editing, blocked while hour reports are pending); cancel / restore

Planned — Smart Shift Filtering: Ensure employees only see and can request shifts matching their profiles.role arrays and age constraints.

Planned — Manager Approval UI: Real-time dashboard for Field Managers to rapidly approve/reject incoming shift requests in bulk.

# Phase 4: Clients Management
Done — Full CRUD, duplicate prevention, 23505 error handling, ClientDetailDrawer

Done (Nov 2026, B1 + C3) — Per-role client price list, decoupled from the employee wage rate: Admin-only (column grant + `get_clients_admin`), applied to new event roles by a trigger; editor in the client dialogs

Dropped (owner decision Q2, 2026-11-13) — billing is one flat price per role per client with no overtime uplift; `min_billable_hours` still applies. The overtime field was removed from the client dialogs (C3)

Phase 5: Role-Based Interfaces
Employee — Done (C1): home screen with assigned vs. pending/waitlisted shifts, monthly hours and estimated pay (legal overtime); Planned (Milestone D, needs 2FA): digital Form 101 signature, bank details

Recruiter — Done: assignment management, own pending-credit card (C2 fixed it reading wrong columns), event-screen FIFO redemption (`RedeemCreditsControl`, Manager/Admin)

Field Manager — Done: attendance entry, employee ratings, final attendance report

Admin — Done: shift hour report approval board, recruiter credit overview per recruiter and month (C2), Admin-set recruiter rates, client pricing (C3), payroll and billing screens, compliance counts (C5/C6b); Planned (Milestone D): bulk Form 101 deletion (the purge RPC exists and fails closed until 2FA)

# Phase 6: Payroll & Billing
Done (Nov 2026, B1-B5; docs/payroll-billing-design.md) — Billing engine with Excel export; employee payroll report (100%/125%/150% per shift, travel); billing-cycle screen

Done (C5, C6b) — Compliance dashboard: counts only (duplicate national IDs, missing Form 101, missing bank details; shown to Admin without 2FA by owner decision 2026-11-15, the documents themselves stay blocked)

Not built — weighted recruiter bonus on the employee payslip

# Phases 7–9: Compliance, Security, Future
Done (C4, Nov 2026) — Internal in-app notifications: DB triggers write `notifications` on registration approved/rejected/removed, event cancelled, event date/time change and hours approved; shown on /employee/notifications. Planned: push, SMS/WhatsApp, an unread badge in the nav

Planned — Encryption at rest; server-level Form 101 access restricted to 2FA sessions only; monthly purge as a cron job

Planned (Phase 2 expansion) — Native app via Expo, GPS for field managers, WhatsApp/SMS integration, external accounting API

Architecture Decisions Log
Context for the agent; not part of the original spec document.

Never store staffing status — always derive it from the event_role_fill_counts view

Extracted FinancialClosureSummary as a shared component

Consolidated admin server actions into app/admin/actions.ts

Removed the global end_time field from events; corrected min_rating and travel_budget_per_worker naming

Resolved a zod/react-hook-form type-inference issue via z.input<>/z.output<> split with the three-generic useForm pattern

Recruitment Credits: Extend `recruiter_bonuses` into an event/employee credit ledger. Create credits only on the approved transition for matching, non-self recruits; use the recruiter's Admin-set `profiles.recruiter_bonus_rate`, not the employee's `wage_rate`. Derive pending count and amount from one shared view, and redeem oldest credits FIFO from event management screens.

Recruiter Overview: Add a read-only Admin screen backed by the shared pending-credit view; it must contain no redemption action.

Fixed RLS policies to reference profiles.role rather than a nonexistent user_roles table

Dropped the created_by foreign key to unblock user deletion; removed dressCode from the client schema

Role hierarchy Admin ⊇ Manager ⊇ Recruiter (anything a Recruiter can do in event management a Manager can do, anything a Manager can do an Admin can do); Recruiter acts only on events they own (events.recruiter_id). Encoded once in lib/auth/permissions.ts and mirrored by DB triggers/RLS (app_can_manage_event)

Staff roles may register as workers: placed directly as approved when capacity allows, else waitlisted; exempt from min_rating, not from min_age

Capacity = pending + approved; event_role_fill_counts derives it and excludes cancelled events; no auto-close when an event fills

Event status model: two closure levels (closed = registration closed; completed = final closure by Admin/Manager, reopen completed -> closed); paused is frozen (no app transition in or out); cancelled records cancelled_from_status and is restored by Admin/Manager only; deleting an event is Admin-only and refused when audit history exists

Direct client writes to event_registrations are blocked by a DB guard (inserts only via SECURITY DEFINER RPCs); employees may only raise their own cancellation request

The live database is the source of truth: live-only objects are captured read-only in supabase/live_snapshot/; DROP-containing migrations are run by hand in the SQL Editor
