# AGENTS.md — everyJob CRM

The single source of truth for any coding agent working in this repository: Claude Code, Antigravity, or anything else. Tool-specific files (`CLAUDE.md`, a legacy `GEMINI.md`) may only add tool mechanics. They must not restate or override rules from this file. If one of them, or any doc under `docs/`, conflicts with this file, **stop and ask the human**. Don't resolve the conflict yourself.

**Precedence:** §8 deny rules > the rest of this file > `docs/*` > the task prompt. If a task conflicts with §8, say so and pause. Never quietly follow the task.

---

## 1. Project Overview

everyJob CRM is a workforce-management platform for the Israeli gig-shift labor market. It connects businesses that need hourly shift workers with a pool of workers. It covers recruitment, scheduling, attendance, ratings, payroll reporting and client billing, all behind a strict four-role permission system.

- **Hebrew-first, RTL-native.** Hebrew and RTL are the default, not a localization layer. English-first patterns such as `ml-`/`mr-` classes or LTR-only components are defects.
- **No external accounting or payroll integration.** Billing and payroll output are internal reports and Excel exports only. Don't build toward an external accounting API unless a task explicitly asks (roadmap Phase 9).

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19 | TypeScript only. No `pages/` router |
| Database / BaaS | Supabase (PostgreSQL) | RLS is the primary authorization boundary at the DB layer |
| Styling | Tailwind CSS v4 | Logical properties only (§7) |
| Animation | Framer Motion | |
| Forms / validation | Zod 3 + react-hook-form 7 | Required generic pattern (§5.3) |
| Native app | React Native / Expo | Not started. Don't scaffold it unless asked |

Fast checks (run only what your change touches): `npm run typecheck`, `npm run lint`. Run `npm run build` only when asked.

## 3. Repository Map

| Path | Purpose |
|---|---|
| `app/admin/actions.ts` | The home for Admin-role server actions (§5.5) |
| `app/admin/events/actions.ts` | Legacy exception to §5.5. Don't add new Admin logic here, and don't move it without being asked |
| `app/manager/actions.ts` | Manager-role server actions |
| `lib/auth-context.tsx` | Client role/session context. A UX layer only, never a security boundary (§5.2) |
| `types/supabase.ts` | Generated DB types. Never hand-edit (§5.6) |
| `supabase/*.sql` (root) | Legacy SQL, already applied. Read-only reference |
| `supabase/pending/` | Proposed, **not yet applied** SQL written by agents (§5.6) |
| `supabase/migrations/` | Applied SQL, timestamped, mirrors the remote migration history (§5.6) |
| `supabase/functions/` | Edge Functions |

**Multi-file changes:** if a task touches more than one file across the events, permissions or billing modules, state the plan first: files touched and order of operations. These modules are coupled through views and triggers, and an out-of-order edit (changing a column before the view that depends on it) is the most common source of regressions here.

## 4. Domain Glossary (Hebrew → code)

Product discussions are in Hebrew and the code is in English. Translate with this table. Never invent or transliterate a new identifier. If a term is missing, check `docs/spec-full.md`, then ask.

| Hebrew | Concept | Code identifier |
|---|---|---|
| אדמין | Admin | `profiles.role = 'admin'` |
| מנהל שטח / הרשאת Skill | Field Manager | `profiles.role = 'manager'` |
| מגייס | Recruiter | `profiles.role = 'recruiter'` |
| עובד | Employee | `profiles.role = 'employee'` |
| טופס 101 / פרטי בנק | Form 101 / bank details | `employee_documents`, `form_101_submissions` (sensitive, §8.2) |
| זיכוי גיוס | Recruitment-credit ledger record | `recruiter_bonuses`: one per approved recruited employee/event, redeemed FIFO by Manager or Admin |
| תעריף זיכוי גיוס | Per-recruiter credit rate | `profiles.recruiter_bonus_rate`: NIS per approved hour, Admin-set only, separate from `wage_rate` |
| דוח שעות | Hour report | `shift_hour_submissions` |
| רשימת המתנה | Waitlist | waitlist + trigger `auto_promote_from_waitlist` |
| בקשת ביטול | Cancellation request | `cancellation_requests` |
| דירוג | Post-shift star rating | rolls into the employee's average rating |
| תעריף בסיס | Base rate | `base_rate` (nullable; see `pending_rates`) |
| תקציב נסיעות | Travel budget | `travel_budget_per_worker` |
| סטטוס איוש | Staffing status | derived only, from view `event_role_fill_counts` |

## 5. Architecture Rules

