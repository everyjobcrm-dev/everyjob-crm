# Stage 5 — Production launch plan

When: after handover (Stage 4), on the buyer's infrastructure, as a separately priced milestone.
Duration: 2–4 weeks of development (estimates below are working days, development only, and assume the buyer
answers within a day). Exit: real workers sign up and work real shifts, and for one full month the payroll and billing
exports match the buyer's manual check.

Order matters: environment → email → 2FA → Form 101 → operations → legal → pilot. 2FA comes before Form 101
because every Form 101 and bank-details path already fails closed until an `aal2` session exists (AGENTS §8.2).

## Plan at a glance

| # | Workstream | Owner | Estimate | Depends on |
|---|---|---|---|---|
| 1 | Production environment | Dev | 2 days | Stage 4 |
| 2 | Email verification and Hebrew auth emails | Dev + Buyer | 1–2 days | 1, domain |
| 3 | Admin 2FA (TOTP) | Dev | 2–3 days | 1 |
| 4 | Form 101 and bank details, encryption, monthly purge | Dev | 4–6 days | 3, buyer's Form 101 decisions |
| 5 | Operations: backups, monitoring, rate limits, scheduled jobs | Dev | 2 days | 1 |
| 6 | Privacy rights and re-consent | Dev | 1–2 days | 1 |
| 7 | Legal and accessibility | Buyer + lawyer + consultant | parallel | — |
| 8 | Staging test, pilot month, go-live | Both | 1 month calendar | 1–6 |

## 1. Production environment

- New Supabase project in the buyer's organisation. Recommended region **eu-central-1 (Frankfurt)** (today's data
  is in Sydney; see `docs/due-diligence/privacy-data-map.md`). Plan: Pro (needed for PITR and leaked-password
  protection).
- Build the schema from the baseline (`docs/due-diligence/migrations-runbook.md` §4), mark history with
  `migration repair`, then apply newer migrations. Run `supabase/tests/*.sql` and the Security Advisor: only the
  findings documented as intentional may remain.
- A second, small **staging** project from the same baseline, for testing write paths and for Stage 5 step 8.
- Vercel: Production → production project, Preview → staging project. Environment variables per `README.md`;
  `DEV_SKIP_EMAIL_VERIFICATION` must not exist in Production.
- Auth settings: Site URL and redirect URLs = the production domain; leaked-password protection on; minimum
  password length 10.

## 2. Email verification

Per the "Pre-launch" list in `docs/roadmap.md`:
1. Verify a sending subdomain (`mail.<domain>`) in Resend: SPF, DKIM, MX, DMARC.
2. Supabase → Auth → SMTP: `smtp.resend.com`, port 465, sender `no-reply@mail.<domain>`; raise the email rate limit.
3. Hebrew RTL templates for confirm-signup (with `{{ .Token }}`), reset password and email change.
4. Remove `DEV_SKIP_EMAIL_VERIFICATION` from code, `.env.example` and every environment (search "pre-launch").
5. Test sign-up end to end on Gmail, Outlook and iCloud, on phone and desktop.

## 3. Admin 2FA (TOTP)

Design, using Supabase Auth MFA (no new dependency):
- **Enroll:** a page `/admin/security` calls `supabase.auth.mfa.enroll({ factorType: "totp" })`, shows the QR code,
  and verifies the first code (`challenge` + `verify`). Recovery: a second factor, or reset by another Admin.
- **Sign-in:** after the password, if `mfa.getAuthenticatorAssuranceLevel()` returns `nextLevel = aal2` the user
  enters the 6-digit code; the session becomes `aal2`.
- **Enforcement (three layers, each fails closed):**
  1. Middleware: any `/admin/*` request from an Admin whose session is not `aal2` redirects to the code page (or to
     enrollment if no factor exists).
  2. Server actions: `requireRole("admin")` gains an `aal2` check for the document actions only.
  3. Database: the gates that already exist read `auth.jwt()->>'aal'` (`purge_form_101_submissions`,
     `get_compliance_counts` document counts). They need no change.
