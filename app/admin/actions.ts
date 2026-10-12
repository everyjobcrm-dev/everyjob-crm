"use server";

import { revalidatePath } from "next/cache";
import { requireRole, type AuthOk } from "@/lib/auth/guards";
import { canCreateEvents, canManageEvent } from "@/lib/auth/permissions";
import { createEventSchema, type CreateEventInput } from "@/lib/validations/event";
import {
  allowedEventTransitions,
  defaultRestoreStatus,
  isEventStatus,
  isFrozenStatus,
  type EventStatus,
} from "@/lib/events/status";
import { mapDbError } from "@/lib/events/errors";

// All Admin-role (and event-management) server actions live in this file (AGENTS.md 5.5).
// Every action re-verifies the caller's role from the database via requireRole() (AGENTS.md 5.2);
// the hierarchy itself is defined once in lib/auth/permissions.ts and mirrored by DB triggers/RLS.

type ActionResult<T extends object = object> = ({ success: true } & T) | { success: false; error: string };

function fail(error: string): { success: false; error: string } {
  return { success: false, error };
}

function revalidateEventViews() {
  revalidatePath("/admin/events");
  revalidatePath("/admin/dashboard");
  revalidatePath("/manager/events");
  revalidatePath("/employee/events");
  revalidatePath("/employee/shifts");
}

// ── Events ───────────────────────────────────────────────────────────────

// address is included so CreateEventForm can prefill location from it
export type ClientOption = {
  id: string;
  name: string;
  address: string | null;
};

export type EventRoleView = {
  id: string;
  roleName: string;
  headcount: number;
  filledCount: number;
  baseRate: number | null;
};

export type ClosureFinancials = {
  totalHoursReported: number;
  travelPaidToWorkers: number;
  travelChargedToClient: number;
  actualIncome: number;
  actualExpense: number;
};

export type AdminEvent = {
  id: string;
  clientName: string;
  location: string;
  eventDate: string;
  startTime: string;
  endTime: string | null; // unknown until closure
  minRating: number | null;
  travelBudgetPerWorker: number | null;
  status: EventStatus;
  cancelledFromStatus: string | null;
  recruiterId: string | null;
  roles: EventRoleView[];
  closure: ClosureFinancials | null;
};

export async function fetchClients(): Promise<ClientOption[]> {
  const auth = await requireRole("recruiter");
  if (!auth.ok) return [];

  const { data, error } = await auth.supabase.from("clients").select("id, name, address").order("name");

  if (error) {
    console.error("[fetchClients]", error.message);
    return [];
  }
  return data ?? [];
}

type RawEventRole = {
  id: string;
  role_name: string;
  headcount: number;
  base_rate: number | null;
};

type RawEventClosure = {
  total_hours_reported: number;
  travel_paid_to_workers: number;
  travel_charged_to_client: number;
  actual_income: number;
  actual_expense: number;
};

type RawEventRow = {
  id: string;
  location: string;
  event_date: string;
  start_time: string;
  status: EventStatus;
  cancelled_from_status: string | null;
  recruiter_id: string | null;
  min_rating: number | null;
  travel_budget_per_worker: number | null;
  clients: { name: string } | null;
  event_roles: RawEventRole[] | null;
  event_closures: RawEventClosure | null;
};

