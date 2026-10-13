# Manual browser test plan: events lifecycle (Phases 3 + 4)

Run this on the Vercel deployment of `claude/dazzling-brahmagupta-f5sq4c`, with real email verification, using the demo users
from `scripts/seed-demo-users.md` plus your admin. Use a separate private window per user. Mark each line ✅ / ❌ and
note the exact message shown on a ❌.

Abbreviations: **ADM** admin · **MGR** manager · **REC1** recruiter with `can_create_events` · **REC2** recruiter without ·
**EMP1/EMP2** adults · **MIN** employee under 18.

---

## 0. Setup (ADM, then REC1)

| # | Who | Click path | Expected |
|---|---|---|---|
| 0.1 | ADM | אדמין → אירועים → אירוע חדש: client, date **+14 days**, location "בדיקה A", min_age **18**, role "מלצר/ית" headcount **2** base_rate **50**, role "בר" headcount **1** base_rate **55** → שמירה | Event created as **פתוח להרשמה**, back on `/admin/events` |
| 0.2 | REC1 | log in | Lands on **`/manager/events`** ("האירועים שלי"), not the employee dashboard |
| 0.3 | REC1 | אירוע חדש: date **+15 days**, location "בדיקה R1", role "דייל/ת" headcount **1** base_rate **50** | Lands back on `/manager/events`; event "בדיקה R1" listed with **פתוח להרשמה** |
| 0.4 | REC1 | (event list) | Event "בדיקה A" (created by ADM) is **not** listed |

## 1. Routing and navigation

| # | Who | Action | Expected |
|---|---|---|---|
| 1.1 | REC2 | log in | Lands on `/manager/events`; header shows **מגייס/ת**; there is **no** "אירוע חדש" link |
| 1.2 | REC2 | open `/new` | Redirected to `/manager/events` |
| 1.3 | REC2 | open `/admin/events` | Redirected to `/manager/events` |
| 1.4 | MGR | log in | Lands on `/manager/events` ("כל האירועים"); sees both "בדיקה A" and "בדיקה R1" |
| 1.5 | EMP1 | open `/manager/events` | Redirected to `/employee/dashboard` |
| 1.6 | REC1 | open "המשמרות שלי" from the staff header | `/employee/shifts` opens; the side rail has a **ניהול** entry back to `/manager/events` |
| 1.7 | ADM | אדמין → אירועים → the **צוות** link on "בדיקה A" | Opens `/manager/events/<id>` with the roster |
| 1.8 | REC1 | type the URL of "בדיקה A" (`/manager/events/<id of A>`) | Page shows **אין לך הרשאה לנהל אירוע זה** |

## 2. Employee registration and waitlist (event "בדיקה A")

| # | Who | Action | Expected |
|---|---|---|---|
| 2.1 | MIN | אירועים | "בדיקה A" is **not** offered (min_age 18) |
| 2.2 | EMP1 | אירועים → "בדיקה A" → בר → הרשמה למשמרת | Status **ממתין/ה לאישור** |
| 2.3 | EMP2 | same role "בר" (headcount 1, EMP1 pending holds the slot) | Button reads **הצטרפות לרשימת המתנה**; after click: **ברשימת המתנה** |
| 2.4 | EMP1 | המשמרות שלי | Under **ממתין/ה לאישור**: "בר", with a **בקש ביטול** button |
| 2.5 | MGR | אירוע "בדיקה A" → card shows **1 ממתינים לאישור**, **1 בהמתנה** | Counts match |

## 3. Staff roster actions (MGR on "בדיקה A")

| # | Action | Expected |
|---|---|---|
| 3.1 | Role "בר": EMP1 under **ממתינים לאישור** → אישור | EMP1 moves to **משובצים**; "1/1 מקומות תפוסים" |
| 3.2 | EMP2 under **רשימת המתנה** shows **#1**; button **שיבוץ מהמתנה** | Button is **disabled** (role full) |
| 3.3 | "מלצר/ית" → שיבוץ עובד/ת לתפקיד → search "MIN's first name" → שיבוץ | Error: **העובד/ת מתחת לגיל המינימלי לאירוע, או שחסר תאריך לידה בפרופיל.** |
| 3.4 | Same panel: search EMP2's name | EMP2 already holds a registration on this event: the row says **בהמתנה באירוע זה** and **שיבוץ** is disabled |
| 3.5 | Set the event to `min_rating` above EMP ratings (edit as ADM if available) and schedule a fresh employee | Yellow notice **השיבוץ בוצע, לתשומת לבך:** … **דירוג העובד/ת נמוך מהדירוג המינימלי לאירוע.** (non-blocking) |
| 3.6 | EMP1 (approved): rate field → **0** → שמירה | **יש להזין תעריף שעתי חיובי** |
| 3.7 | EMP1: rate **48.5** → שמירה | Saved; reload shows 48.5 |
| 3.8 | EMP1: הסרה → empty reason → אישור הסרה | **יש להזין סיבה להסרה** |
| 3.9 | EMP2 (waitlist): דחייה | EMP2 moves to the collapsed **היסטוריה** list with "נדחה/תה" |

