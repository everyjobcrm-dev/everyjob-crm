# Session handoff - everyJob CRM (updated 2026-11-13)

Read this file and AGENTS.md before doing anything. AGENTS.md (§8 especially) wins over this file.
Latest run details: `REPORT-2026-11-10.md` (Phase 0 gap list, DECISIONs D1-D11, open questions O1-O7).

## 0. Start here (2026-11-13)
- **`master` holds PR #6 + the light redesign (#5) + verification fixes (#7) + B1 (#8/#9).** Branch new work from
  `origin/master`; local `master` (`9c13cb6`) is still a stale stub.
- **Browser verification (§7 step 4) - done 2026-11-12/13** except: staff-as-worker (7), min-rating warning (3.5),
  approving a pending employee from the picker (needs a newly registered employee), sign-in after restore, and the
  employee-side views of hours (7b.6/7b.10). Results in §10. The SEED-A past events
  (`supabase/pending/20261113_seed_a_past_events.sql`) are live on dev; remove them with its rollback when done.
- **p10a-p10f are LIVE on dev and tested** (83/83, `supabase/tests/p10*_tests.sql`).
- **Owner still has to run** (records history only, if not done yet):
  `supabase migration repair --status applied 20261110100000 20261110100100 20261110100200 20261110100300 20261110100400 20261110100500 --linked`
