# everyJob CRM – Specification Document & System Overview (Final Version)

## 1. Role Hierarchy and Permissions
The system is built on a strict permission hierarchy. User types and their authority:

**Role hierarchy: Admin ⊇ Manager ⊇ Recruiter.** Anything a Recruiter can do in event management, a Manager can do, and anything a Manager can do an Admin can do. Admin and Manager act on **all** events and registrations; a Recruiter acts only on events they created/own. Admin-only: final hour-report approval, client pricing and billing rules, the per-recruiter recruitment-credit rate, Form 101 / bank data, user-role changes, event deletion. Admin, Manager and Recruiter may also register for shifts **as workers** (see §3).

**Admin (Super Admin):** Full system control. Requires two-factor authentication (2FA) at login. Sees profitability, generates client billing and payroll reports, approves final hour reports. The only role in the system exposed to employees' Form 101 (Israeli tax withholding form). Configures clients, employee rates, employee permissions, and each recruiter's per-hour recruitment-credit rate.

**Field Manager ("Skill" permission):** Responsible for managing the live event on any event. Manages employee attendance (manual entry), approves or cancels employee shift signups, can create events, open/close registration, cancel and restore events. At shift close, rates employees, enters hours for each employee, and sends an organized hour report to the Admin for approval. No access to company financial data or sensitive documents (Form 101).

**Recruiter:** Authorized (with the `can_create_events` permission) to create new events and recruit employees to them. On events they own, can open/close registration, cancel the event, approve or reject signed-up employees, remove them and handle their cancellation requests. Recruiters cannot restore a cancelled event, enter attendance/hours or ratings, set employee hourly rates, or redeem recruitment credits. An event may optionally name one responsible recruiter, who can earn recruitment credits for matching recruited employees.

**Employee:** End user. Views shifts, submits shift signup requests (pending approval), fills out a digital Form 101. Cannot cancel a shift themselves (requires Manager/Recruiter/Admin approval).

## 2. Login and Signup Screens (Guest / New User)
Landing screen: recommended-shift display / platform showcase. Nav buttons: Login | Sign Up | App Description.

Login page: email and password. "Forgot password" option. For Admin: requires an additional verification code (SMS/email — 2FA).

Signup page:
- Basic details: first name, last name, national ID, phone, password.
- Personal details: date of birth (auto age calculation), gender.

## 3. Personal Area – Employee Interface
**Home page:**
- "My next shift" display.
- Open shift offers (matched to the employee's authorized roles and age).
- Prominent alert if the digital Form 101 or bank details haven't been filled in.
- Notifications and updates (push notifications) — e.g. "Your shift for tomorrow was approved."

**Events and shifts page:**
- Open events display (filter: nearby / all).
- Signup mechanism: employee clicks "Sign up for shift," status becomes "pending approval."
- Waitlist: option to join the waitlist for a shift that's full (as long as it hasn't started yet), in case a spot opens up.
- Cancellations: an employee cannot cancel a shift alone. They must *request* cancellation (via button/message); staff with authority over the event decides. An approved request sets the registration to **cancelled** (the employee may register again; they go to the back of the waitlist). Staff removing someone on their own initiative sets **removed** (the employee may not re-register by themself; staff may re-schedule them). A rejected signup cannot re-apply to the same event.
- Staff as workers: Admin, Manager and Recruiter may register for shifts as workers. They are placed directly as **approved** ("משובץ") when the role has capacity, otherwise waitlisted; they are exempt from the minimum-rating rule (not from the minimum-age rule). A staff member never approves or removes their own registration or their own hours.
- Capacity: pending and approved registrations occupy a slot; waitlisted/rejected/cancelled/removed do not. A full role stays open for registration and routes new signups to the waitlist; an event is never closed automatically when it fills.
- "My shifts": the employee's registrations grouped by state (pending, approved, waitlisted, rejected, and a muted "removed" section); cancelled events are excluded; a cancellation can only be requested.
- History and finances: view total monthly work hours and estimated pay.

**Personal profile and forms:**
- Fill out a smart digital Form 101 (fill and sign within the app).
- Enter bank account details and preferred work areas.
- View authorized roles (set by Admin).

## 4. Recruiter Interface – Extended Permissions
**Event and recruitment management:** Direct event creation and management of employee join requests (approve / reject / remove from shift).

**Rate control:** Recruiters have no rate-setting permission. Field Managers may set an employee's hourly rate for an event dated on or before the 10th of the following month; Admins may set rates without a time restriction. The employee's `wage_rate` is separate from the recruiter's Admin-set `recruiter_bonus_rate`.

