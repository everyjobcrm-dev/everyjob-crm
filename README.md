# everyJob CRM

A mobile-first, role-based workforce management and CRM platform tailored for shift-based staffing. everyJob handles the entire lifecycle of event staffing—from employee onboarding and shift registration to recruitment credits, attendance tracking, and client billing/payroll reporting.

---

## 🚀 Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with `create-next-app`. 

### Prerequisites
Make sure you have your `.env.local` file configured with the required Supabase URL and Anon Key before starting the development server.

### Running the Development Server
First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open http://localhost:3000 with your browser to see the result. You can start editing the page by modifying app/page.tsx. The page auto-updates as you edit the file.

### Phase 0 Quality Gates

This repo includes the standard project checks for the Phase 0 setup:

```bash
npm run lint
npm run typecheck
npm run db:push
```

The repo also includes a GitHub Actions workflow that runs lint + TypeScript checks on pull requests and pushes to `main` and `dev`.

### Vercel + Supabase Deployment Workflow

1. Create a Vercel project from the GitHub repo.
2. Connect `main` to the production project and `dev` to the preview project.
3. Add these environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (only if the app needs server-side admin writes)
4. Trigger a production deploy from the `main` branch and preview deploys from `dev`.
5. For Supabase schema changes, use the CLI workflow:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

This keeps schema changes moving through dev, staging, and production in a consistent order.

🛠 Tech Stack & Infrastructure
Framework: Next.js (App Router) + TypeScript

Database & Auth: Supabase (PostgreSQL) with strict Row Level Security (RLS)

Styling: Tailwind CSS v4 with native RTL support (logical properties)

Design System: Electric Indigo & Hyper Lime

Fonts: Geist (automatically optimized via next/font)

Architecture: Web Application (Mobile-First approach), with a future roadmap for a native Expo app.

👥 Role-Based Access Control (RBAC)
The system is built on a strict, four-tier permission hierarchy:

Admin (Super Admin): Full system control. Requires 2FA for login. Configures clients, sets billing rates and employee rates, sets each recruiter's per-hour recruitment-credit rate, manages credit records, and approves final hour reports. The only role with access to sensitive employee financial data and tax documents (Form 101).

Field Manager ("Skill"): Manages the live event. Approves/rejects shift requests, manually enters actual attendance hours at shift close, rates employees, sets employee hourly rates through the 10th of the following month, redeems pending recruitment credits for a recruiter from an event screen, and submits the consolidated hour report to the Admin. No access to financial or tax data.

Recruiter: Creates events and recruits employees. An event may optionally name one responsible recruiter. Recruiters do not set employee rates and cannot redeem credits themselves. Their own profile shows live pending recruitment-credit count and amount.

Employee: End user. Browses and requests shifts, joins waitlists, fills out digital Form 101s, and views expected monthly pay. Cannot unilaterally cancel a shift once assigned.

✨ Key Features
📅 Event & Shift Management
Smart Staffing: Employees view shifts matched to their authorized roles and age.

Waitlist System: Automatic promotion from the waitlist if a spot opens up (auto_promote_from_waitlist trigger).

Controlled Cancellations: Employees must request a cancellation; they cannot drop a shift without Manager/Recruiter/Admin approval.

💰 Recruitment Credits
An event may optionally have one responsible recruiter. When a recruited employee's hours are approved, the recruiter earns one pending credit for that event and employee, unless the employee is the recruiter themself.

Each recruiter has an Admin-set `recruiter_bonus_rate` in NIS per approved hour. This rate is stored on the recruiter's profile and is separate from the employee's own `wage_rate`; it defaults to 1 NIS/hour. Credits accumulate without monthly reset and are redeemed FIFO by a Manager or Admin from an event management screen. Recruiters cannot redeem credits themselves.

🏢 Client & Billing Management (CRM)
Full CRUD for clients with smart duplicate prevention.

Custom price lists per client based on employee roles.

Automated internal generation of overtime billing rules and travel costs (exported via Excel; decoupled from external accounting APIs).

🔒 Security, Compliance & Privacy
2FA Requirement: Mandatory for Admins to view sensitive documents.

Data Protection: Routine, proactive deletion (monthly cron job/purge) of Form 101 details to minimize the legal risk of holding sensitive tax data.

Strict RLS: All database queries are filtered at the Postgres level via profiles.role.

🗺 Roadmap & Development Status
✅ Completed (Done)
Next.js + Supabase core infrastructure.

Complete data architecture: business triggers, shift_hour_submissions, recruiter_bonuses credit ledger, and live pending-credit views.

Single Source of Truth: Views created for staffing-status calculation and hour-approval boards (never storing staffing status, always deriving it from event_role_fill_counts).

RBAC implementation with independent permission checks on every server action.

Field Manager attendance entry, employee ratings, and final report submission.

Waitlist and controlled shift cancellation flows.

🔄 In Progress
Admin 2FA: SMS/Email two-factor authentication to unlock Form 101 exposure.

Recruitment credits: event attribution, approval-triggered credit creation, FIFO redemption, and Admin recruiters overview.

📅 Planned
Employee Portal: Digital Form 101 signature, bank details entry, and home screen UI.

Payroll & Billing Engine: Excel exports, compliance dashboards (missing Form 101s/bank details), and employee payroll breakdown (regular, 125%, 150%, travel, bonuses).

Security Enhancements: Database encryption at rest; strict environment separation (Dev/Staging/Prod).

Future Expansion (Phase 2): Native mobile app via Expo, GPS verification for Field Managers, and automated WhatsApp/SMS notifications.

🏗 Architecture Decisions (Dev Notes)
Staffing Status: We never store staffing status directly in the database. It is dynamically derived via the event_role_fill_counts view.

Form Management: Zod / React Hook Form type-inference is handled via a z.input<>/z.output<> split using the three-generic useForm pattern.

Recruitment Credits: `recruiter_bonuses` is the credit ledger. Credits are created only when matching recruited employees' hours become Approved, use the recruiter's Admin-set `profiles.recruiter_bonus_rate` rather than the employee's `wage_rate`, and are redeemed FIFO by Manager/Admin. Pending count and amount are always derived live from one shared view.

Recruiter Overview: Admin has a read-only recruiter overview showing live pending credit count and amount; redemption remains available only from event management screens.

Admin Actions: All Admin server actions are cleanly consolidated into app/admin/actions.ts.

RLS Policies: Explicitly reference profiles.role rather than relying on secondary tables.

📚 Learn More About Next.js
To learn more about the underlying framework, take a look at the following resources:

Next.js Documentation - learn about Next.js features and API.

Learn Next.js - an interactive Next.js tutorial.

🚀 Deploy on Vercel
The easiest way to deploy your Next.js app is to use the Vercel Platform from the creators of Next.js. Check out the Next.js deployment documentation for more details.

everyJob CRM is designed for compliance with Israeli labor and privacy laws, specifically tailoring workflows to handle Form 101, statutory overtime (125%/150%), and travel budgets.