- **Open owner questions:** O2 (block unapproved employees from self-registering? currently not), O4 (may a recruiter
  set a role's `base_rate`?).
- **Next:** finish the open verification items, ship checks (§7 step 5: Vercel Preview anon key, `DEV_SKIP_EMAIL_VERIFICATION`
  absent in production, smoke-test production, close #4 and #3), then Payroll & Billing.
- **Local multi-user testing trick:** each demo user signs in on its own host (`adm.localhost:3005`, `mgr.localhost:3005`, ...)
  so sessions don't collide. Needs `"*.localhost"` in `allowedDevOrigins` (`next.config.ts`, local only, not committed).

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
- P10 (2026-11-11, `supabase/migrations/20261110100000..100500`): p10a final closure (`closed -> completed`,
  `completed -> closed` Admin/Manager, blocked by pending hours, `paused` frozen); p10b `event_roles.bill_to_client`
  column-revoked + Admin-only `get_event_role_pricing`; p10c soft delete (`profiles.deleted_at/deleted_by`,
  `soft_delete_user`/`restore_user`, helpers deny deleted users, app bans the auth user); p10d employee approval
  (`profiles.approval_status`, existing rows approved, new signups pending, `set_employee_approval` for
  Admin/Manager/Recruiter); p10e `search_employees` v3 warnings `pending_approval`/`approval_rejected`, deleted excluded;
  p10f `billing_cycles` + `purge_form_101_submissions` (Admin + aal2 + closed cycle -> always fails closed until 2FA),
  `form_101_submissions` created LOCKED (no policies, no grants).
  **Gotcha:** any new `event_roles` column must be added to the column GRANT in p10b or the app cannot read it.

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
  `cancelled_from_status`), `completed` = final closure (level 2, Admin/Manager, reopen to `closed`; decided
  2026-11-11), `paused` frozen. No auto-close when full; staffing status is view-derived.
- New employees wait for approval ("ממתין/ה לאישור"); the picker never filters, it only warns. Users are soft-deleted,
  never hard-deleted.
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
  button on the events list, not a nav item. Hebrew, RTL logical classes only, light theme in the logo colours (AGENTS.md §7, 2026-11-10), no pills.

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
4. **Browser verification** with the demo users on PR #6's branch (`docs/manual-test-plan-events.md`), fix
   what fails. Add to the plan: final closure + reopen, approve a pending employee from the picker, soft delete /
   restore a user (deleted user cannot log in), edit page price field visible to Admin only.
5. **Ship:** merge PR #6 to `master` (it includes PR #4; close #4 and #3 afterwards; decide on #5 separately); on Vercel fix the Preview `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase returns 401
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
- ~~`event_roles.bill_to_client` readable by employees~~ - fixed by p10b (2026-11-11).
- **Must fix before real users (O3):** `clients` is `SELECT true` for every authenticated user, so the client price list
  (`preferred_roles[].rate`, `overtime_threshold_hours`, `min_billable_hours`) is readable via PostgREST. Not urgent on
  dev (demo users only); do it as the FIRST item of the Payroll & Billing batch: column grant on `clients` + Admin RPC
  for `app/admin/clients/actions.ts` + BEFORE INSERT trigger on `event_roles` that applies the price list.
- Form 101: `approveForm101` / dashboard count read the non-existent `profiles.form_101_status`; the employee 101 page
  writes to the locked `form_101_submissions`. 2FA batch only (pre-launch); keep failing closed.
- Direct UPDATE on `events` / `event_roles` is still open to whoever manages the event (RLS `*_update_scoped`); the p9
  RPCs enforce the edit rules, the direct path does not. Narrow to RPC-only once status changes also go through an RPC.
- Vercel Preview has no `SUPABASE_SERVICE_ROLE_KEY` (Production has it), so /api/auth/register and ensure-profile fail on
  previews. `DEV_SKIP_EMAIL_VERIFICATION` is not set anywhere (good).
- No notification to registrants when an event's date/time or `min_age` changes (the edit form only warns staff).
- Raising `min_age` does not re-check the age of existing registrants.
- A direct `events.recruiter_id` write (outside `update_event_details`) does not validate that the target has role `recruiter`.
- Add `.gitattributes` (`eol=lf` for `*.sql`, `*.ts`, `*.md`): the owner's `core.autocrlf=true` produces CRLF working copies.
- Screenshots at 390/1440 for the edit page need a logged-in session; pending the browser-verification milestone.

## 10. Browser verification results (2026-11-12/13, localhost, demo users, plan `docs/manual-test-plan-events.md`)
Passed: 0.1-0.4, 1.1-1.8, 2.1-2.5, 3.1-3.4, 3.6-3.9, 4.1-4.11 (4.9-4.11 with EMP2 instead of MIN: MIN's birth date is
2020, so she correctly sees no events at all), 5.1-5.7. p10: final closure + reopen (Manager; roster and edit page
read-only while `completed`; Recruiter gets no final-closure button), price field "חיוב ללקוח" on the edit page for Admin
only (Manager does not see it) and Admin can save it, soft delete + restore in `/admin/employees` (deleted user cannot
sign in; an open session is logged out; restore clears `deleted_at`, but signing in again after restore was
not re-checked). Smoke-checked the redesigned screens as Admin: all Hebrew/RTL, real data.

Fixed (branch `claude/verification-fixes`):
- Edit page: saving any role without an end time failed with an English Zod error ("Expected string, received null").
- Login: all errors were English; a deleted (banned) user now sees "החשבון אינו פעיל".
- Employees directory labelled Admin as "מנהל/ת" (confusable with "מנהל/ת שטח"); now "אדמין".
- Roles with the same start time came out in random order on the roster/edit page; now sorted by start time, then name.
- 22007/22P02 mapped to Hebrew; pre-p10c `42703` fallbacks removed.

Not bugs / notes: in local dev every server action takes 5-10 s (`proxy.ts` 1-4 s per request), so the UI looks stale
for a few seconds after a click. The edit page for a `completed` event says "cancelled, completed or paused cannot be
edited" and only mentions restoring a cancelled event, not "פתיחה מחדש לעריכה" (copy, minor). Admin sees a delete button
on their own row; the DB refuses it (`cannot_delete_self`, Hebrew message).

Hours flow on SEED-A event 1 (2026-11-13): 7b.2 (>24 h refused), 7b.3 submit, Manager's own row has no actions,
"final closure" refused while a report is pending ("לא ניתן לסגור סופית: קיימים דוחות שעות..."), 7b.8 empty reject
reason, 7b.9 approve -> REC1 1 credit ₪5 (rate ₪1), 7b.14a no credit for EMP2 (recruited_by none), 7b.14b/c
redemption (5 refused, 1 "מומשו 1 זיכויים."), 7b.14d void of a redeemed credit refused. 6.1/6.2 on SEED-A event 2:
Manager gets the Hebrew deadline message, Admin saves. **Fixed:** Admin had no screen to void an *approved* report (the
modal said "only after an admin void", the board lists pending only); the roster modal now offers it to Admin only.
Notes: hours can be submitted for a worker with no wage rate (payroll must handle a NULL rate); the hours board shows
the raw date "2026-11-05" instead of the Hebrew format; `employee_ratings` has two triggers that both recompute
`average_rating` (`trg_recalc_rating`, `trigger_update_rating`) - harmless, drop one in a later migration.
