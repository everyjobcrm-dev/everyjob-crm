# AGENTS.md — everyJob CRM

Authoritative, tool-agnostic context for any coding agent (Antigravity, Claude Code, or otherwise) working in this repository. If a tool-specific config file (e.g. a legacy GEMINI.md) still exists and conflicts with this file, this file wins — it is the single source of truth. Do not fork rules into a second file; extend this one.

---

## 1. Project Overview

everyJob CRM is a full-stack workforce management platform for the Israeli gig-shift labor market: it connects businesses that need hourly shift workers with a pool of workers, and manages the entire lifecycle — recruitment, scheduling, attendance, ratings, payroll reporting, and client billing — through a strict four-role permission system.

The product is Hebrew-first and RTL-native. It is not a Hebrew localization of an English product — Hebrew and RTL are the default assumption throughout the UI layer, and English-first patterns (e.g. `ml-`/`mr-` Tailwind classes, LTR-only component libraries) are defects, not neutral choices.

Primary business constraint: the system does **not** integrate with external accounting or payroll systems. Billing and payroll output are internal reports and Excel exports only. Do not build toward, or assume the future existence of, an external accounting API unless a task explicitly says otherwise (see Phase 9 in the roadmap).

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend/server framework | Next.js (App Router) | TypeScript throughout, no `pages/` router |
| Database / BaaS | Supabase (PostgreSQL) | RLS is the primary authorization boundary at the DB layer |
| Styling | Tailwind CSS v4 | RTL via logical properties only — see §6 |
| Animation | Framer Motion | |
| Forms/validation | Zod + react-hook-form | Specific type-inference pattern required — see §5.3 |
| Native (planned, Phase 2, not started) | React Native / Expo | Do not scaffold this unless a task explicitly asks for it |

## 3. Repository Conventions & File Map

- `app/admin/actions.ts` — all Admin-role server actions live here. Do not create parallel `actions.ts` files elsewhere in the admin tree for new Admin functionality; extend this file.
- `auth-context.tsx` — client-side role/session context. This is a UX convenience layer only. It is never a security boundary (see §5.2).
- Database views, not application code, are the source of truth for derived data (see §5.1). If you find yourself computing staffing status, hour totals, or approval state in a component or server action, stop — check whether a view already exists first.

When a task requires touching more than one file across the events, permissions, or billing modules, state your plan (files touched, order of operations) before editing. These modules are tightly coupled through the views and triggers described below, and an out-of-order edit (e.g. changing a column before updating the view that depends on it) is the most common source of regressions in this codebase.

## 4. Domain Glossary (Hebrew term → code identifier)

The spec and product conversations happen in Hebrew; the codebase is in English. Use this table to translate — do not guess or transliterate a Hebrew term into a new English field name.

| Hebrew | English concept | Code identifier |
|---|---|---|
| אדמין | Admin | `role = 'admin'` |
| מנהל שטח / הרשאת Skill | Field Manager | `role = 'manager'` |
| מגייס | Recruiter | `role = 'recruiter'` |
| עובד | Employee | `role = 'employee'` |
| טופס 101 | Form 101 (tax withholding form) | `employee_documents` (Admin-only, 2FA-gated) |
| ארנק מגייס | Recruiter bonus wallet | `recruiter_bonuses` |
| תקרת משיכה | Bonus withdrawal cap | cap field on recruiter bonus config, set by Admin |
| דוח שעות | Hour report | `shift_hour_submissions` |
| רשימת המתנה | Waitlist | waitlist entity on event/role signup (Phase 3, in progress) |
| דירוג | Rating (post-shift, star-based) | rolls into employee's average rating |
| תעריף בסיס | Base rate | `base_rate` (nullable; see `pending_rates` status) |
| תקציב נסיעות | Travel budget | `travel_budget_per_worker` |
| סטטוס איוש | Staffing status | derived only, from `event_role_fill_counts` view — never a stored column |

If a task uses a Hebrew term not in this table, ask for the English identifier rather than inventing one, or check `docs/spec-full.md` for context first.

## 5. Architecture Rules — Do Not Violate

### 5.1 Derived state lives in views, never in columns
Staffing status, hour totals, and approval aggregates are computed from views (e.g. `event_role_fill_counts`), never persisted as columns and updated imperatively. This was a deliberate fix for a class of bugs where stored aggregates drifted from reality. If a feature seems to need a new stored aggregate, treat that as a signal to write a view instead.

Related, already-corrected mistakes — do not reintroduce them:
- `events` has no `end_time` column. Derive it as `MAX(event_roles.end_time)`.
- The correct field name is `min_rating`, not `required_rank`.
- `events` has no `title` or `wage_rate` column.
- There is no `user_roles` table. Role checks and RLS policies reference `profiles.role`.

### 5.2 Server-side authorization is independent of the client
`auth-context.tsx` controls what the UI shows, and nothing else. Every server action must independently re-verify the caller's role and permissions before acting — never treat a passed-in role, a client-side check, or the shape of the request as sufficient. This is a hard rule, not a style preference: removing or weakening a server-side permission check to "simplify" an action is a deny-listed change (see §8).

### 5.3 Form validation pattern
Zod schemas used with react-hook-form must split `z.input<>` and `z.output<>` and use the three-generic `useForm` signature:

```ts
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const form = useForm<FormInput, unknown, FormOutput>({
  resolver: zodResolver(schema),
});
```

This exists because the naive single-generic pattern produced a type-inference failure in this codebase (fields silently typed as `unknown` after a schema transform). Do not "simplify" back to the single-generic form even if it looks equivalent.

