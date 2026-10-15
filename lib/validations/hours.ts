import { z } from "zod";

// Hours flow (p6_h2 RPCs). Forms use the z.input / z.output split with the three-generic useForm (AGENTS.md 5.3).

const uuid = z.string().uuid("מזהה לא תקין");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "שעה לא תקינה");

export const attendanceSchema = z.object({
  startTime: hhmm,
  endTime: hhmm,
  reportedHours: z.coerce
    .number({ invalid_type_error: "יש להזין מספר שעות" })
    .positive("יש להזין מספר שעות חיובי")
    .max(24, "לא ניתן לדווח יותר מ-24 שעות"),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  notes: z.string().trim().max(1000, "ההערה ארוכה מדי").optional(),
});
export type AttendanceFormInput = z.input<typeof attendanceSchema>;
export type AttendanceFormOutput = z.output<typeof attendanceSchema>;

export const attendanceArgsSchema = attendanceSchema.extend({
  registrationId: uuid,
  eventId: uuid,
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
});

export const hoursReasonSchema = z.object({
  reason: z.string().trim().min(2, "יש להזין סיבה").max(500, "הסיבה ארוכה מדי"),
});
export type HoursReasonFormInput = z.input<typeof hoursReasonSchema>;
export type HoursReasonFormOutput = z.output<typeof hoursReasonSchema>;

export const submissionArgsSchema = z.object({ submissionId: uuid });
export const submissionReasonArgsSchema = hoursReasonSchema.extend({ submissionId: uuid });

/** Offset of Asia/Jerusalem from UTC (minutes) at the given instant - handles IST/IDT. */
function jerusalemOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** "YYYY-MM-DD" + "HH:MM" in Asia/Jerusalem -> ISO instant. */
export function jerusalemLocalToIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naiveUtc = Date.UTC(y, m - 1, d, hh, mm);
  const offset = jerusalemOffsetMinutes(new Date(naiveUtc));
  return new Date(naiveUtc - offset * 60000).toISOString();
}

/** Start / end instants for a shift; an end at or before the start is on the next day (overnight shift). */
export function shiftInstants(eventDate: string, startTime: string, endTime: string): { start: string; end: string } {
  const start = jerusalemLocalToIso(eventDate, startTime);
  let end = jerusalemLocalToIso(eventDate, endTime);
  if (new Date(end).getTime() <= new Date(start).getTime()) {
    end = new Date(new Date(end).getTime() + 24 * 3600 * 1000).toISOString();
  }
  return { start, end };
}

// Recruitment-credit redemption (redeem_recruiter_credits, p6_h6v2)
export const redeemCreditsSchema = z.object({
  count: z.coerce.number({ invalid_type_error: "יש להזין מספר" }).int("יש להזין מספר שלם").min(1, "יש לבחור לפחות זיכוי אחד").max(1000),
});
export type RedeemCreditsFormInput = z.input<typeof redeemCreditsSchema>;
export type RedeemCreditsFormOutput = z.output<typeof redeemCreditsSchema>;
export const redeemArgsSchema = redeemCreditsSchema.extend({ eventId: uuid });
