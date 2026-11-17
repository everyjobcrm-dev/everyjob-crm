# Security review — everyJob CRM

Date: 2026-11-17. Scope: the Supabase project `yjgqunrboxihxtgkxibw` (advisors and grants), production npm
dependencies, and the full git history (219 commits, all branches). Reviewer: the development team, with AI tooling.

## Summary

| Area | Result |
|---|---|
| Secrets in git history | **Clean.** No Supabase keys, service-role keys, JWTs, API tokens or `.env` files in any commit. The only connection strings are local Docker examples (`db:5432/testdb`) in vendored skill docs. |
| Production dependencies | **10 → 3** vulnerabilities after upgrading Next.js 16.2.10 → 16.4.6 and `npm audit fix`. The 3 remaining are explained below. Type check and production build pass. |
| Authorization model | Role checks are enforced in the database (RLS, SECURITY DEFINER RPCs that re-check role and scope, triggers on status and registration writes), not only in the UI. |
| Supabase advisors | 1 error class (3 views, intentional), warnings explained below; hardening migration S1 prepared. |

## 1. Dependencies (`npm audit --omit=dev`)

| Package | Severity | Status |
|---|---|---|
| `next` (critical: RCE in image optimisation, middleware bypass, SSRF, cache poisoning) | critical | **Fixed**: 16.4.6 |
| `postcss`, `sharp`, `brace-expansion`, `nanoid`, `source-map-js`, `baseline-browser-mapping` | high/moderate | **Fixed** (transitive) |
| `zod` 3.25.76 — memory exhaustion on oversized constrained collections (GHSA-mrhx-c7xc-m3w5) | high | Open. The fix is zod 4 (breaking API). Schemas validate small forms; payload size is capped by Next.js server actions (1 MB default). Planned with the zod 4 migration (form pattern AGENTS §5.3 must be re-checked). |
| `exceljs` → `uuid` (bounds check only when a caller passes `buf`) | moderate | Open, not reachable: exceljs does not pass `buf`. The only "fix" is a downgrade to exceljs 3.4. |

Dev-only dependencies have 16 further findings (tooling, not shipped).

## 2. Database (Supabase advisors)

| Finding | Level | Assessment | Action |
|---|---|---|---|
| Direct table writes: `authenticated` has full UPDATE on `events` and full INSERT/UPDATE/DELETE on `event_roles` (RLS-scoped by `app_can_manage_event`) | — | Real gap: a Recruiter can set `event_roles.bill_to_client` (Admin-only client pricing) on their own event via the REST API. Status and recruiter changes are already trigger-guarded. | **S1**: column-level grants matching the app's real writes. |
| `anon` holds INSERT/UPDATE/DELETE grants on `events`, `event_roles` | — | Blocked by RLS (policies target `authenticated`), but grants should not exist. | **S1** revokes. |
| SECURITY DEFINER views: `event_role_fill_counts`, `event_spot_summary`, `v_shift_submissions_dashboard` | error | Intentional: staffing counts must include registrations a worker cannot read. Views expose counts only; `anon` was revoked earlier (M0d). | Documented. Revisit `v_shift_submissions_dashboard` columns before launch. |
| 5 SECURITY DEFINER functions executable by `anon` | warn | Three are trigger / event-trigger functions (not callable as RPC); two check `auth.uid()`. No exploitable path. | **S1** revokes. |
| 45 SECURITY DEFINER functions executable by `authenticated` | warn | By design: this is the write API. Each re-checks role, scope and own-row rules (AGENTS §6.0, tests in `supabase/tests/`). | None. |
| 7 tables with RLS and no policy (`employee_documents`, `form_101_submissions`, `billing_cycles`, ...) | info | Deny-all by design; access only through RPCs. Form 101 / bank data stays closed until Admin 2FA. | None. |
| 3 functions with mutable `search_path` | warn | Low risk (SECURITY INVOKER). | **S1** pins `search_path`. |
| Leaked-password protection disabled | warn | Supabase Auth setting. | Turn on before launch (Dashboard → Auth → Passwords; Pro plan). |

## 3. Known pre-launch items (by design, not defects)

- Admin 2FA (aal2) is deferred to the launch milestone. Every aal2 gate fails closed, so Form 101 and bank details are
  unreadable for everyone until then.
- Email verification is bypassed in development (`DEV_SKIP_EMAIL_VERIFICATION`); removed at launch with a verified
  sending domain.
- Development and production share one Supabase project; production gets its own project at launch.
- Demo sign-in accounts use simple passwords; rotate or delete them at handover.

## 4. How to reproduce

```bash
npm audit --omit=dev
git log --all -p | grep -E "eyJ[A-Za-z0-9_-]{20,}\.|sb_secret_|service_role|re_[A-Za-z0-9]{20,}"
```
Supabase advisors: Dashboard → Advisors → Security Advisor (or the Supabase MCP `get_advisors`).