### 5.1 Derived state lives in views, never in stored columns
Staffing status, hour totals and approval aggregates come from views such as `event_role_fill_counts`. They are never stored columns updated imperatively; that pattern caused aggregate drift and was removed on purpose. If a feature seems to need a stored aggregate, write a view instead. Before computing any of these in a component or action, check whether a view already exists.

Corrected mistakes. Do not reintroduce them:
- `events` has no `end_time`. Derive it as `MAX(event_roles.end_time)`.
- `events` has no `title` and no `wage_rate`.
- The field is `min_rating`, not `required_rank`.
- There is no `user_roles` table. Roles and RLS use `profiles.role`.

### 5.2 Server-side authorization is independent of the client
`lib/auth-context.tsx` decides what the UI shows, nothing more. Every server action re-verifies the caller's session and `profiles.role` on the server before it acts. A passed-in role, a client-side check, or the shape of the request is never sufficient. Weakening this is a deny-listed change (§8.3).

### 5.3 Form validation pattern
Split the input and output types and use the three-generic `useForm`:

```ts
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const form = useForm<FormInput, unknown, FormOutput>({
  resolver: zodResolver(schema),
});
```

The single-generic form silently typed transformed fields as `unknown` in this codebase. Don't "simplify" it back. When a schema and its form both change, change them in the same edit.

### 5.4 Unique-violation handling
Every insert against a unique constraint catches Postgres code `23505` explicitly and returns a specific Hebrew message, never a generic error toast. Mirror the Clients module implementation.

### 5.5 Server action organization
New Admin logic goes in `app/admin/actions.ts`. Don't create new `actions.ts` files under `app/admin/`. Fragmenting them caused permission-check duplication and drift.

### 5.6 Database change workflow
Agents **never** execute DDL or DML against any Supabase database: dev, staging or prod. This holds through the CLI (`supabase db push`, `npm run db:push`, `migration up`), the Supabase MCP (`apply_migration`, `execute_sql` with anything other than read-only `SELECT`, branch create/merge/reset/rebase, `deploy_edge_function`), or any other route.

1. **Propose.** Write the SQL to `supabase/pending/<short_name>.sql` and show it to the human. One logical change per file. Make it idempotent where practical (`IF NOT EXISTS`, `CREATE OR REPLACE`), and include any view, RLS and grant changes the column change depends on, in dependency order.
2. **Human applies.** The human runs it in the Supabase SQL Editor. Wait.
3. **Record.** Only after the human confirms it was applied, move it to `supabase/migrations/<YYYYMMDDHHMMSS>_<short_name>.sql` (UTC timestamp) and delete the pending copy.
4. **Repair history.** Give the human this command to run:
   `npx supabase migration repair --status applied <YYYYMMDDHHMMSS> --linked`
   This keeps dev, staging and prod migration history aligned.
5. **Regenerate types.** Write them to `types/supabase.ts` as UTF-8 without a BOM:
   - bash / PowerShell 7: `npx supabase gen types typescript --linked > types/supabase.ts`
   - Windows PowerShell 5.1: its `>` writes UTF-16, so use `cmd /c "npx supabase gen types typescript --linked > types\supabase.ts"`
   - Supabase MCP: `generate_typescript_types`, writing the result to `types/supabase.ts`

   Then run `npm run typecheck`.

Read-only DB access through the MCP or CLI (listing tables, migrations, advisors, logs; `SELECT`) is allowed, except for any read of the §8.2 tables.

### 5.7 Unverified-account cleanup
Unverified Auth users can hold unique `profiles.email` / `profiles.tz` values and block a legitimate retry. The cleanup is `supabase/functions/cleanup-unverified-users/index.ts`. It uses the Admin Auth API and never deletes from `auth.users` directly.

- Eligible users have `email_confirmed_at IS NULL` and `created_at` older than 24 hours. Confirmed users are never selected or deleted.
- The default mode is `dry-run`. The function is not scheduled, and real deletion stays disabled until the human reviews dry-run output and approves it.
- Before deleting, it checks every known profile FK path. Any dependent row, missing table/column, or missing profile blocks deletion of that user.
- Logs contain the user id, a **masked** `tz`, creation time, deletion time and exact age. Raw `tz` never appears in logs.
- The read-only inspection queries are in `supabase/unverified_account_cleanup_inspection.sql`.

### 5.8 Pre-launch items: don't touch unless asked
- **2FA** (Admin, mandatory before launch) is deferred to the end of the project. Don't implement, scaffold or change 2FA/MFA code now. Until it ships, §8.2 applies to Admin too.
- **Email verification** is bypassed in development through `DEV_SKIP_EMAIL_VERIFICATION`. Don't remove or extend the bypass. Its removal is tracked in `docs/roadmap.md` → Pre-launch.

