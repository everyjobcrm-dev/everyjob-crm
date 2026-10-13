# Design: hours flow (hour reports, ratings, recruitment credits)

Status: **DESIGN ONLY. Nothing here is applied.** The proposed SQL is in `supabase/p6_*.sql` (each file is headed
"PROPOSED - not applied") and the behavior tests are in `supabase/tests/p6_hours_behavior_tests.sql` (not run).
Live state was read on 2026-10-13, read-only.

## 1. Live state (read-only findings)

| Object | Live | Problem |
|---|---|---|
| `shift_hour_submissions` | `UNIQUE(registration_id)`; `status submission_status` (`draft, submitted, approved, rejected, pending`, default `pending`); `voided_at/by/void_reason`; trigger `trg_set_shift_submission_refs` (INVOKER) fills `employee_id`, `event_id` | RLS **on with no policies** (L13): every client read and write is denied. anon and authenticated hold ALL grants. `app/manager/actions.ts` `submitShiftAttendance` upserts directly, so it always fails today. |
| `employee_ratings` | `rating 1..5`; triggers `trg_recalc_rating` (`recalc_employee_rating`) **and** `trigger_update_rating` (`update_employee_average_rating`), both INVOKER, no search_path | Duplicate triggers. Both update `profiles.average_rating`, which `guard_profile_protected_columns` blocks for non-admin callers, so a manager's rating insert fails. `update_employee_average_rating` reads `NEW` and so does nothing on DELETE. RLS on, no policies. |
| `recruiter_bonuses` | `recruiter_id`, `source_registration_id UNIQUE`, `bonus_amount > 0`, `status bonus_status (pending, applied, voided)`, `applied_to_registration_id`, `applied_at` | RLS on, no policies. The app's `redeemRecruitmentCredits` writes `redeemed_at/redeemed_by/redeemed_context_event_id`, which **do not exist**, so redemption is broken. |
| `profiles.recruiter_bonus_rate` | **missing** (the glossary and spec assume it exists; `supabase/recruiter_compensation_redesign.sql` was never applied) | `setRecruiterBonusRate` and `getUserProfile` reference it. |
| Views | `v_shift_submissions_dashboard` (admin-only, owner rights) depends on `shift_hour_submissions` | Keep its columns; the proposed migrations do not alter the table shape. |
| `app_event_has_approved_hours(event)` | approved and not voided | Already used by the event-status trigger to refuse cancelling an event with approved hours. |

## 2. State machine (one row per registration)

```
            submit_shift_hours                   approve_shift_hours (admin)
 (none) ───────────────────────▶ pending ───────────────────────────────▶ approved
                                   │  ▲                                        │
       reject_shift_hours (admin)  │  │ submit_shift_hours (re-submit)         │ void_shift_hours (admin, reason)
                                   ▼  │                                        ▼
                                 rejected ──────── void (manager/admin) ──▶ voided  (= voided_at IS NOT NULL)
                                                                              │
                                                     submit_shift_hours ──────┘ (re-submit clears the void)
```

- `pending` is the "submitted for approval" state. The enum values `draft` and `submitted` are not used; `pending` stays the default, so the existing view and app keep working.
- **Voided** is a flag (`voided_at IS NOT NULL`), not a status. `app_event_has_approved_hours` and the dashboard already treat voided rows as absent.
- Because of `UNIQUE(registration_id)`, a re-submission updates the same row back to `pending` (clearing the review and void columns). The audit trail lives in `registration_status_history`: rows with `from_status = to_status = <registration status>` and actions `hours_submitted`, `hours_resubmitted`, `hours_approved`, `hours_rejected`, `hours_voided`, with the details in `reason`.

## 3. Permissions (AGENTS.md 6)

