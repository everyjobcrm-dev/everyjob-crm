// app/employee/events/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/guards";
import { mapDbError } from "@/lib/events/errors";
import { cancellationArgsSchema } from "@/lib/validations/registration";

export type RegistrationStatus = "pending" | "approved" | "rejected" | "waitlisted" | "cancelled" | "removed";

export type EmployeeEventRole = {
  id: string;
  roleName: string;
  startTime: string;
  endTime: string | null;
  headcount: number;
  filledCount: number;
  baseRate: number;
  myStatus: RegistrationStatus | null;
  registrationId: string | null;
  cancellationRequestedAt: string | null;
};

export type EmployeeEvent = {
  id: string;
  clientName: string;
  location: string;
  eventDate: string;
  notes: string | null;
  roles: EmployeeEventRole[];
};

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : T))
  | { success: false; error: string };

type RawRole = {
  id: string;
  role_name: string;
  headcount: number;
  start_time: string;
  end_time: string | null;
  base_rate: number | null;
};

type RawEvent = {
  id: string;
  location: string;
  event_date: string;
  notes: string | null;
  min_age: number | null;
  min_rating: number | null;
  clients: { name: string } | null;
  event_roles: RawRole[] | null;
};

function getAge(birthDate: string): number | null {
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  if (!birthYear || !birthMonth || !birthDay) return null;

  const today = new Date();
  let age = today.getUTCFullYear() - birthYear;
  const birthdayPassed =
    today.getUTCMonth() + 1 > birthMonth ||
    (today.getUTCMonth() + 1 === birthMonth && today.getUTCDate() >= birthDay);
  if (!birthdayPassed) age -= 1;
  return age;
}

function jerusalemToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

export async function fetchEligibleEvents(): Promise<EmployeeEvent[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("birth_date, average_rating")
    .eq("id", user.id)
    .single<{ birth_date: string | null; average_rating: number | null }>();

  if (profileError || !profile) {
    console.error("[fetchEligibleEvents] profile lookup failed", profileError?.message);
    return [];
  }

  const employeeAge = profile.birth_date ? getAge(profile.birth_date) : null;
  const employeeRating = profile.average_rating ?? 0;

  const { data: events, error } = await supabase
    .from("events")
    .select(
      `id, location, event_date, notes, min_age, min_rating,
       clients ( name ),
       event_roles ( id, role_name, headcount, start_time, end_time, base_rate )`
    )
    .eq("status", "open")
    // past events are never offered for registration (register_for_event_role refuses them too)
    .gte("event_date", jerusalemToday())
    .order("event_date", { ascending: true })
    .returns<RawEvent[]>();

  if (error || !events) {
    console.error("[fetchEligibleEvents]", error?.message);
    return [];
  }

  const eligibleEvents = events.filter((event) => {
    const meetsAgeRequirement =
      event.min_age == null || (employeeAge != null && employeeAge >= event.min_age);
    const meetsRatingRequirement =
      event.min_rating == null || employeeRating >= event.min_rating;
    return meetsAgeRequirement && meetsRatingRequirement;
  });

  const roleIds = eligibleEvents.flatMap((event) => (event.event_roles ?? []).map((role) => role.id));
  if (roleIds.length === 0) return [];

  const [{ data: fillCounts }, { data: myRegs }] = await Promise.all([
    supabase
      .from("event_role_fill_counts")
      .select("event_role_id, filled_count")
      .in("event_role_id", roleIds)
      .returns<{ event_role_id: string; filled_count: number }[]>(),
    supabase
      .from("event_registrations")
      .select("id, event_role_id, status, cancellation_requested_at")
      .eq("user_id", user.id)
      .in("event_role_id", roleIds)
      .returns<{ id: string; event_role_id: string; status: RegistrationStatus; cancellation_requested_at: string | null }[]>(),
  ]);

  const filledByRole = new Map((fillCounts ?? []).map((fill) => [fill.event_role_id, fill.filled_count]));
  const myStatusByRole = new Map((myRegs ?? []).map((registration) => [
    registration.event_role_id,
    {
      status: registration.status,
      id: registration.id,
      cancellationRequestedAt: registration.cancellation_requested_at,
    },
  ]));

  return eligibleEvents
    .map((event): EmployeeEvent => ({
      id: event.id,
      clientName: event.clients?.name ?? "לקוח",
      location: event.location,
      eventDate: event.event_date,
      notes: event.notes,
      roles: (event.event_roles ?? [])
        .filter((role): role is RawRole & { base_rate: number } => role.base_rate != null)
        .map((role) => {
          const myReg = myStatusByRole.get(role.id);
          return {
            id: role.id,
            roleName: role.role_name,
            startTime: role.start_time,
            endTime: role.end_time,
            headcount: role.headcount,
            filledCount: filledByRole.get(role.id) ?? 0,
            baseRate: role.base_rate,
            myStatus: myReg?.status ?? null,
            registrationId: myReg?.id ?? null,
            cancellationRequestedAt: myReg?.cancellationRequestedAt ?? null,
          };
        }),
    }))
    .filter((event) => event.roles.length > 0);
}