**Personal recruiter dashboard and recruitment-credit model:**
- The recruiter's profile shows live pending recruitment-credit count and pending amount.
- Each recruiter has an Admin-set `recruiter_bonus_rate` in NIS per approved hour, defaulting to 1. It is stored on `profiles` and is separate from the recruited employee's `wage_rate`.
- When a recruited employee's hours for an event become Approved, a pending credit is created when the event's recruiter matches the employee's `recruited_by` attribution. A recruiter never earns a credit for their own hours.
- Credits accumulate indefinitely without monthly reset. A Manager or Admin can redeem N pending credits from an event management screen; the oldest unredeemed records are redeemed FIFO with redemption actor and event context recorded. Recruiters have no self-redemption action.

## 5. Field Manager Interface – Extended Permissions
**Team and event management:**
- Approve and control employee shift signup requests and manage the waitlist.
- Authority to remove an employee from a shift (Manager and Admin on any event; Recruiter on own events).

**Attendance and hour reporting (no break reporting):**
- The manager doesn't rely on employees — attendance is entered manually.
- At shift close, the manager goes through the employee list and enters actual worked hours for each one.
- Future phase (Phase 2): GPS location verification allowing the manager to see employee locations during the shift.

**Shift closing ("Skill" function):**
- Employee ratings (stars/notes) — factored into a rolling average on the employee's profile.
- Sending the consolidated hour report to Admin for approval.

## 6. Main Admin Area – Admin Interface
**Maximum security:** Access to the admin interface requires 2FA. This is the only area where bank account details and Form 101 can be viewed.

**Dashboard and routine operations:** Final approval of hour reports from field managers, alerts on understaffed shifts, region-based WhatsApp groups.

**Extended event management:** Opening events, setting required employee count, hours, base rate, and travel budget allocation.

**Recruiter management:** A read-only recruiters overview lists every recruiter with live pending recruitment count and amount, using the same derived view as the recruiter's profile. It has no redemption control. Admin sets each recruiter's `recruiter_bonus_rate`; redemption is performed only from event management screens by a Manager or Admin.

**Client management:** Adding a client, setting a price list (rate the client pays per role), and defining the overtime billing model for the client.

**Privacy and data deletion:** A dedicated Admin button to proactively and comprehensively delete employees' Form 101 details at the end of each month, to preserve privacy.

## 7. Payroll, Operational Reports and Billing (No External Integration)
**Client billing:**
- The system generates a billing table and reports only, calculating the overtime model and travel costs against the client.
- Data is displayed in a table/Excel export and is not automatically connected to external accounting systems (no integration with Green Invoice, etc.).

**Payslip / employee report:** Detailed view for the employee of pay (regular hours, 125%, 150%, travel, and weighted recruiter bonus).

**Document control panel:** Smart tracking of Form 101 status, missing bank details, and national ID conflicts.

## 8. Platform, Technology and Notifications
**Architecture:** The system will be developed as a Web Application with a "Mobile First" approach (perfectly optimized for employees' and field managers' mobile browsers) and responsive across all screens (desktop/tablet for Admin).

**Future phase:** Packaging the system as a native app for download from app stores (App Store / Google Play).

**Notification system:**
- Phase one: internal push notifications within the app/browser (e.g. when a shift is approved by a manager).
- Future phase: connection to SMS / WhatsApp notification system.

## 9. Compliance, Privacy and Data Security
**Strict data protection:** The system will hold sensitive data and therefore requires the highest level of database encryption, compliant with privacy protection regulations.

**Access control:** As noted, only an authenticated (2FA) Admin-defined user can open Form 101 documents.

**Periodic deletion:** Implementation of a button/automation allowing the Admin to clean and delete Form 101 details at the end of the monthly billing cycle, to minimize legal risk from retaining sensitive data long-term.

## 10. Event Status Model
"Closed" means **closed for registration** - it is not the financial closure.
- **pending_rates** - role rates missing; hidden from employees; cannot take registrations.
- **open** - employees (and staff-as-workers) may register; a full role routes to the waitlist (auto-promotion keeps working).
- **closed** - no new registrations or waitlist joins and hidden from the employees' events list; staff can still approve, assign and remove; employees can still request cancellation.
- **cancelled** - only marked as cancelled: existing registrations are neither changed nor deleted; the event is excluded from every derived calculation (staffing, hours, payroll, billing, dashboards, "My shifts") and hidden from employees. Cancelling is refused while an approved hour report exists. Admin/Manager can restore it (default: back to the status it was cancelled from, otherwise "closed", still requiring all rates).
- **completed / paused** - **frozen**: no status transition in or out through the application (only service_role / direct DB).
Allowed transitions: open <-> closed; open|closed|pending_rates -> cancelled; pending_rates -> open (all rates set); cancelled -> open|closed|pending_rates (Admin/Manager only). A Recruiter may do the non-restore transitions on events they own. Rules are enforced in the database, not only in the UI.

## 11. Deferred - hours flow
Attendance entry, hour-report submission and approval (RLS on the hour tables, a two-person review constraint, attendance guards) are being reworked in a separate session. Until then, Admin and Manager (not Recruiter) are the roles allowed to enter attendance, and nobody may approve hours they worked themselves.
