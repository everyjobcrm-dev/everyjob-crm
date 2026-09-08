# everyJob CRM — Master Development Plan & System Architecture
Last updated: August 2026

## Status Legend
- Done — development complete, code reviewed and merged
- In Progress — current sprint priority / active bottleneck
- Planned — on the roadmap, not yet started

## Phase 0: Infrastructure & Core Stack
- Done — Next.js (App Router) + TypeScript
- Done — Full Supabase (PostgreSQL) integration
- Done — Tailwind CSS v4 with RTL (logical properties), design system: Electric Indigo & Hyper Lime
- Planned — Configure `allowedDevOrigins` in `next.config.ts` before production
- Planned — Separate Supabase environments (Dev / Staging / Prod)

## Phase 1: Data Architecture & Core Schema
- Done — Type/constraint audit; new tables: `shift_hour_submissions`, `recruiter_bonuses`, `employee_documents`
- Done — Automated business triggers
- Done — Views for staffing-status calculation and hour-approval board (single source of truth)
- Done — Hour-approval state machine (Pending -> Approved / Rejected)
- Planned — Confirm and run migration blocks B, D, E in production

## Phase 2: Auth & Authorization
- Done — RBAC: four roles (Admin, Manager, Recruiter, Employee) in `auth-context.tsx`
- Done — Independent permission check on every server action
- Done — Fixed routing bug for the field-manager role
- In Progress — 2FA (SMS/Email) for Admin login; blocks Form 101 exposure until complete
- Planned — Extend signup form: national ID, gender, phone, date of birth (with automatic age calculation)
- Planned — Strict RLS on all new tables, based on `profiles.role`

## Phase 3: Events Management
- Done — Multi-role roster, derived staffing status, travel budget, flexible `base_rate` (`pending_rates`)
- In Progress — Waitlist: signup for full shifts with automatic promotion on cancellation
- In Progress — `cancellation_requests`: controlled cancellation flow, not self-service
- Planned — Smart filtering by age and authorized roles

## Phase 4: Clients Management
- Done — Full CRUD, duplicate prevention, `23505` error handling, `ClientDetailDrawer`
- Planned — Smart pricing model per role, decoupled from employee wage rate
- Planned — Per-client overtime billing rules

## Phase 5: Role-Based Interfaces
- Employee — Planned: home screen, digital Form 101 signature, bank details
- Recruiter — Planned: assignment management; In Progress: bonus wallet with monthly withdrawal cap
- Field Manager — In Progress: attendance entry, employee ratings, final attendance report
- Admin — Planned: finance and pricing management; Planned: bulk Form 101 deletion

## Phase 6: Payroll & Billing
Starts immediately after Phases 1 and 2 are complete.
- Planned — Billing engine with Excel export
- Planned — Employee payroll report (regular hours, 125%/150%, travel, bonuses)
- Planned — Compliance dashboard (missing Form 101s, missing bank details, national ID duplicates)

## Phases 7–9: Compliance, Security, Future
- Done — Internal in-app notifications (partial rollout)
- Planned — Encryption at rest; server-level Form 101 access restricted to 2FA sessions only; monthly purge as a cron job
- Planned (Phase 2 expansion) — Native app via Expo, GPS for field managers, WhatsApp/SMS integration, external accounting API

## Architecture Decisions Log
Context for the agent; not part of the original spec document.
- Never store staffing status — always derive it from the `event_role_fill_counts` view
- Extracted `FinancialClosureSummary` as a shared component
- Consolidated admin server actions into `app/admin/actions.ts`
- Removed the global `end_time` field from `events`; corrected `min_rating` and `travel_budget_per_worker` naming
- Resolved a zod/react-hook-form type-inference issue via `z.input<>`/`z.output<>` split with the three-generic `useForm` pattern
- Fixed RLS policies to reference `profiles.role` rather than a nonexistent `user_roles` table
- Dropped the `created_by` foreign key to unblock user deletion; removed `dressCode` from the client schema