export async function registerForRole(
  eventRoleId: string
): Promise<ActionResult<{ status: RegistrationStatus }>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "שגיאת תצורה בשרת." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "לא מחובר/ת למערכת." };

  const { data, error } = await supabase
    .rpc("register_for_event_role", { p_event_role_id: eventRoleId })
    .single<{ status: RegistrationStatus }>();

  if (error) {
    console.error("[registerForRole]", error.message);
    // 23505 (unique_violation) = already registered for this event (AGENTS.md 5.4); 40P01/40001 -> "try again".
    return {
      success: false,
      error: mapDbError(error, { uniqueMessage: "כבר נרשמת לאירוע זה.", fallback: "ההרשמה נכשלה. נסה/י שוב." }),
    };
  }

  revalidatePath("/employee/events");
  return { success: true, status: data.status };
}

/**
 * Raise a cancellation REQUEST on the caller's own registration (never a direct cancel - AGENTS.md 6).
 * Calls request_registration_cancellation (SECURITY DEFINER): own row only, active status, open/closed event,
 * not a past event, one open request at a time; writes history 'cancellation_requested'. Staff then approve or dismiss.
 * Any signed-in role may call it (staff-as-worker included); the caller's identity comes from the session, never input.
 */
export async function requestCancellation(registrationId: string, reason?: string): Promise<ActionResult> {
  const auth = await getAuthContext();
  if (!auth.ok) return { success: false, error: auth.error };

  const args = cancellationArgsSchema.safeParse({ registrationId, reason });
  if (!args.success) return { success: false, error: args.error.issues[0]?.message ?? "בקשה לא תקינה." };

  const { error } = await auth.supabase.rpc("request_registration_cancellation", {
    p_registration_id: args.data.registrationId,
    p_reason: args.data.reason || null,
  });

  if (error) {
    console.error("[requestCancellation]", error.code, error.message);
    return { success: false, error: mapDbError(error, { fallback: "שגיאה בבקשת הביטול. נסה/י שוב." }) };
  }

  revalidatePath("/employee/events");
  revalidatePath("/employee/shifts");
  return { success: true };
}

export type MyShift = {
  registrationId: string;
  status: RegistrationStatus | "no_show" | string;
  cancellationRequestedAt: string | null;
  registeredAt: string;
  eventId: string;
  eventDate: string;
  eventStatus: string;
  location: string;
  clientName: string;
  roleName: string | null;
  startTime: string | null;
  endTime: string | null;
  // own hour report (RLS shs_select_own); voided reports are treated as absent
  hoursStatus: "pending" | "approved" | "rejected" | null;
  reportedHours: number | null;
};

