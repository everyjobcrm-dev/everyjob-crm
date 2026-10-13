"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { mapDbError } from "@/lib/events/errors";
import {
  rateArgsSchema,
  removeArgsSchema,
  scheduleArgsSchema,
  searchArgsSchema,
  transitionArgsSchema,
  type StaffTransitionAction,
} from "@/lib/validations/registration";
import { attendanceArgsSchema, shiftInstants, submissionReasonArgsSchema } from "@/lib/validations/hours";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : T))
  | { success: false; error: string };

// Staff registration actions. Every action re-verifies the caller's role from the database (AGENTS.md 5.2) and then
// calls a SECURITY DEFINER RPC that re-checks the role hierarchy, event scope (recruiter: own events only), the
// not-own-registration rule and the lock order itself (supabase/p3_m7*.sql). Direct table writes are blocked by
// trg_guard_event_registration_write, so these RPCs are the only write path.

function revalidateRoster(eventId: string) {
  revalidatePath(`/manager/events/${eventId}`);
  revalidatePath("/manager/events");
  revalidatePath("/admin/events");
}

async function transitionRegistration(
  eventId: string,
  registrationId: string,
  action: StaffTransitionAction,
  reason?: string,
): Promise<ActionResult> {
  const auth = await requireRole("recruiter");
  if (!auth.ok) return { success: false, error: auth.error };

  const args = transitionArgsSchema.safeParse({ eventId, registrationId, action, reason });
  if (!args.success) return { success: false, error: "בקשה לא תקינה." };

  const { error } = await auth.supabase.rpc("staff_transition_registration", {
    p_registration_id: args.data.registrationId,
    p_action: args.data.action,
    p_reason: args.data.reason || null,
  });
  if (error) {
    console.error(`[staff_transition_registration:${action}]`, error.code, error.message);
    return { success: false, error: mapDbError(error) };
  }

  revalidateRoster(args.data.eventId);
  return { success: true };
}

/** pending -> approved. */
export async function approveRegistration(eventId: string, registrationId: string): Promise<ActionResult> {
  return transitionRegistration(eventId, registrationId, "approve");
}

/** pending | waitlisted -> rejected (the person cannot re-apply to this event). */
export async function rejectRegistration(eventId: string, registrationId: string, reason?: string): Promise<ActionResult> {
  return transitionRegistration(eventId, registrationId, "reject", reason);
}

/** waitlisted -> approved, only while the role has capacity (pending + approved < headcount). */
export async function promoteWaitlist(eventId: string, registrationId: string): Promise<ActionResult> {
  return transitionRegistration(eventId, registrationId, "promote");
}

/** Approve a cancellation request -> 'cancelled' (may re-register); the DB promotes the next waitlisted person FIFO. */
export async function approveCancellation(eventId: string, registrationId: string): Promise<ActionResult> {
  return transitionRegistration(eventId, registrationId, "approve_cancellation");
}

/** Dismiss a cancellation request; the registration keeps its status. */
export async function rejectCancellation(eventId: string, registrationId: string): Promise<ActionResult> {
  return transitionRegistration(eventId, registrationId, "dismiss_cancellation");
}

/** Staff-initiated removal -> 'removed' (no self re-registration). A reason is mandatory. */
export async function removeScheduledEmployee(
  eventId: string,
  registrationId: string,
  reason: string,
): Promise<ActionResult> {
  const auth = await requireRole("recruiter");
  if (!auth.ok) return { success: false, error: auth.error };

  const args = removeArgsSchema.safeParse({ eventId, registrationId, reason });
  if (!args.success) return { success: false, error: args.error.issues[0]?.message ?? "בקשה לא תקינה." };

  const { error } = await auth.supabase.rpc("remove_scheduled_employee", {
    p_registration_id: args.data.registrationId,
    p_reason: args.data.reason,
  });
  if (error) {
    console.error("[remove_scheduled_employee]", error.code, error.message);
    return { success: false, error: mapDbError(error) };
  }

  revalidateRoster(args.data.eventId);
  return { success: true };
}