export async function fetchEvents(): Promise<AdminEvent[]> {
  const auth = await requireRole("manager");
  if (!auth.ok) return [];

  const { data: events, error } = await auth.supabase
    .from("events")
    .select(
      `id, location, event_date, start_time, status, cancelled_from_status, recruiter_id, min_rating, travel_budget_per_worker,
      clients ( name ),
      event_roles ( id, role_name, headcount, base_rate ),
      event_closures ( total_hours_reported, travel_paid_to_workers, travel_charged_to_client, actual_income, actual_expense )`,
    )
    .order("event_date", { ascending: false })
    .returns<RawEventRow[]>();

  if (error || !events) {
    console.error("[fetchEvents]", error?.message);
    return [];
  }

  // Staffing is DERIVED from the view (pending + approved); cancelled events have no rows in it (AGENTS.md 5.1).
  const { data: fillCounts } = await auth.supabase
    .from("event_role_fill_counts")
    .select("event_role_id, filled_count")
    .returns<{ event_role_id: string; filled_count: number }[]>();

  const filledByRole = new Map((fillCounts ?? []).map((f) => [f.event_role_id, f.filled_count]));

  return events.map(
    (e): AdminEvent => ({
      id: e.id,
      clientName: e.clients?.name ?? "לקוח לא ידוע",
      location: e.location,
      eventDate: e.event_date,
      startTime: e.start_time,
      endTime: null, // events has no end_time; derive MAX(event_roles.end_time) when needed
      minRating: e.min_rating,
      travelBudgetPerWorker: e.travel_budget_per_worker,
      status: e.status,
      cancelledFromStatus: e.cancelled_from_status,
      recruiterId: e.recruiter_id,
      roles: (e.event_roles ?? []).map(
        (r): EventRoleView => ({
          id: r.id,
          roleName: r.role_name,
          headcount: r.headcount,
          filledCount: filledByRole.get(r.id) ?? 0,
          baseRate: r.base_rate,
        }),
      ),
      closure: e.event_closures
        ? {
            totalHoursReported: e.event_closures.total_hours_reported,
            travelPaidToWorkers: e.event_closures.travel_paid_to_workers,
            travelChargedToClient: e.event_closures.travel_charged_to_client,
            actualIncome: e.event_closures.actual_income,
            actualExpense: e.event_closures.actual_expense,
          }
        : null,
    }),
  );
}

/**
 * Create an event. Admin and Manager always; a Recruiter only with profiles.can_create_events.
 * events.recruiter_id is set by the database (forced to the creator for a recruiter, NULL for admin/manager).
 */
export async function createEvent(
  input: CreateEventInput,
): Promise<ActionResult<{ eventId: string; status: "pending_rates" | "open" }>> {
  const auth = await requireRole("recruiter");
  if (!auth.ok) return fail(auth.error);
  if (!canCreateEvents(auth.profile)) {
    return fail("אין לך הרשאה ליצור אירועים. פנה/י למנהל/ת המערכת.");
  }

  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "נתונים לא תקינים");
  }
  const { roles, ...event } = parsed.data;

  const missingRates = roles.some((r) => r.base_rate == null);
  const status: "pending_rates" | "open" = missingRates ? "pending_rates" : "open";

  const { data: eventRow, error: eventError } = await auth.supabase
    .from("events")
    .insert({
      client_id: event.client_id,
      event_date: event.event_date,
      start_time: event.start_time,
      location: event.location,
      notes: event.notes || null,
      dress_code: event.dress_code || null,
      min_age: event.min_age ?? null,
      min_rating: event.min_rating ?? null,
      travel_budget_per_worker: event.travel_budget_per_worker ?? 0,
      status,
    })
    .select("id")
    .single();

  if (eventError || !eventRow) {
    console.error("[createEvent] event insert failed", eventError?.message);
    return fail(mapDbError(eventError, { fallback: "יצירת האירוע נכשלה. נסה/י שוב." }));
  }

  const rolesPayload = roles.map((r) => ({
    event_id: eventRow.id,
    role_name: r.role_name,
    headcount: r.headcount,
    start_time: r.start_time,
    end_time: r.end_time ?? null,
    base_rate: r.base_rate ?? null,
  }));

  const { error: rolesError } = await auth.supabase.from("event_roles").insert(rolesPayload);

  if (rolesError) {
    console.error("[createEvent] role insert failed, rolling back event", rolesError.message);
    // Deleting an event is Admin-only. Anyone else cannot delete (RLS affects 0 rows), so cancel it instead
    // - a cancelled event is hidden from employees and excluded from every derived calculation.
    const { data: deleted } = await auth.supabase.from("events").delete().eq("id", eventRow.id).select("id");
    if (!deleted?.length) {
      await auth.supabase.from("events").update({ status: "cancelled" }).eq("id", eventRow.id);
    }
    return fail("שמירת התפקידים נכשלה, האירוע לא נוצר.");
  }

  revalidateEventViews();
  return { success: true, eventId: eventRow.id, status };
}