- Policy decision for the buyer: 2FA for Admin only (the spec) or also for Managers.
- Tests: SQL tests that the document RPCs refuse `aal1`; a Playwright test on staging for enroll + sign-in.

## 4. Form 101 and bank details

Needs from the buyer first: the exact Form 101 fields they use (the table `form_101_submissions` already has
the full set), whether employees upload a signed PDF or fill the form in the app, and who verifies it.

- **Employee flow** (`/employee/101form`, today locked): fill or upload, digital signature checkbox with timestamp,
  status `submitted`; edit allowed until verified.
- **Admin flow** (aal2 only): list missing / submitted / verified per month, open one, verify.
- **RLS:** employee may insert and update own row while not verified; Admin may read only with `aal2`; nobody else.
  New policies follow AGENTS §8.4 (narrow, reviewed, with SQL tests).
- **Encryption at rest** for national ID, bank account and IBAN: application-level AES-256-GCM in server actions,
  key in a Vercel server-only variable (later a KMS); the database stores ciphertext. Supabase disks are already
  encrypted; this layer protects against database dumps and over-broad queries.
- **Files** (if uploads): a private Storage bucket, signed URLs valid for 60 seconds, Admin `aal2` only.
- **Monthly purge:** the existing `purge_form_101_submissions(month)` requires an interactive `aal2` session, so a
  cron job cannot call it. Add a service-only variant executable by `postgres` alone and schedule it with `pg_cron`
  on the 1st of each month for the cycle closed before; it logs counts (never content). The Admin screen keeps the
  manual, `aal2`-gated purge.

## 5. Operations

| Item | Choice |
|---|---|
| Backups | Supabase daily backups + Point-in-Time Recovery (Pro add-on); restore drill once on staging |
| Errors | Vercel runtime logs + an error tracker (Sentry free tier) with personal data scrubbing |
| Uptime | external check on `/login` every 5 minutes, alert by email and SMS to the buyer's contact |
| Rate limiting | Vercel Firewall rules on `/api/auth/*` and `/login` (per IP); the signup ID-number limit already exists |
| Scheduled jobs | `cleanup-unverified-users` daily after one reviewed dry run (AGENTS §5.7); Form 101 purge monthly |
| Dependencies | `npm audit` and Security Advisor monthly; the open `zod` 4 upgrade (security review §1) |

## 6. Privacy rights and re-consent

- Admin action "export person's data" (JSON + Excel of profile, registrations, hours) and "delete person" (soft
  delete + anonymise after the legal retention period the lawyer sets for payroll records).
- Re-consent: when `LEGAL_VERSION` changes, the next sign-in shows the updated terms and records acceptance.

## 7. Legal and accessibility (buyer)

- Operator details in `lib/legal.ts`; lawyer reviews `/terms`, `/privacy`, `/accessibility`; database registration and
  security-officer duties; employment-law check of cancellation and pay wording.
- Accessibility audit by a certified consultant (Israeli Standard 5568 / WCAG 2.0 AA); fixes; audit date on
  `/accessibility`.

## 8. Staging test, pilot and go-live

1. Full Playwright run on staging, including write paths (register, approve, waitlist, cancel, submit and approve
   hours, exports), with test accounts that exist only there.
2. Smoke test by role on production with the buyer's first real Admin and one test worker.
3. **Pilot month** with one group of workers and one or two clients. Every week, compare the payroll and billing
   exports with the buyer's own calculation; fix differences before the next week.
4. Go-live for everyone when the month closes with matching numbers; sign the Stage 5 acceptance.

## Out of scope (paid change requests, roadmap Stage 6)

The buyer's own pay rules (Shabbat and holiday rates, overtime per client), their Excel layout, branding,
push/SMS/WhatsApp, the native app, accounting integration.