/** Place an employee directly as approved. Returns non-blocking warnings (below_min_rating, overlap). */
export async function scheduleEmployee(
  eventId: string,
  eventRoleId: string,
  employeeId: string,
): Promise<ActionResult<{ warnings: string[] }>> {
  const auth = await requireRole("recruiter");
  if (!auth.ok) return { success: false, error: auth.error };

  const args = scheduleArgsSchema.safeParse({ eventId, eventRoleId, employeeId });
  if (!args.success) return { success: false, error: "בקשה לא תקינה." };

  const { data, error } = await auth.supabase.rpc("schedule_employee", {
    p_event_role_id: args.data.eventRoleId,
    p_employee_id: args.data.employeeId,
  });
  if (error) {
    console.error("[schedule_employee]", error.code, error.message);
    if (error.message?.includes("not_eligible: age")) {
      return { success: false, error: "העובד/ת מתחת לגיל המינימלי לאירוע, או שחסר תאריך לידה בפרופיל." };
    }
    return { success: false, error: mapDbError(error, { uniqueMessage: "העובד/ת כבר רשום/ה לאירוע זה." }) };
  }

  const row = (Array.isArray(data) ? data[0] : data) as { warnings?: string[] | null } | null;
  revalidateRoster(args.data.eventId);
  return { success: true, warnings: row?.warnings ?? [] };
}

export type EmployeeSearchResult = {
  employeeId: string;
  name: string;
  phone: string | null;
  age: number | null;
  averageRating: number | null;
  registrationStatus: string | null;
};

/** Employee picker for scheduling (search_employees: name / phone match, employees only, no tz or email). */
export async function searchEmployeesForEvent(
  eventId: string,
  query: string,
): Promise<ActionResult<{ results: EmployeeSearchResult[] }>> {
  const auth = await requireRole("recruiter");
  if (!auth.ok) return { success: false, error: auth.error };

  const args = searchArgsSchema.safeParse({ eventId, query });
  if (!args.success) return { success: false, error: args.error.issues[0]?.message ?? "חיפוש לא תקין." };

  const { data, error } = await auth.supabase.rpc("search_employees", {
    p_query: args.data.query,
    p_event_id: args.data.eventId,
  });
  if (error) {
    console.error("[search_employees]", error.code, error.message);
    return { success: false, error: mapDbError(error, { fallback: "החיפוש נכשל." }) };
  }

  type Row = {
    employee_id: string;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    age_years: number | null;
    average_rating: number | null;
    registration_status: string | null;
  };
  // search_employees also returns every employee already registered to the event; keep only the query matches
  // (same rule as the RPC: name or phone contains the query, case-insensitive).
  const q = args.data.query.toLowerCase();
  const seen = new Set<string>();
  const results: EmployeeSearchResult[] = [];
  for (const r of (data ?? []) as Row[]) {
    const haystack = `${r.first_name ?? ""} ${r.last_name ?? ""}`.toLowerCase();
    if (!haystack.includes(q) && !(r.phone_number ?? "").includes(q)) continue;
    if (seen.has(r.employee_id)) continue;
    seen.add(r.employee_id);
    results.push({
      employeeId: r.employee_id,
      name: [r.first_name, r.last_name].filter(Boolean).join(" ") || "ללא שם",
      phone: r.phone_number,
      age: r.age_years,
      averageRating: r.average_rating,
      registrationStatus: r.registration_status,
    });
  }
  return { success: true, results };
}

export type SubmitShiftAttendanceInput = {
  registrationId: string;
  eventId: string;
  eventDate: string; // YYYY-MM-DD (event local date, Asia/Jerusalem)
  startTime: string; // HH:MM
  endTime: string; // HH:MM; at or before the start = next day
  reportedHours: number;
  rating?: number;
  notes?: string;
};

