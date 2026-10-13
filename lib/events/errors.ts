/**
 * Maps database / RPC error text and Postgres codes to Hebrew user-facing messages (AGENTS.md 5.4).
 * Order matters: more specific fragments come before the generic ones they contain.
 * Pure module - safe for server actions and client components.
 */

export type DbErrorLike = { message?: string | null; code?: string | null } | null | undefined;

const BY_MESSAGE: ReadonlyArray<readonly [string, string]> = [
  // event status machine (trigger enforce_event_status_transition)
  ["status_frozen", "סטטוס האירוע קפוא ואינו ניתן לשינוי מהמערכת."],
  ["forbidden_transition", "אין לך הרשאה לבצע את מעבר הסטטוס הזה."],
  ["invalid_transition", "מעבר הסטטוס המבוקש אינו מותר."],
  ["invalid_initial_status", "סטטוס פתיחה לא תקין לאירוע חדש."],
  ["missing_rates", "לא ניתן לפתוח את האירוע: חסר תעריף בסיס באחד התפקידים."],
  ["Every event role must have a base rate", "לא ניתן לפתוח את האירוע: חסר תעריף בסיס באחד התפקידים."],
  ["cannot_cancel_with_approved_hours", "לא ניתן לבטל אירוע שקיים עבורו דוח שעות מאושר."],
  // registration guard (trigger guard_event_registration_write)
  ["event_cancelled", "האירוע בוטל - לא ניתן לבצע בו פעולות."],
  ["event_completed", "האירוע הושלם - רק אדמין יכול לשנות בו שיבוצים."],
  ["invalid_registration_transition", "מעבר הסטטוס של ההרשמה אינו מותר."],
  ["forbidden_column", "אין לך הרשאה לשנות שדה זה."],
  ["rate_audit_mismatch", "פרטי קביעת התעריף אינם תקינים. נסה/י שוב."],
  ["immutable_columns", "לא ניתן לשנות את פרטי השיוך של ההרשמה."],
  // registration RPC (register_for_event_role)
  ["not_open: past", "האירוע כבר התקיים."],
  ["not_open: pending_rates", "התפקיד עדיין ללא תעריף ולכן אינו פתוח להרשמה."],
  ["not_open", "האירוע אינו פתוח להרשמה יותר."],
  ["not_eligible: age", "לא ניתן להירשם: יש לעדכן תאריך לידה ולעמוד בגיל המינימלי לאירוע."],
  ["not_eligible: rating", "לא ניתן להירשם: הדירוג שלך נמוך מהדירוג המינימלי לאירוע."],
  ["not_eligible: role_skill", "לא ניתן להירשם: הרשאת התפקיד שלך עדיין לא הוגדרה במערכת."],
  ["not_eligible: previously_rejected", "בקשתך להשתתף באירוע זה נדחתה בעבר ולכן לא ניתן להירשם שוב."],
  ["not_eligible: previously_removed", "הוסרת מאירוע זה על ידי הצוות ולכן לא ניתן להירשם שוב. פנה/י למנהל/ת."],
  ["not_eligible", "אינך עומד/ת בתנאי הקבלה למשמרת זו."],
  ["already_registered", "כבר נרשמת לאירוע זה."],
  ["role_not_found", "התפקיד לא נמצא."],
  ["not_authenticated", "לא מחובר/ת למערכת."],
  // staff scheduling RPCs (schedule_employee / remove_scheduled_employee / add_historical_event_attendee)
  ["not_authorized", "אין לך הרשאה לבצע פעולה זו."],
  ["event_role_full", "התפקיד מלא."],
  ["role_full", "התפקיד מלא."],
  ["employee_already_registered", "העובד/ת כבר רשום/ה לאירוע זה."],
  ["event_not_schedulable", "ניתן לבצע פעולה זו רק באירוע פתוח או סגור להרשמה."],
  ["event_role_not_found", "התפקיד לא נמצא."],
  ["employee_not_found", "העובד/ת לא נמצא/ה."],
  ["registration_not_found", "ההרשמה לא נמצאה."],
  ["registration_not_active", "ההרשמה כבר אינה פעילה."],
  ["registration_has_submissions", "לא ניתן לשנות הרשמה שכבר קיימים עבורה דוחות שעות."],
  ["reason_required", "יש להזין סיבה."],
  // staff registration RPCs (staff_transition_registration / set_registration_wage_rate / get_event_roster)
  ["not_own_registration", "לא ניתן לבצע פעולה זו על ההרשמה שלך. פעולה על הרשמה שלך מבוצעת על ידי איש/אשת צוות אחר/ת."],
  ["cancellation_pending", "קיימת בקשת ביטול פתוחה להרשמה זו. יש לטפל בה תחילה."],
  ["no_cancellation_request", "אין בקשת ביטול פתוחה להרשמה זו."],
  ["invalid_action", "פעולה לא מוכרת."],
  ["rate_window_closed", "חלון עדכון התעריף למנהל/ת הסתיים ב-10 לחודש שלאחר האירוע. פנה/י לאדמין."],
  ["registration_not_approved", "ניתן לקבוע תעריף רק לעובד/ת משובץ/ת (מאושר/ת)."],
  ["invalid_rate", "יש להזין תעריף שעתי חיובי."],
  // worker self-service (request_registration_cancellation) and lookups
  ["cancellation_already_requested", "כבר נשלחה בקשת ביטול למשמרת זו. הבקשה ממתינה לטיפול הצוות."],
  ["event_past", "האירוע כבר התקיים - לא ניתן לבקש ביטול."],
  ["event_not_found", "האירוע לא נמצא."],
  // hours flow (submit_shift_hours / approve / reject / void_shift_hours)
  ["invalid_hours", "שעות לא תקינות: שעת הסיום חייבת להיות אחרי שעת ההתחלה, ועד 24 שעות."],
  ["invalid_rating", "הדירוג חייב להיות בין 1 ל-5."],
  ["hours_not_allowed", "לא ניתן לדווח שעות לאירוע בסטטוס הנוכחי."],
  ["shift_not_started", "לא ניתן לדווח שעות לפני מועד המשמרת."],
  ["hours_already_approved", "דוח השעות כבר אושר. כדי לתקן יש לבטל אותו תחילה (אדמין)."],
  ["submission_not_found", "דוח השעות לא נמצא."],
  ["invalid_submission_transition", "לא ניתן לבצע פעולה זו על דוח השעות במצבו הנוכחי."],
  ["self_review", "לא ניתן לאשר או לדחות שעות שעבדת בעצמך."],
  ["credit_already_applied", "לא ניתן לבטל: זיכוי הגיוס עבור שעות אלה כבר מומש."],
  ["event_not_historical", "הפעולה זמינה רק לאירועים שהסתיימו."],
  ["already_assigned", "העובד/ת כבר משובץ/ת לתפקיד."],
  // profiles guard
  ["protected profile fields", "רק אדמין יכול לשנות שדות מוגנים בפרופיל."],
  // generic permission text last
  ["forbidden", "אין לך הרשאה לבצע פעולה זו."],
];

