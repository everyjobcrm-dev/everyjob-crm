# Session handoff - everyJob CRM (updated 2026-10-16)

Read this file and AGENTS.md before doing anything. AGENTS.md (§8 especially) wins over this file.

## 1. Mission
Ship a working, tested, Hebrew/RTL workforce CRM for the Israeli shift market. Near-term goal: **get the events
lifecycle + hours flow merged to `master`, deployed on Vercel production and verified in the browser by role**, then
move to Payroll & Billing (internal reports + Excel only, no external accounting API).

## 2. Environment facts
| Thing | Value |
|---|---|
| Repo | `everyjobcrm-dev/everyjob-crm` (default branch `master`) |
| Supabase project | `yjgqunrboxihxtgkxibw` (single project, demo users only, no branching) |
| Vercel | team `everyjob-crm-dev` (`team_9qZrlYjikTnLLwnkVa5n9Dqs`), project `everyjob-crm` (`prj_VVyHlgnNox3aTQ94HYuTAcQtX5wb`) |
| Owner's machine | Windows, PowerShell, repo at `C:\Users\samoh\Documents\everyjob-crm`, runs `npm run dev` on localhost:3000/3001 |
| Owner's local `master` | has an unpushed commit `9c13cb6 "part 1"`, backed up as local branch `backup-part1` (content unknown - ask before merging) |

Demo users (all verified; password chosen by the owner; roles set in `profiles`):
| Email | Role | Notes |
|---|---|---|
| `samohayosef@gmail.com` | admin | the owner |
| `samohayosef+mgr@gmail.com` | manager | |
| `samohayosef+rec1@gmail.com` | recruiter | `can_create_events = true` |
| `samohayosef+rec2@gmail.com` | recruiter | no create permission |
| `samohayosef+emp1@gmail.com` | employee | `recruited_by` = rec1 |
| `samohayosef+emp2@gmail.com` | employee | |
| `samohayosef+minor@gmail.com` | employee | under 18 |

## 3. What is live in the database (all verified)
- Phase 1-2: status state machine, registration write guard, `app_can_manage_event`, role hierarchy (M0-M9a).
- Phase 3: M7p `schedule_employee` v2, M7q `remove_scheduled_employee` v2, M7r `staff_transition_registration`,
  M7s `get_event_roster`, M7t `set_registration_wage_rate` + `app_manager_rate_deadline`, M0d (anon revoked on fill views).
- Phase 4: M7u (`search_employees` scoped), M7v (history policy scoped), M8 `request_registration_cancellation`,
  M8b `get_staff_event_request_counts`, **M6c done** (legacy `users manage own registrations` policy dropped; only
  `er_employee_select_own` remains), **M8v2 applied** (employee withdraws pending/waitlisted directly -> `cancelled`,
  history `self_withdrawn`; approved still needs a request).
- Phase 6 hours flow: h0 `recruiter_bonus_rate`, h1 no-self-review/no-self-submit, h4 DEFINER rating triggers,
  h2 submit/approve/reject/void RPCs, h3 SELECT-only RLS on the 3 hours tables, h5 `v_my_monthly_hours` +
  `v_recruiter_pending_credits`, H7 `profiles.recruited_by` (credit only when it equals `events.recruiter_id`),
  H6v2 `redeem_recruiter_credits` (FIFO, `redeemed_by` / `redeemed_event_id`).
- P9 edit event (2026-10-16, `supabase/p9_e_event_edit.sql`): E0 `list_staff_recruiters`, E1 `update_event_details`,
  E2 `upsert_event_role` applied via MCP `apply_migration`; E3 `remove_event_role` applied by the owner in the SQL Editor
  (the MCP call was declined by the tool permission layer). All four: SECURITY DEFINER, `search_path=pg_catalog, public`,
  no anon/PUBLIC EXECUTE; E3 body md5 (whitespace-normalized) = commit 94e6910.
- Tests (2026-10-16): `supabase/tests/p9_event_edit_tests.sql` 51/51,
  `supabase/tests/p4_behavior_tests.sql` 43/43 (the M6c expectation asserts the employee's direct UPDATE affects 0 rows
  and leaves the row unchanged), `supabase/tests/p6_hours_behavior_tests.sql` 55/55 (fixture tz base moved to 31415900
  after a live profile collided with fixture n=5). Nothing persisted after any run.