/**
 * The caller's own registrations (RLS: user_id = auth.uid()) with their event and role. Registrations of
 * cancelled events are excluded - a cancelled event is excluded everywhere (AGENTS.md 6.1).
 */
export async function fetchMyShifts(): Promise<{ shifts: MyShift[]; today: string }> {
  const today = jerusalemToday();
  const auth = await getAuthContext();
  if (!auth.ok) return { shifts: [], today };

  type Raw = {
    id: string;
    status: string;
    cancellation_requested_at: string | null;
    created_at: string;
    events: { id: string; event_date: string; status: string; location: string; clients: { name: string } | null } | null;
    event_roles: { role_name: string; start_time: string | null; end_time: string | null } | null;
    shift_hour_submissions:
      | { status: string; reported_hours: number; voided_at: string | null }
      | { status: string; reported_hours: number; voided_at: string | null }[]
      | null;
  };

  const { data, error } = await auth.supabase
    .from("event_registrations")
    .select(
      `id, status, cancellation_requested_at, created_at,
       events ( id, event_date, status, location, clients ( name ) ),
       event_roles ( role_name, start_time, end_time ),
       shift_hour_submissions ( status, reported_hours, voided_at )`,
    )
    .eq("user_id", auth.userId)
    .returns<Raw[]>();

  if (error) {
    console.error("[fetchMyShifts]", error.message);
    return { shifts: [], today };
  }

  const shifts = (data ?? [])
    .filter((r) => r.events && r.events.status !== "cancelled")
    .map((r): MyShift => ({
      registrationId: r.id,
      status: r.status,
      cancellationRequestedAt: r.cancellation_requested_at,
      registeredAt: r.created_at,
      eventId: r.events!.id,
      eventDate: r.events!.event_date,
      eventStatus: r.events!.status,
      location: r.events!.location,
      clientName: r.events!.clients?.name ?? "לקוח",
      roleName: r.event_roles?.role_name ?? null,
      startTime: r.event_roles?.start_time ?? null,
      endTime: r.event_roles?.end_time ?? null,
      ...hoursOf(r.shift_hour_submissions),
    }))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  return { shifts, today };
}

type RawSubmission = { status: string; reported_hours: number; voided_at: string | null };

function hoursOf(raw: RawSubmission | RawSubmission[] | null): Pick<MyShift, "hoursStatus" | "reportedHours"> {
  const sub = Array.isArray(raw) ? raw[0] : raw;
  if (!sub || sub.voided_at) return { hoursStatus: null, reportedHours: null };
  const status = sub.status === "approved" || sub.status === "rejected" ? sub.status : "pending";
  return { hoursStatus: status, reportedHours: Number(sub.reported_hours) };
}

export type MyMonthlyHours = {
  month: string; // YYYY-MM-01
  approvedHours: number;
  estimatedPay: number;
  shiftsWithoutRate: number;
};

/** Own approved hours and estimated pay per month - derived by the view v_my_monthly_hours (security_invoker + RLS). */
export async function fetchMyMonthlyHours(): Promise<MyMonthlyHours[]> {
  const auth = await getAuthContext();
  if (!auth.ok) return [];
  const { data, error } = await auth.supabase
    .from("v_my_monthly_hours")
    .select("month, approved_hours, estimated_pay, shifts_without_rate")
    .eq("employee_id", auth.userId)
    .order("month", { ascending: false })
    .limit(6);
  if (error) {
    console.error("[fetchMyMonthlyHours]", error.message);
    return [];
  }
  return ((data ?? []) as { month: string; approved_hours: number; estimated_pay: number | null; shifts_without_rate: number }[]).map(
    (r) => ({
      month: r.month,
      approvedHours: Number(r.approved_hours ?? 0),
      estimatedPay: Number(r.estimated_pay ?? 0),
      shiftsWithoutRate: Number(r.shifts_without_rate ?? 0),
    }),
  );
}
