# Live DB snapshot (documentation only)

Read-only capture of objects that exist in the live Supabase project (`yjgqunrboxihxtgkxibw`) but were never committed to this
repo. **The live DB is the source of truth** (decision of 2026-10-12). These files are **not migrations** and must not be run.

- Captured: 2026-10-12, with SELECT-only queries (`pg_get_functiondef`, `pg_get_viewdef`, `pg_get_triggerdef`, `pg_policies`, `information_schema`).
- Normalisation: CRLF -> LF (function bodies were authored on Windows). Nothing else was altered.
- Verification: every `fn_*.sql` (19), `view_*.sql` (5) and every line of `triggers.sql` (10) was checked byte-for-byte against the live
  definition by md5 (`md5(replace(pg_get_functiondef(oid), E'\r', ''))`) - all equal at capture time.
  To re-verify a function file: `sed -n '3,$p' fn_X.sql | head -n -1 | md5sum`; for a view file: `sed -n '3,$p' view_X.sql | md5sum`.
- `policies.sql` and `live_only_tables_and_columns.sql` are reconstructions from catalog views (descriptive, not byte-verified).

| File | Notes |
|---|---|
| `fn_schedule_employee`, `fn_remove_scheduled_employee`, `fn_add_historical_event_attendee`, `fn_search_employees`, `fn_list_employees`, `fn_get_employee_detail` | staff scheduling/roster RPCs (SECURITY DEFINER). Phase 3 reuses `schedule_employee` / `remove_scheduled_employee` (to be patched for the role hierarchy). |
| `fn_check_event_rates_complete`, `fn_fn_promote_waitlist` | SECURITY INVOKER trigger functions. `fn_promote_waitlist` duplicates `auto_promote_from_waitlist` (no capacity check) - dropped by M6a. |
| `fn_guard_profile_protected_columns`, `fn_is_current_user_admin`, `fn_handle_new_user` | profile protection / admin check / signup profile creation. |
| `fn_recalc_employee_rating`, `fn_update_employee_average_rating`, `fn_touch_event_updated_at`, `fn_set_updated_at`, `fn_rls_auto_enable`, `fn_set_shift_submission_refs` | misc triggers / helpers (the repo copy of `set_shift_submission_refs` has a typo). |
| `fn_auto_promote_from_waitlist`, `fn_register_for_event_role` | live == repo, kept here as the source of rollback files R6b and R4. |
| `view_*` | all five live views; `event_role_fill_counts` (R9) and `v_shift_submissions_dashboard` (R0c) are rollback sources. |

## Migration history note (2026-10-12)
- `p1_m1d_events_rls_scoped` and `p1_m1e_event_roles_rls_scoped` were applied **manually in the Supabase SQL Editor** (file contents, one at a time, M1d first)
  because the MCP `apply_migration` call hung on `DROP POLICY`. They are therefore **absent from `supabase_migrations.schema_migrations`**
  (deliberately not back-filled). Their effect was verified read-only against `pg_policies` right after.
- `p1_m6a_drop_duplicate_waitlist_trigger` was also applied **manually in the SQL Editor** (as `DROP TRIGGER IF EXISTS ...`, because the hung tool call may have applied it); absent from the migration history. Verified read-only: only `trg_auto_promote_from_waitlist` remains on `event_registrations`.
- RULE: the migration tool hangs on any statement containing `DROP`; such migrations (M6c and later) are run by hand in the SQL Editor.
- All other `p1_*` migrations were applied through `apply_migration` and appear in the migration history.

## Phase 3 migrations (2026-10-13)
- Applied through `apply_migration`, one at a time, in this order: `p3_m7p_schedule_employee_v2`, `p3_m7q_remove_scheduled_employee_v2`,
  `p3_m7r_staff_transition_registration`, `p3_m7s_get_event_roster`, `p3_m7t_set_registration_wage_rate`, `p3_m0d_revoke_fill_views_anon`
  (the files' top-level `--` comment lines were stripped from the payload because the rollback notes contain `DROP`; function bodies were sent verbatim).
- Verified read-only right after each one: `md5(prosrc)` equals the body between the `$function$` markers in the file (all six functions);
  `md5(pg_get_functiondef)` equals the whole file statement for M7p (f8461097…) and M7q (0b060076…). For M7r/M7s/M7t Postgres re-renders the
  header (`DEFAULT NULL::text`, `RETURNS event_registrations`, `RETURNS TABLE(...)` on one line), so only the body md5 is comparable.
- `fn_schedule_employee.sql` / `fn_remove_scheduled_employee.sql` in this folder remain the pre-Phase-3 definitions = rollbacks R7p / R7q.

## Phase 4 migrations (2026-10-13)
- Applied through `apply_migration`, one at a time: `p4_m7u_search_employees_scope` (snapshot body + one scope line; body and full
  `pg_get_functiondef` md5 match the file), `p4_m7v_history_policy_scope` (qual = `app_can_manage_event(event_id)`),
  `p4_m8_request_registration_cancellation`, `p4_m8b_staff_event_request_counts` (body md5 match).
- `fn_search_employees.sql` in this folder remains the pre-Phase-4 definition = rollback R7u.
- NOT applied: `p4_m6c_drop_legacy_registration_policy.sql` (contains DROP - run by hand in the SQL Editor, then verify read-only).

## Phase 6 migrations - hours flow (2026-10-13)
- Applied through `apply_migration`, one at a time: `p6_h0_recruiter_bonus_rate`, `p6_h1_self_review_constraint` (E1: no two-person rule),
  `p6_h4_rating_triggers_definer`, `p6_h2_hours_rpcs` (E2: credit to events.recruiter_id), `p6_h3_hours_rls`, `p6_h5_hours_views`.
- Verified read-only: body md5 = file for all 6 functions; DEFINER + search_path; anon no EXECUTE; pg_policies (5 SELECT policies);
  anon has no table privileges, authenticated SELECT only; both views security_invoker=true.
- `fn_recalc_employee_rating.sql` / `fn_update_employee_average_rating.sql` in this folder remain the pre-h4 definitions = rollback.
- Not applied: the optional `DROP TRIGGER IF EXISTS trigger_update_rating` (by hand, Q5); `p6_h6_redeem_credits.sql` (PROPOSED).