async function applyEventStatus(auth: AuthOk, eventId: string, status: EventStatus): Promise<ActionResult> {
  const { data: event } = await auth.supabase
    .from("events")
    .select("id, status, recruiter_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || !isEventStatus(event.status)) return fail("האירוע לא נמצא.");
  if (!canManageEvent(auth.profile, event)) return fail("אין לך הרשאה לנהל אירוע זה.");

  const allowed = allowedEventTransitions(auth.role, event.status, event.recruiter_id === auth.userId);
  if (!allowed.includes(status)) {
    return fail(
      isFrozenStatus(event.status) || isFrozenStatus(status)
        ? mapDbError({ message: "status_frozen" })
        : mapDbError({ message: "forbidden_transition" }),
    );
  }

  // The database trigger is the authority; this pre-check only gives clean errors.
  const { data, error } = await auth.supabase.from("events").update({ status }).eq("id", eventId).select("id");

  if (error) return fail(mapDbError(error, { fallback: "עדכון הסטטוס נכשל." }));
  if (!data?.length) return fail("העדכון לא בוצע - האירוע לא נמצא או שאין לך הרשאה.");

  revalidateEventViews();
  return { success: true };
}

/**
 * Change an event's registration status. Admin/Manager: any event; Recruiter: own events only.
 * completed and paused are frozen (no transition in or out through the app). Rules mirror the DB trigger.
 */
export async function updateEventStatus(eventId: string, status: EventStatus): Promise<ActionResult> {
  const auth = await requireRole("recruiter");
  if (!auth.ok) return fail(auth.error);
  if (!isEventStatus(status)) return fail("סטטוס לא תקין.");
  return applyEventStatus(auth, eventId, status);
}

/**
 * Restore a cancelled event (Admin/Manager only). Default target = events.cancelled_from_status
 * (null / completed / paused -> 'closed'). Moving to open/closed still requires every role to have a rate.
 */
export async function restoreEvent(eventId: string, target?: EventStatus): Promise<ActionResult> {
  const auth = await requireRole("manager");
  if (!auth.ok) return fail(auth.error);

  const { data: event } = await auth.supabase
    .from("events")
    .select("status, cancelled_from_status")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || event.status !== "cancelled") return fail("ניתן לשחזר רק אירוע שבוטל.");
  return applyEventStatus(auth, eventId, target ?? defaultRestoreStatus(event.cancelled_from_status));
}

/** Admin only. Events that already have audit history (registration_status_history) cannot be deleted - cancel them. */
export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const auth = await requireRole("admin");
  if (!auth.ok) return fail(auth.error);

  const { data, error } = await auth.supabase.from("events").delete().eq("id", eventId).select("id");

  if (error) {
    if (error.code === "23503") {
      return fail("לא ניתן למחוק אירוע שקיימת לו היסטוריית שיבוץ. ניתן לבטל אותו במקום.");
    }
    return fail(mapDbError(error, { fallback: "מחיקת האירוע נכשלה." }));
  }
  if (!data?.length) return fail("המחיקה לא בוצעה - האירוע לא נמצא או שאין לך הרשאה.");

  revalidateEventViews();
  return { success: true };
}

// ── Users ────────────────────────────────────────────────────────────────

export async function updateUserRole(
  userId: string,
  role: "admin" | "manager" | "employee" | "recruiter",
): Promise<ActionResult> {
  const auth = await requireRole("admin");
  if (!auth.ok) return fail(auth.error);

  if (userId === auth.userId && role !== "admin") {
    return fail("לא ניתן להסיר הרשאת מנהל מהחשבון שלך.");
  }

  const { error } = await auth.supabase.from("profiles").update({ role }).eq("id", userId);

  if (error) {
    return fail(mapDbError(error, { fallback: "עדכון ההרשאה נכשל." }));
  }

  revalidatePath("/admin/employees");
  return { success: true };
}

export async function approveForm101(userId: string): Promise<ActionResult> {
  const auth = await requireRole("admin");
  if (!auth.ok) return fail(auth.error);

  const { error } = await auth.supabase.from("profiles").update({ form_101_status: "complete" }).eq("id", userId);

  if (error) {
    return fail("אישור הטופס נכשל.");
  }

  revalidatePath("/admin/employees");
  return { success: true };
}

export async function broadcastMessage(title: string, body: string): Promise<ActionResult> {
  const auth = await requireRole("admin");
  if (!auth.ok) return fail(auth.error);

  if (!title.trim() || !body.trim()) {
    return fail("יש למלא כותרת ותוכן.");
  }

  const { error } = await auth.supabase.from("announcements").insert({
    title: title.trim(),
    body: body.trim(),
    created_by: auth.userId,
  });

  if (error) {
    return fail("שליחת ההודעה נכשלה.");
  }

  revalidatePath("/employee/dashboard");
  return { success: true };
}

