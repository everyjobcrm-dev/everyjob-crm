# Personal data map

Prepared 2026-11-17 for the buyer's privacy and legal review (Israeli Privacy Protection Law, 5741-1981 and the
Privacy Protection (Data Security) Regulations, 5777-2017). Facts about the system only; the legal assessment
(database registration, security officer, security level of the database) is for counsel.

## What is stored

| Data | Table | Who can read it | Notes |
|---|---|---|---|
| Name, email, phone, national ID (`tz`), birth date, gender, city/region | `profiles` | The person; staff through scoped RPCs (no `tz`/email in rosters, AGENTS §6.0) | `tz` checksum-validated and unique |
| Work history: registrations, status history, hours, ratings | `event_registrations`, `registration_status_history`, `shift_hour_submissions`, `employee_ratings` | The person (own rows); staff by role and event scope | |
| Pay data: wage per shift, approved hours, payroll lines | `event_registrations.wage_rate`, payroll views | Admin; Manager within the rate window; the person (own estimate) | |
| Recruitment attribution and credits | `profiles.recruited_by`, `recruiter_bonuses` | Admin, Manager; recruiter (own credits) | |
| In-app notifications | `notifications` | The person | |
| Signup rate limiting | `signup_tz_attempts` | No client access | Stores a keyed **hash** of the national ID, not the ID |
| Form 101 (tax form) and bank details: address, marital status, dependants, bank, branch, account, IBAN | `form_101_submissions`, `employee_documents` | **Nobody** today (RLS deny-all; every read path requires Admin 2FA, which is not built yet) | Monthly purge RPC exists and also fails closed until 2FA |
| Client contacts (name, phone) | `clients.contacts` | Staff | Business contact data |

No payment-card data, no health data, no location tracking, no analytics or marketing cookies (only the essential
sign-in cookie).

## Where it is stored

| Component | Provider | Region |
|---|---|---|
| Database, auth, files | Supabase (AWS) | **ap-southeast-2 (Sydney, Australia)** |
| Application | Vercel | Vercel default (serverless functions) |
| Source code | GitHub | — |

Data is stored outside Israel. Transfer abroad is governed by the Privacy Protection (Transfer of Data to
Databases Abroad) Regulations, 5761-2001. For production the buyer may prefer a Supabase project in an EU region
(eu-central-1, Frankfurt) — chosen when the separate production project is created (roadmap Stage 5).

## Controls in place

- Row Level Security on every table; writes through SECURITY DEFINER functions that re-check role and scope.
- Role hierarchy enforced in the database; staff never see national ID or email in rosters.
- Soft delete of users with an auth ban; restore by Admin only.
- Signup consent to terms and privacy policy recorded per user (`terms_version`, `terms_accepted_at`).
- Unverified accounts cleaned after 24 hours (edge function, dry-run until scheduled), national IDs masked in logs.
- Hebrew privacy policy, terms and accessibility statement at `/privacy`, `/terms`, `/accessibility` (drafts).

## Open before production (roadmap Stage 5)

1. Admin 2FA, then Form 101 / bank details with encryption at rest and the monthly purge cron.
2. Separate production project (choose region), daily backups / point-in-time recovery, monitoring.
3. Staff path to export or delete one person's data on request (today by SQL).
4. Operator details in `lib/legal.ts`; counsel review of the privacy policy; registration and security-officer
   duties under the law.
5. Re-consent flow when the legal texts change.
