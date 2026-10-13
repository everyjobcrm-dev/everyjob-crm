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

/** Hebrew labels for schedule_employee's non-blocking warnings. */
export const SCHEDULE_WARNING_LABEL: Record<string, string> = {
  below_min_rating: "דירוג העובד/ת נמוך מהדירוג המינימלי לאירוע.",
  overlap: "לעובד/ת משמרת חופפת באותו יום באירוע אחר.",
};
