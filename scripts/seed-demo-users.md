# Demo users for the events-lifecycle browser test

Six demo accounts for `docs/manual-test-plan-events.md`. Nothing here is automated: no script creates users and nothing
writes to `auth.*` via SQL. You also need your existing **admin** account.

| # | Purpose | Email (Gmail "+" alias) | tz | Birth date | Phone | Final role / flags |
|---|---|---|---|---|---|---|
| 1 | Manager | `you+mgr@gmail.com` | 314159260 | 1985-04-10 | 0521000001 | `manager` |
| 2 | Recruiter with flag | `you+rec1@gmail.com` | 271828188 | 1990-06-01 | 0521000002 | `recruiter`, `can_create_events = true` |
| 3 | Recruiter without flag | `you+rec2@gmail.com` | 161803390 | 1991-02-14 | 0521000003 | `recruiter`, `can_create_events = false` |
| 4 | Employee A | `you+emp1@gmail.com` | 141421354 | 1995-09-09 | 0521000004 | `employee` |
| 5 | Employee B | `you+emp2@gmail.com` | 173205089 | 1998-12-20 | 0521000005 | `employee` |
| 6 | Employee under 18 | `you+minor@gmail.com` | 223606799 | 2010-03-15 | 0521000006 | `employee` |

All six tz values pass the Israeli ID checksum (`profiles_tz_checksum_check`). Replace `you@gmail.com` with a mailbox
you can read: Gmail delivers `you+anything@gmail.com` to `you@gmail.com`.

## Important: do NOT use Supabase dashboard "Add user"

`Authentication > Users > Add user` cannot set user metadata. The live trigger `on_auth_user_created`
(`handle_new_user`) requires `first_name`, `last_name`, `tz`, `gender` and `phone_number` in the metadata and raises
`Missing required field: first_name`, so the dashboard creation fails (or leaves no profile). Use the app's own
sign-up instead. It is also the flow that real email verification must cover on Vercel.

## Step 1: Register each user through the app (Vercel deployment)

For each row of the table:
1. Open `https://<your-vercel-domain>/register` in a private window.
2. Fill in first name, last name, the **tz**, gender, the **phone**, the **birth date** and the **email** from the table, plus a password.
3. Submit, open the verification email in your inbox and complete verification (code or link, as configured).
4. Log in once to confirm the account works (it lands on `/employee/dashboard` as an employee), then log out.

Every new account starts as `employee` with `can_create_events = false`. The profile guard forces this.

## Step 2: Promote the roles in the admin UI

1. Log in as your admin account and open **אדמין → עובדים** (`/admin/employees`).
2. Find each user (search by name or phone) and change the role in the role dropdown:
   - `you+mgr` → **מנהל/ת שטח** (`manager`)
   - `you+rec1` and `you+rec2` → **מגייס/ת** (`recruiter`)
   - the three employees stay **עובד/ת** (`employee`)
3. Reload the page to confirm the roles stuck.

**Known issue (see the backlog):** `/admin/employees` currently selects `form_101_status`, `total_earnings` and `total_hours`
from `profiles`. Those columns do not exist in the live database, so the list may render **empty**. In that case set the
roles in the SQL Editor instead. This touches `public.profiles` only, never `auth.*`:

```sql
UPDATE public.profiles SET role = 'manager'   WHERE email = 'you+mgr@gmail.com'  RETURNING email, role;
UPDATE public.profiles SET role = 'recruiter' WHERE email IN ('you+rec1@gmail.com', 'you+rec2@gmail.com') RETURNING email, role;
```

## Step 3: Set `can_create_events` for recruiter 1 (SQL; the admin UI has no control for it)

Run this in **Supabase → SQL Editor**. It touches `public.profiles` only, as the SQL Editor's owner role, so the
profile guard does not apply:

```sql
UPDATE public.profiles SET can_create_events = true
 WHERE email = 'you+rec1@gmail.com' AND role = 'recruiter'
RETURNING id, email, role, can_create_events;
```

Expect exactly one row. Recruiter 2 keeps `false`.

## Step 4: Read-only check

```sql
SELECT email, role, can_create_events, birth_date,
       date_part('year', age(birth_date))::int AS age
  FROM public.profiles
 WHERE email LIKE 'you+%@gmail.com'
 ORDER BY email;
```

Expected: 1 × manager, 2 × recruiter (only rec1 has `true`), 3 × employee, and the `minor` row shows an age under 18.

## Removing the demo users later

Delete them from **Authentication → Users** in the dashboard (one by one), or with the cleanup function's documented
admin flow. Accounts that already have registrations or history are blocked by foreign keys. Cancel or leave those
rows rather than deleting history.