## 6. Role-Based Access Control

`profiles.role` ∈ `admin | manager | recruiter | employee`. The table shows the target state. Rows marked † are blocked for every role until 2FA ships (§5.8, §8.2).

| Capability | Admin | Manager | Recruiter | Employee |
|---|:---:|:---:|:---:|:---:|
| Requires 2FA | Yes (pre-launch) | No | No | No |
| View Form 101 / bank details † | Yes, aal2 only | No | No | Own only, through the fill flow |
| Approve final hour reports | Yes | No | No | No |
| Set client pricing / billing rules | Yes | No | No | No |
| Set per-recruiter credit rate | Yes | No | No | No |
| Create events | No | No | Yes | No |
| Approve / reject / remove event signups | No | Yes (live event) | Yes (own recruits) | No |
| Set employee hourly rate at assignment | Yes (any time) | Yes (until the 10th of the following month) | No | No |
| Enter shift attendance / hours | No | Yes (manual) | No | No |
| Rate employees post-shift | No | Yes | No | No |
| Submit hour report for approval | No | Yes | No | No |
| Sign up for a shift | No | No | No | Yes (pending approval) |
| Cancel own confirmed signup | No | No | No | **No.** Can only request cancellation |
| Fill own Form 101 / bank details | — | — | — | Yes |
| View own hours / estimated pay | — | — | — | Yes |

An employee never cancels a confirmed signup directly. They submit a `cancellation_requests` row, and a Manager, Recruiter or Admin performs the removal. A direct-cancel path is a spec violation, not an edge case.

## 7. RTL, Design System, UI Copy

- Tailwind uses logical properties only: `ms- me- ps- pe- start- end-` and `text-start`/`text-end`. Never use `ml- mr- pl- pr- left- right-` or `text-left`/`text-right`, even for icons, dividers or absolutely positioned badges.
- Tokens: Electric Indigo `#4F46E5` (primary), Hyper Lime `#D4FF00` (accent).
- Anti-template design: no default SaaS gradients, no pill buttons, deliberate asymmetry over centered symmetry. When a design isn't specified, move away from the generic Tailwind-UI default.
- All user-facing copy (labels, buttons, errors, empty states) is Hebrew. Identifiers, comments and commit messages are English.

## 8. Deny Rules: hard stops

Pause and get explicit human confirmation in the current session before any of these. Auto-continue or unattended mode never overrides this section.

1. **Database writes.** Never apply DDL or DML to any database by any route (§5.6). Writing a proposal to `supabase/pending/` is allowed. Applying it is the human's job. Don't bundle unrelated schema changes into one proposal.
2. **Form 101 / bank details** (`employee_documents`, `form_101_submissions`, bank fields). Until 2FA ships, these are readable by **nobody but the owning employee's fill flow**, Admin included. Don't add any other read path: no UI, action, query, MCP `SELECT`, log, seed, fixture or debug tool. Any future gate on this data must require `aal2` server-side and fail closed. Never weaken, bypass or add a dev workaround to such a gate.
3. **Server-side permission checks.** Never remove, weaken or bypass role re-verification in a server action, even temporarily.
4. **RLS.** Never disable or broaden a policy to unblock a bug. Find the correct policy shape instead.
5. **Form 101 retention.** Form 101 data is purged at the end of each billing cycle. Build no storage or retention path that outlives the cycle.
6. **Production-affecting platform actions.** Don't change Vercel env vars, domains, firewall or protection settings, and don't deploy, promote or roll back, without explicit confirmation. Reading deployments, build logs and runtime logs is fine.

## 9. Working Style & Verification

- Prefer small, reviewable diffs, especially in `app/admin/actions.ts` and the events module.
- Run `npm run typecheck` (and `npm run lint` on touched files) before declaring code done. Report failures verbatim.
- There is no E2E suite. When you change a state machine (registration: Pending → Approved / Rejected / Waitlisted; hour approval: Pending → Approved / Rejected) or a view, list the manual verification still needed. "It compiles" is not verified.
- Don't commit secrets, `.env*` values, or real personal data (`tz`, phone, bank details) in code, fixtures or logs.

## 10. Reference Docs (read on demand)

- `docs/spec-full.md`: full role and screen spec, the source of truth for UI/UX not covered here.
- `docs/roadmap.md`: phase status and decision log. Check it before new feature work.
- `docs/events-module-decisions.md`: events-module decisions. Subordinate to this file; if they conflict, stop and ask.

Keep this file under about 300 lines. Past that, split by topic into `.agents/rules/<topic>.md` instead of growing it.