/**
 * Enter / re-enter a worker's hours (and optional rating) for approval - submit_shift_hours (p6_h2).
 * Manager and Admin only; the RPC re-checks role, scope, the event status/date, not-own-registration and the
 * approved-registration rule, writes the rating (DEFINER triggers keep profiles.average_rating) and the history row.
 */
export async function submitShiftAttendance(input: SubmitShiftAttendanceInput): Promise<ActionResult> {
  const auth = await requireRole("manager");
  if (!auth.ok) return { success: false, error: auth.error };

  const args = attendanceArgsSchema.safeParse(input);
  if (!args.success) return { success: false, error: args.error.issues[0]?.message ?? "פרטי הדיווח אינם תקינים." };

  const { start, end } = shiftInstants(args.data.eventDate, args.data.startTime, args.data.endTime);
  const { error } = await auth.supabase.rpc("submit_shift_hours", {
    p_registration_id: args.data.registrationId,
    p_reported_start: start,
    p_reported_end: end,
    p_reported_hours: args.data.reportedHours,
    p_rating: args.data.rating ?? null,
    p_notes: args.data.notes || null,
  });
  if (error) {
    console.error("[submit_shift_hours]", error.code, error.message);
    return { success: false, error: mapDbError(error, { fallback: "הגשת דוח השעות נכשלה." }) };
  }

  revalidateRoster(args.data.eventId);
  revalidatePath("/admin/hours");
  return { success: true };
}

/**
 * Void a pending or rejected hour report (Manager); Admin may also void approved reports from the admin screen.
 * void_shift_hours re-checks the role, the scope and the status rule; a reason is required.
 */
export async function voidShiftHoursAsManager(eventId: string, submissionId: string, reason: string): Promise<ActionResult> {
  const auth = await requireRole("manager");
  if (!auth.ok) return { success: false, error: auth.error };

  const args = submissionReasonArgsSchema.safeParse({ submissionId, reason });
  if (!args.success) return { success: false, error: args.error.issues[0]?.message ?? "בקשה לא תקינה." };

  const { error } = await auth.supabase.rpc("void_shift_hours", {
    p_submission_id: args.data.submissionId,
    p_reason: args.data.reason,
  });
  if (error) {
    console.error("[void_shift_hours]", error.code, error.message);
    return { success: false, error: mapDbError(error, { fallback: "ביטול דוח השעות נכשל." }) };
  }

  revalidateRoster(eventId);
  revalidatePath("/admin/hours");
  return { success: true };
}

/**
 * Employee hourly rate on an approved registration (set_registration_wage_rate).
 * Admin: any time. Manager: until the 10th (inclusive) of the month after the event, Asia/Jerusalem. Recruiter: never.
 * The window, the not-own-registration rule and the audit columns are enforced in the database.
 */
export async function setEmployeeRate(
  eventId: string,
  registrationId: string,
  wageRate: number,
): Promise<ActionResult> {
  const auth = await requireRole("manager");
  if (!auth.ok) return { success: false, error: auth.error };

  const args = rateArgsSchema.safeParse({ eventId, registrationId, wageRate });
  if (!args.success) return { success: false, error: args.error.issues[0]?.message ?? "יש להזין תעריף שעתי חיובי." };

  const { error } = await auth.supabase.rpc("set_registration_wage_rate", {
    p_registration_id: args.data.registrationId,
    p_wage_rate: args.data.wageRate,
  });
  if (error) {
    console.error("[set_registration_wage_rate]", error.code, error.message);
    return { success: false, error: mapDbError(error, { fallback: "עדכון התעריף נכשל." }) };
  }

  revalidateRoster(args.data.eventId);
  return { success: true };
}

// Recruitment-credit redemption is intentionally absent: the live recruiter_bonuses table uses applied_* columns and the
// FIFO redeem RPC is PROPOSED (supabase/p6_h6_redeem_credits.sql), not applied. The previous action wrote redeemed_*
// columns that do not exist.