// ── Phase 1.3: Shift Hours Approval (Admin only; the hours flow is being reworked in a separate session) ──

export type ShiftSubmission = {
  submission_id: string;
  submission_status: "pending" | "approved" | "rejected";
  reported_hours: number;
  reported_start: string;
  reported_end: string;
  performance_rating: number | null;
  submitted_at: string;
  event_date: string;
  location: string;
  employee_name: string;
  employee_tz: string;
  submitted_by_name: string;
};

// Fetch submissions from the admin-only view. Admin only (F21): the view exposes employee ת"ז.
export async function getShiftSubmissions() {
  const auth = await requireRole("admin");
  if (!auth.ok) return { success: false as const, error: auth.error };

  const { data, error } = await auth.supabase
    .from("v_shift_submissions_dashboard")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) return { success: false as const, error: "טעינת דוחות השעות נכשלה." };

  return { success: true as const, data: data as ShiftSubmission[] };
}

export type RecruiterPendingCredits = {
  recruiter_id: string;
  first_name: string;
  last_name: string;
  recruiter_bonus_rate: number | null;
  pending_recruitment_count: number;
  pending_recruitment_amount: number;
};

export async function getRecruiterPendingCredits() {
  const auth = await requireRole("admin");
  if (!auth.ok) return { success: false as const, error: auth.error };

  const { data, error } = await auth.supabase
    .from("v_recruiter_pending_credits")
    .select("recruiter_id, first_name, last_name, recruiter_bonus_rate, pending_recruitment_count, pending_recruitment_amount")
    .order("last_name", { ascending: true });

  if (error) return { success: false as const, error: "טעינת נתוני המגייסים נכשלה." };
  return { success: true as const, data: (data ?? []) as RecruiterPendingCredits[] };
}

export async function setRecruiterBonusRate(
  recruiterId: string,
  recruiterBonusRate: number,
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await requireRole("admin");
  if (!auth.ok) return fail("רק אדמין יכול לעדכן תעריף זיכוי גיוס.");

  if (!Number.isFinite(recruiterBonusRate) || recruiterBonusRate < 0) {
    return fail("יש להזין תעריף זיכוי שאינו שלילי.");
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update({ recruiter_bonus_rate: recruiterBonusRate })
    .eq("id", recruiterId)
    .eq("role", "recruiter");

  if (error) return fail("עדכון תעריף הזיכוי נכשל.");
  revalidatePath("/admin/recruiters");
  return { success: true };
}

// State machine for Admin to approve/reject (Pending -> Approved / Rejected)
export async function reviewShiftSubmission(
  submissionId: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
) {
  const auth = await requireRole("admin");
  if (!auth.ok) return { success: false as const, error: auth.error };

  if (status === "rejected" && (!rejectionReason || rejectionReason.trim() === "")) {
    return { success: false as const, error: "יש להזין סיבת דחייה." };
  }

  const { data: current } = await auth.supabase
    .from("shift_hour_submissions")
    .select("id, status, employee_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (!current) return { success: false as const, error: "דוח השעות לא נמצא." };
  if (current.status !== "pending") {
    return { success: false as const, error: "ניתן לסקור רק דוחות שממתינים לאישור." };
  }
  // App-level guard: nobody approves hours they worked themselves (a DB constraint is part of the deferred hours flow).
  if (current.employee_id === auth.userId) {
    return { success: false as const, error: "לא ניתן לאשר או לדחות דוח שעות של עצמך." };
  }

  const updatePayload: {
    status: "approved" | "rejected";
    reviewed_by: string;
    reviewed_at: string;
    rejection_reason?: string;
  } = {
    status,
    reviewed_by: auth.userId,
    reviewed_at: new Date().toISOString(),
  };
  if (status === "rejected") updatePayload.rejection_reason = rejectionReason!.trim();

  const { data, error } = await auth.supabase
    .from("shift_hour_submissions")
    .update(updatePayload)
    .eq("id", submissionId)
    .select("id");

  if (error) return { success: false as const, error: mapDbError(error, { fallback: "עדכון הסטטוס נכשל." }) };
  // An RLS-filtered update returns no error and no rows; report it instead of a false success.
  if (!data?.length) {
    return { success: false as const, error: "העדכון לא בוצע (אין הרשאת עדכון בבסיס הנתונים לדוחות שעות)." };
  }

  revalidatePath("/admin");
  return { success: true as const };
}
