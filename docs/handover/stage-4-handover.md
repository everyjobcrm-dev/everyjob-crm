# Stage 4 — Handover runbook

When: at closing, after the sale agreement is signed and the first payment has cleared (roadmap Stage 3 exit).
Duration: about one working week. Exit: the buyer signs in with their own accounts on infrastructure they own, and
the seller holds no credentials.

Rule for the whole stage: **nothing transfers before the payment that the agreement ties it to** (escrow or the
staged schedule). Each step below names its owner: **[Seller]**, **[Buyer]**, **[Dev]** (the seller's developer
work), **[Both]**.

## 0. Before day 1 (checklist the buyer receives with the agreement)

| # | Item | Owner |
|---|---|---|
| 0.1 | Buyer creates (or names) a GitHub organisation, a Supabase organisation and a Vercel team, and one technical contact | Buyer |
| 0.2 | Buyer chooses the domain plan: keep the current domain (transfer) or use their own | Buyer |
| 0.3 | Buyer sends their client list and employee list (Excel or CSV) and confirms they may be imported (they are the data controller) | Buyer |
| 0.4 | Seller freezes features: from here only fixes; the tag `handover-<date>` marks the delivered version | Seller |
| 0.5 | Seller re-runs the due-diligence checks (`npm audit --omit=dev`, Supabase Security Advisor, `npm run lint`, `npm run typecheck`, `npm run build`) and attaches the output | Dev |

## 1. Day 1 — Code

1. **[Dev]** Final commit, tag, push: `git tag handover-YYYY-MM-DD && git push origin --tags`.
2. **[Seller]** GitHub → repository → Settings → *Transfer ownership* → buyer's organisation. Issues, PRs, history and
   Actions move with it; the old URL redirects.
3. **[Buyer]** Confirms access, enables branch protection on the default branch (required CI: lint + type-check).
4. **[Seller]** Removes their personal fork/clones from any shared machine; keeps no copy beyond what the agreement
   allows (usually: none, or an escrow copy).

## 2. Day 1–2 — Database and hosting

The current Supabase project (`yjgqunrboxihxtgkxibw`, Sydney) holds demo data and the shared dev history. Two options:

| Option | When | Steps |
|---|---|---|
| **A. Transfer the project** (Supabase supports moving a project between organisations) | Buyer is happy with the region and wants the history | Supabase → Project Settings → General → *Transfer project* to the buyer's organisation |
| **B. New project in the buyer's organisation** (recommended; also Stage 5 step 1) | Buyer wants an EU region and a clean start | Follow `docs/due-diligence/migrations-runbook.md` §4 (schema baseline), then delete or pause the old project after acceptance |

Then:
1. **[Seller]** Vercel → project → Settings → *Transfer project* to the buyer's team (environment variables move;
   re-check them).
2. **[Seller/Buyer]** Domain: transfer at the registrar (auth code) or point the buyer's domain at Vercel.
3. **[Dev]** Update Supabase Auth → URL configuration (Site URL, redirect URLs) and `NEXT_PUBLIC_SITE_URL` to the
   final domain.

## 3. Day 2 — Secrets rotation (mandatory, after every transfer)

| Secret | Where | How |
|---|---|---|
| Supabase JWT secret / API keys (anon, service role) | Supabase → Project Settings → API | Rotate; update Vercel env vars; redeploy |
| `SIGNUP_RATE_LIMIT_SECRET` | Vercel env | New random value (64+ chars) |
| Database password | Supabase → Database settings | Reset; give only to the buyer's technical contact |
| Any SMTP / Resend key | Resend + Supabase SMTP settings | Re-create under the buyer's account (Stage 5) |
| GitHub / Vercel / Supabase personal tokens of the seller | each service | Revoke; remove the seller from every member list |

Verification: the seller tries to sign in to each service and fails; the app works after redeploy.

## 4. Day 3 — Data

1. **[Dev]** Remove all demo data: `supabase/pending/20261115_demo_seed_rollback.sql`, then delete the demo sign-in
   users (Supabase → Authentication → Users). Confirm `clients`, `events`, `profiles` are empty except the new Admin.
2. **[Buyer]** Creates their first Admin by signing up; **[Dev]** promotes that profile to `admin` with one reviewed
   SQL statement (role changes are Admin-only in the app, and there is no Admin yet).
3. **[Dev]** Imports the buyer's clients and employees **once**, from their file:
   - Clients: name, company ID, address, contacts, per-role price list → `clients`. Duplicate company IDs are
     reported, not merged (the app's `23505` rule).
   - Employees: created through the Supabase Admin Auth API (no password; each employee sets one through
     "forgot password"), with first/last name, national ID (checksum-validated), phone, birth date, city/region and
     role tags; `approval_status = 'approved'` only for workers the buyer marks as active.
   - The import script is written after signing, against the buyer's real file format (roadmap rule: no
     buyer-specific work before the deal). It runs in dry-run first and prints counts and every rejected row with
     its reason (invalid ID, duplicate phone, missing birth date); the real run happens only after the buyer
     approves that report.
   - Acceptance: counts in the app equal the file's counts minus the rejected rows the buyer signed off.
4. Form 101 and bank details are **not** imported: they stay locked until Admin 2FA (Stage 5).

## 5. Day 4–5 — Training and documentation

| Session | Audience | Length | Content |
|---|---|---|---|
| Admin | owner / finance | 90 min | clients and price lists, recruiter credit rates, hour approval, payroll and billing exports, billing cycle close, compliance screen, user roles |
| Manager | field managers | 60 min | events, approving and scheduling, search, waitlist and cancellations, attendance and ratings, submitting hours |
| Recruiter | recruiters | 45 min | creating events, own events, credits |
| Employee | (recorded video, 5 min, Hebrew) | — | signing up, region, registering, waitlist, cancellation request, hours and pay |

Deliverables: a short Hebrew user guide per role (PDF, screenshots from the buyer's own data), recordings of the
sessions, and the technical docs already in the repository (`README.md`, `AGENTS.md`, `docs/`).

## 6. Acceptance and sign-off

The buyer signs a one-page handover protocol listing: repository transferred · Supabase and Vercel transferred or
rebuilt · domain transferred · secrets rotated · seller access removed · demo data removed · import counts accepted ·
training delivered. The handover-period support (per the agreement) starts on that date.

## Rollback

If a transfer fails midway, the old project and deployment keep running untouched until the protocol is signed;
nothing is deleted before acceptance.