## 4. Cancellation request flow (Phase 4)

| # | Who | Action | Expected |
|---|---|---|---|
| 4.1 | EMP1 | המשמרות שלי → "בר" → בקש ביטול → reason "מחלה" → אישור ושליחת בקשת ביטול | Row shows **בקשת ביטול נשלחה - ממתינה לטיפול הצוות**; counter **בקשות ביטול פתוחות = 1** |
| 4.2 | EMP1 | refresh, try again | No button (already requested). (Server message if forced: **כבר נשלחה בקשת ביטול למשמרת זו…**) |
| 4.3 | MGR | events list | "בדיקה A" shows **1 בקשות ביטול** |
| 4.4 | MGR | roster → role "בר" | EMP1 appears under **בקשות ביטול** (not under משובצים) with **אישור ביטול** / **דחיית הבקשה** only |
| 4.5 | MGR | **דחיית הבקשה** (dismiss) | Row returns to **משובצים**; EMP1 sees the request gone and **בקש ביטול** available again |
| 4.6 | EMP1 | request again; MGR → **אישור ביטול** | EMP1 → history "בוטל לבקשתך"; the next waitlisted person (if any) becomes **ממתין/ה לאישור** automatically (FIFO) |
| 4.7 | EMP1 | אירועים → "בדיקה A" → בר → register again | Allowed (cancelled may re-register), goes to the back of the queue |
| 4.8 | EMP2 | (rejected in 3.9) try to register again | **בקשתך להשתתף באירוע זה נדחתה בעבר ולכן לא ניתן להירשם שוב.** |

## 5. Event status control

| # | Who | Action | Expected |
|---|---|---|---|
| 5.1 | REC1 | "בדיקה R1" → סגירה להרשמה | Badge **סגור להרשמה**; EMP1 no longer sees it under אירועים |
| 5.2 | EMP1 (with a registration on R1) | המשמרות שלי | Shift still listed with "האירוע סגור להרשמות חדשות." and **בקש ביטול** still works |
| 5.3 | REC1 | פתיחה להרשמה | Back to **פתוח להרשמה** |
| 5.4 | REC1 | ביטול האירוע → לאשר ביטול? | Badge **בוטל**; roster read-only notice; **no** restore buttons + "רק מנהל/ת או אדמין יכולים לשחזר אירוע שבוטל." |
| 5.5 | EMP1 | המשמרות שלי | R1 shift **disappears** (cancelled events excluded) |
| 5.6 | MGR | "בדיקה R1" → **שחזור לפתוח להרשמה (ברירת מחדל)** | Restored to the pre-cancel status |
| 5.7 | MGR | any roster action on a cancelled event | Not offered (read-only); server message if forced: **האירוע בוטל - לא ניתן לבצע בו פעולות.** |

## 6. Rate window (Manager vs Admin)

| # | Who | Action | Expected |
|---|---|---|---|
| 6.1 | MGR | an approved registration on an event dated **last month or earlier, after the 10th of this month** → set rate | **חלון עדכון התעריף למנהל/ת הסתיים ב-10 לחודש שלאחר האירוע. פנה/י לאדמין.** |
| 6.2 | ADM | same registration | Saved |
| 6.3 | REC1 | roster of own event | **No** rate field and no rates visible |

## 7. Staff as worker

| # | Who | Action | Expected |
|---|---|---|---|
| 7.1 | REC1 | employee portal → אירועים → register for "בדיקה A" (role with space) | Status **משובץ/ת** immediately (staff auto-approved when capacity allows) |
| 7.2 | MGR | roster of "בדיקה A" | REC1's row has the **צוות** badge |
| 7.3 | REC1 | open the roster of an own event where REC1 is also registered | Own row shows **את/ה** and has **no** action buttons |
| 7.4 | REC1 | המשמרות שלי → בקש ביטול | Works (requests only); approval must come from another staff member |

## 8. Done criteria
All rows ✅. After that, run M6c by hand (`supabase/p4_m6c_drop_legacy_registration_policy.sql`) and repeat **4.1, 4.5, 4.6, 2.2** to
confirm nothing depended on the dropped policy.