| Action | Admin | Manager | Recruiter | Employee | Extra rules |
|---|:---:|:---:|:---:|:---:|---|
| Submit / re-submit hours (+ optional rating) | ✅ | ✅ | ❌ | ❌ | registration `approved`; event `open`/`closed` (admin also `completed`); `event_date <= today (Asia/Jerusalem)`; **never own registration**; not when already `approved` |
| Approve | ✅ | ❌ | ❌ | ❌ | `pending`, not voided; **reviewer ≠ worker** (Q1: no two-person rule; the admin may approve hours the admin entered) |
| Reject | ✅ | ❌ | ❌ | ❌ | `pending`; reason required |
| Void | ✅ any status | ✅ only `pending`/`rejected` | ❌ | ❌ | reason required; voiding an `approved` row voids its *pending* credit and is refused if the credit was already applied |
| Read submissions | all | all | ❌ | own rows | via RLS SELECT policies; writes RPC-only |
| Read ratings | all | all | ❌ | ❌ (sees `profiles.average_rating` only) | |
| Read credits | all | all | own | ❌ | |

Recruitment credit, created only by `approve_shift_hours`, exactly once per registration (`UNIQUE(source_registration_id)`):
- **Who (Q2):** the **event's** recruiter, `events.recruiter_id`, when that profile is a `recruiter` and **is not the worker themself**.
  (`event_registrations.recruiter_id` is never populated live, so it is not used.)
- **Amount:** `reported_hours × profiles.recruiter_bonus_rate` (Admin-set, default 1 NIS/hour). A credit that was voided is revived by the next approval.

## 4. Lock order

All hours RPCs take `events (FOR SHARE) -> event_registrations (FOR SHARE) -> shift_hour_submissions (FOR UPDATE) -> recruiter_bonuses`.
The registration RPCs take `events (SHARE) -> event_roles (UPDATE) -> event_registrations (UPDATE)` and check "has submissions"
while holding the registration lock. Both families lock `events` first, in a shared mode, and the registration row
before the submission row, so a submit and a removal of the same registration serialize instead of deadlocking.

## 5. Derived totals (views own them, AGENTS.md 5.1)

| Number | Owner |
|---|---|
| Admin approval board | `v_shift_submissions_dashboard` (existing, admin-only) |
| Employee's own approved hours and estimated pay per month | **new** `v_my_monthly_hours` (`security_invoker`, reads own rows through RLS): `sum(reported_hours)`, `sum(reported_hours × wage_rate)` over approved, non-voided rows of non-cancelled events |
| Recruiter pending credits (count and amount) | **new** `v_recruiter_pending_credits` (`security_invoker`): `status = 'pending'` grouped by recruiter |
| "Event has approved hours" | `app_event_has_approved_hours()` (existing) |

Nothing is stored. `profiles.average_rating` / `total_ratings` stay trigger-maintained (an existing exception that is
documented here); the proposal makes them correct (DEFINER, DELETE-safe) instead of moving them.

## 6. App-layer changes (after approval)

1. `app/manager/actions.ts` `submitShiftAttendance` → RPC `submit_shift_hours` (`requireRole("manager")`, Zod, Hebrew
   errors). Remove the direct `employee_ratings` insert (the RPC writes the rating).
2. `app/admin/actions.ts` `reviewShiftSubmission` → `approve_shift_hours` / `reject_shift_hours`; add `voidShiftSubmission`.
3. `redeemRecruitmentCredits` → a redeem RPC (a separate, later proposal), because the live table uses `applied_*`, not `redeemed_*`.
4. `AttendanceModal` sends ISO timestamps built from the event date + times; it shows the rejection reason and void state from `get_event_roster` (already returns `submission_status`).
5. `lib/events/errors.ts`: `hours_not_allowed`, `hours_already_approved`, `self_review`, `two_person_review`, `credit_already_applied`, `shift_not_started`.
6. Employee home and "My shifts": monthly hours and estimated pay from `v_my_monthly_hours`.

## 7. Decisions (answered 2026-10-13)

1. **Q1, two-person rule:** **worker only.** `reviewed_by <> employee_id` and `submitted_by <> employee_id`; no reviewer ≠ submitter rule, because there is exactly one admin and the rule would deadlock admin-entered hours.
2. **Q2, credit attribution:** credit the **event's recruiter** (`events.recruiter_id`), never the worker themself.
3. **Q3:** only Admin may enter hours on a `completed` event.
4. **Q4:** employees see their average rating only.
5. **Q5:** remove the duplicate rating trigger `trigger_update_rating` by hand, after h4.