const BY_CODE: Readonly<Record<string, string>> = {
  "23505": "רשומה כזו כבר קיימת.", // unique_violation - override per call via options.uniqueMessage
  "23503": "לא ניתן לבצע את הפעולה: קיימים נתונים מקושרים (לדוגמה היסטוריית שיבוץ).",
  "23514": "הערך שהוזן אינו תקין.",
  "40P01": "המערכת עמוסה כרגע - נסה/י שוב.", // deadlock_detected
  "40001": "המערכת עמוסה כרגע - נסה/י שוב.", // serialization_failure
  "42501": "אין לך הרשאה לבצע פעולה זו.",
};

export type MapDbErrorOptions = {
  /** Message for Postgres 23505 in this context (AGENTS.md 5.4), e.g. "כבר נרשמת לאירוע זה." */
  uniqueMessage?: string;
  /** Message when nothing matches. */
  fallback?: string;
};

export function mapDbError(error: DbErrorLike, options: MapDbErrorOptions = {}): string {
  const fallback = options.fallback ?? "הפעולה נכשלה. נסה/י שוב.";
  if (!error) return fallback;
  const message = error.message ?? "";
  const code = error.code ?? "";

  for (const [fragment, hebrew] of BY_MESSAGE) {
    if (message.includes(fragment)) return hebrew;
  }
  if (code === "23505") return options.uniqueMessage ?? BY_CODE["23505"];
  if (code && BY_CODE[code]) return BY_CODE[code];
  return fallback;
}
