import { z } from "zod";

// Staff registration actions (Phase 3). Shared by the server actions in app/manager/actions.ts and the roster forms;
// forms use the z.input / z.output split with the three-generic useForm (AGENTS.md 5.3).

export const STAFF_TRANSITION_ACTIONS = [
  "approve",
  "reject",
  "promote",
  "approve_cancellation",
  "dismiss_cancellation",
] as const;
export type StaffTransitionAction = (typeof STAFF_TRANSITION_ACTIONS)[number];

const uuid = z.string().uuid("מזהה לא תקין");

export const removalSchema = z.object({
  reason: z.string().trim().min(2, "יש להזין סיבה להסרה").max(500, "הסיבה ארוכה מדי"),
});
export type RemovalFormInput = z.input<typeof removalSchema>;
export type RemovalFormOutput = z.output<typeof removalSchema>;

export const wageRateSchema = z.object({
  wageRate: z.coerce
    .number({ invalid_type_error: "יש להזין מספר" })
    .positive("יש להזין תעריף שעתי חיובי")
    .max(10000, "התעריף גבוה מדי"),
});
export type WageRateFormInput = z.input<typeof wageRateSchema>;
export type WageRateFormOutput = z.output<typeof wageRateSchema>;

export const employeeSearchSchema = z.object({
  query: z.string().trim().min(2, "יש להזין לפחות 2 תווים").max(80),
});
export type EmployeeSearchFormInput = z.input<typeof employeeSearchSchema>;
export type EmployeeSearchFormOutput = z.output<typeof employeeSearchSchema>;

export const transitionArgsSchema = z.object({
  eventId: uuid,
  registrationId: uuid,
  action: z.enum(STAFF_TRANSITION_ACTIONS),
  reason: z.string().trim().max(500).optional(),
});

export const removeArgsSchema = removalSchema.extend({ eventId: uuid, registrationId: uuid });
export const rateArgsSchema = wageRateSchema.extend({ eventId: uuid, registrationId: uuid });
export const scheduleArgsSchema = z.object({ eventId: uuid, eventRoleId: uuid, employeeId: uuid });
export const searchArgsSchema = employeeSearchSchema.extend({ eventId: uuid });

// Worker's own cancellation request (request_registration_cancellation). The reason is optional.
export const cancellationRequestSchema = z.object({
  reason: z.string().trim().max(500, "הסיבה ארוכה מדי").optional(),
});
export type CancellationRequestFormInput = z.input<typeof cancellationRequestSchema>;
export type CancellationRequestFormOutput = z.output<typeof cancellationRequestSchema>;
export const cancellationArgsSchema = cancellationRequestSchema.extend({ registrationId: uuid });

/** Hebrew labels for the non-blocking warnings of search_employees / schedule_employee (picker side warnings). */
export const SCHEDULE_WARNING_LABEL: Record<string, string> = {
  pending_approval: "העובד/ת עדיין לא אושר/ה במערכת (ממתין/ה לאישור).",
  approval_rejected: "בקשת ההצטרפות של העובד/ת נדחתה.",
  below_min_rating: "דירוג העובד/ת נמוך מהדירוג המינימלי לאירוע.",
  below_min_age: "העובד/ת מתחת לגיל המינימלי לאירוע (או שחסר תאריך לידה).",
  overlap: "לעובד/ת משמרת חופפת באותו יום באירוע אחר.",
};

export const approvalArgsSchema = z.object({ employeeId: uuid });