## 4. Git state (consolidated 2026-10-15)
- `master` has Phases 1-2 (PR #2) and is what Vercel production serves.
- PR #4 (`claude/hopeful-gates-rtzhto`) = Phases 3-6 + the approved app shell. M8v2 (`claude/m8v2-self-withdraw-gzxahv`)
  was merged into it on `claude/hopeful-gates-rtzhto-01c57f`; that branch is the working base from here on.
- PR #3 (`claude/app-shell-all-roles-dr5znq`) duplicates M8v2 and carries a second shell implementation: superseded,
  do not merge.
- The owner's local `master` has an unpushed commit `9c13cb6 "part 1"` (backup branch `backup-part1`), content unknown.

## 5. Closed decisions (do not reopen)
- Event status: `open` (signups; full role -> waitlist), `closed` (no new signups, staff still manage, hidden from
  employees except "My shifts"), `cancelled` (excluded from everything, registrations untouched, restore to
  `cancelled_from_status`), `completed`/`paused` frozen. No auto-close when full; staffing status is view-derived.
- Hierarchy Admin ⊇ Manager ⊇ Recruiter. Admin/Manager act on all events; Recruiter only on events with
  `events.recruiter_id = self`; creating events needs `can_create_events`.
- Admin-only: final hours approval, pricing, recruiter credit rate, Form 101, role changes, event deletion (events
  with history are cancelled, not deleted).
- Staff may register as workers (auto-approved when capacity), exempt from `min_rating`, not from `min_age`; nobody
  acts on their own registration or approves their own hours.
- Capacity = pending + approved. Staff removal -> `removed` (no self re-register). Rejected cannot re-apply.
- **Withdrawal:** pending/waitlisted -> employee withdraws directly; approved -> request, staff decides.
- Wage rate: Admin any time; Manager until the 10th of the following month.
- Hours: Admin approves (never own worked hours), no two-person rule; credit to the event's recruiter only if the
  worker's `recruited_by` matches; never for own hours; redemption FIFO by Manager/Admin.
- **UI:** one app shell for every role (employee items for all + a "ניהול" section for staff). "אירוע חדש" is a
  button on the events list, not a nav item. Hebrew, RTL logical classes only, Indigo #4F46E5 / Lime #D4FF00, no pills.

## 6. Responsible recruiter - RESOLVED (2026-10-16)
Admin and Manager choose a "מגייס/ת אחראי/ת" (any recruiter, or none) when creating or editing an event; a recruiter
creating an event still owns it. **No trigger change was needed:** the live `guard_event_recruiter_ownership` already
lets admin/manager set `recruiter_id` on INSERT (a recruiter is forced to self) and only admin/manager may change it on
UPDATE. The edit path goes through `update_event_details` (P9 E1), which also checks the target has role `recruiter`.

## 7. Roadmap from here (in order)
1. **Consolidate** (no DB): merge `m8v2-self-withdraw-gzxahv` into `hopeful-gates-rtzhto`, resolve conflicts keeping
   the approved shell, fix the outdated p4 test expectation, tsc/lint/build, push. PR #4 then carries everything.
2. **Done 2026-10-16.** **Responsible recruiter** (§6 above): read the live trigger, propose exact SQL + rollback + tests, get approval,
   apply, add the select to the create form (admin/manager) and show it on event cards.
3. **Done 2026-10-16 (P9, browser verification pending).** **Edit event** feature: RPCs `update_event_details(event, patch jsonb)` (allow-list), `upsert_event_role`,
   `remove_event_role`; rules: headcount >= occupied, no removing roles with registrations, no past dates, no
   date/time change once hours exist, cancelled/completed read-only, admin-only client/recruiter/bill_to_client.
   "עריכת פרטי אירוע" button on the staff event page + `/manager/events/[id]/edit`.
4. **Browser verification** with the demo users on the consolidated branch (`docs/manual-test-plan-events.md`), fix
   what fails.
5. **Ship:** merge PR #4 to `master`; on Vercel fix the Preview `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase returns 401
   for preview logins), make sure `DEV_SKIP_EMAIL_VERIFICATION` is not set in production; smoke-test production.
6. **Payroll & Billing** (design first, then build): monthly payroll per employee (approved hours × wage_rate +
   travel), client billing per client/event, Excel export, Admin only, views for all derived numbers.

## 8. Operational lessons (enforce)
- Supabase MCP hangs on any statement containing DROP (apply_migration and execute_sql). DROPs are run by the owner in
  the SQL Editor with IF EXISTS; verify read-only afterwards. Test scripts never contain DROP.
- Migrations: one at a time, a file in `supabase/` with rollback, snapshot of the live definition before replacing it,
  `diff` against the live definition before applying. `CREATE OR REPLACE FUNCTION` must restate SECURITY DEFINER and
  `SET search_path`. REVOKE from anon/PUBLIC.
- Behavior tests run impersonated (`SET LOCAL ROLE authenticated` + `request.jwt.claims`) in a transaction that always
  rolls back; confirm nothing persisted. PL/pgSQL identifiers are case-insensitive (avoid `u`/`U` style collisions).
- Types: regenerate with the Supabase MCP generator (UTF-8, LF).
- The owner tests on localhost; remind them to `git fetch` + `git checkout <branch>` + `npm install` + delete `.next`
  + restart `npm run dev` after every change, and to log out/in after role changes.
- Commit locally after each step, push at the end of each milestone.
- Supabase MCP apply_migration may be declined by the tool permission layer for function bodies containing DELETE; the
  owner runs such blocks in the SQL Editor and the agent verifies read-only.

## 9. Backlog (non-blocking, found 2026-10-15)
- `event_roles` is `SELECT true` for all authenticated users, so `bill_to_client` (client pricing) is readable by employees.
  Fix proposed with the payroll batch (column-level revoke + Admin RPC reads) - docs/payroll-billing-design.md §3.
- Direct UPDATE on `events` / `event_roles` is still open to whoever manages the event (RLS `*_update_scoped`); the p9
  RPCs enforce the edit rules, the direct path does not. Narrow to RPC-only once status changes also go through an RPC.
- Vercel Preview has no `SUPABASE_SERVICE_ROLE_KEY` (Production has it), so /api/auth/register and ensure-profile fail on
  previews. `DEV_SKIP_EMAIL_VERIFICATION` is not set anywhere (good).
- No notification to registrants when an event's date/time or `min_age` changes (the edit form only warns staff).
- Raising `min_age` does not re-check the age of existing registrants.
- Cast errors 22007 (bad date/time) / 22P02 (bad uuid/number) from `update_event_details` are not mapped to Hebrew in
  `lib/events/errors.ts`.
- A direct `events.recruiter_id` write (outside `update_event_details`) does not validate that the target has role `recruiter`.
- Add `.gitattributes` (`eol=lf` for `*.sql`, `*.ts`, `*.md`): the owner's `core.autocrlf=true` produces CRLF working copies.
- Screenshots at 390/1440 for the edit page need a logged-in session; pending the browser-verification milestone.