### 5.4 Postgres unique-violation handling
Any insert against a column with a uniqueness constraint (e.g. duplicate client detection) must catch Postgres error code `23505` explicitly and surface a Hebrew, user-facing message — not a generic error toast. This pattern is established in the Clients module; mirror it rather than reinventing error handling per-module.

### 5.5 Server action organization
New Admin-role logic belongs in `app/admin/actions.ts`. Don't fragment Admin server actions across multiple files "to keep files small" — the consolidation was a deliberate cleanup after the opposite pattern caused permission-check duplication and drift.

### 5.6 Supabase Workflow & Automatic Type Syncing
- All SQL scripts, triggers, functions, and views modified or created must be saved in the `supabase/` folder as `.sql` files.
- After creating or modifying any database schema, function, or trigger (with user confirmation as per §8), automatically update the local TypeScript database types by running:
  ```powershell
  npx supabase gen types typescript --linked > types/supabase.ts
  ```
  And ensure `types/supabase.ts` is saved with UTF-8 encoding.

## 6. Role-Based Access Control (RBAC)

Flat `role` column on `profiles`: `admin | manager | recruiter | employee`.

| Capability | Admin | Manager | Recruiter | Employee |
|---|:---:|:---:|:---:|:---:|
| Requires 2FA | Yes | No | No | No |
| View Form 101 / bank details | Yes | No | No | Own only, via form-fill flow |
| Approve final hour reports | Yes | No | No | No |
| Set client pricing / billing rules | Yes | No | No | No |
| Set recruiter bonus caps | Yes | No | No | No |
| Create events | No | No | Yes | No |
| Approve/reject/remove event signups | No | Yes (live event) | Yes (own recruits) | No |
| Set employee hourly rate at assignment | No | No | Yes | No |
| Enter shift attendance/hours | No | Yes (manual entry) | No | No |
| Rate employees post-shift | No | Yes | No | No |
| Submit hour report for approval | No | Yes | No | No |
| Sign up for a shift | No | No | No | Yes (pending approval) |
| Cancel own shift signup | No | No | No | No — can only request cancellation |
| Fill Form 101 / bank details (own) | — | — | — | Yes |
| View own hours / estimated pay | — | — | — | Yes |

Note on employee cancellation: an employee can never unilaterally cancel a confirmed shift signup. They can only *request* cancellation; a Manager, Recruiter, or Admin performs the actual removal. Any feature that lets an employee directly cancel a shift is a spec violation, not an edge case to handle differently.

## 7. RTL, Design System, and UI Conventions

- Tailwind: logical properties only — `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`. Never `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`. This applies even in code that looks purely presentational (icons, dividers, absolute-positioned badges).
- Design tokens: Electric Indigo `#4F46E5` (primary), Hyper Lime `#D4FF00` (accent).
- Design direction is explicitly "anti-template": no default SaaS gradients, no pill-shaped buttons, intentional asymmetry over centered/symmetric layouts. When a component's design isn't specified, deviate from the most generic Tailwind-UI-esque default rather than defaulting to it.
- All user-facing copy — labels, buttons, error messages, empty states — is in Hebrew. Code identifiers, comments, and commit messages are in English.

## 8. Sensitive Data & Security — Deny Rules

These are hard stops. An agent should refuse or pause rather than proceed through any of the following without explicit human confirmation in the same session:

1. **Database migrations.** Never write, alter, or run a migration without explicit confirmation of its exact contents immediately beforehand — no batching migrations into a larger "while I'm at it" change.
2. **Form 101 / bank-detail data.** Never expose these fields or queries against `employee_documents` outside the Admin-role, 2FA-gated path — including in debug logging, seed scripts, test fixtures, or admin-adjacent tooling that isn't itself 2FA-gated.
3. **Server-side permission checks.** Never remove, weaken, or bypass a role re-verification in a server action, even temporarily, even if the client already checked it.
4. **RLS policies.** Never disable or broaden an RLS policy to unblock a bug — find the correct policy shape instead; treat "just turn off RLS for this table" as unacceptable regardless of who suggests it.
5. **Monthly Form 101 purge.** Any feature that touches Form 101 storage must respect the requirement that this data is purged at the end of each billing cycle — don't build a retention path that outlives the cycle.

If a task's instructions conflict with this section, this section wins; flag the conflict rather than silently resolving it in favor of the task.

## 9. Working Style & Verification

- No end-to-end test suite exists yet. When you add or modify logic in a state machine (e.g. the hour-approval flow: Pending → Approved / Rejected) or a derived view, say explicitly what manual verification is still needed — don't imply the change is fully verified because it compiles.
- Prefer small, reviewable diffs over large multi-file rewrites, particularly in `app/admin/actions.ts` and the events module, where several of the architectural decisions in §5 are easy to accidentally re-break by a well-intentioned refactor.
- When a server action and its corresponding client form both need to change, update the Zod schema split (§5.3) and the form's generics together in the same change — don't leave them out of sync across separate edits.
- Auto-continue / unattended multi-step execution is acceptable for isolated UI or component-level work. It is not acceptable for anything listed in §8, regardless of what the current session's auto-continue setting allows — pause and confirm explicitly.

## 10. Reference Docs

Loaded on demand, not part of the always-on context:
- `docs/spec-full.md` — full role and screen specification, source of truth for UI/UX behavior not yet summarized above.
- `docs/roadmap.md` — phased build status and architecture decisions log. Check before starting new feature work to confirm it isn't already in progress or blocked by an earlier, incomplete phase.

Keep this file under roughly 300–400 lines. If it grows past that, split by topic into `.agents/rules/<topic>.md` (e.g. `rbac.md`, `schema.md`) rather than continuing to expand this file — a bloated always-loaded context measurably degrades agent output quality.