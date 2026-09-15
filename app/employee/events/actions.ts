// app/employee/events/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type RegistrationStatus = "pending" | "approved" | "rejected" | "waitlisted" | "cancelled";

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
    if (error.message.includes("already_registered")) {
      return { success: false, error: "כבר נרשמת לתפקיד זה." };
    }
    if (error.message.includes("not_eligible: age")) {
      return { success: false, error: "לא ניתן להירשם: יש לעדכן תאריך לידה ולעמוד בגיל המינימלי לאירוע." };
    }
    if (error.message.includes("not_eligible: rating")) {
      return { success: false, error: "לא ניתן להירשם: הדירוג שלך נמוך מהדירוג המינימלי לאירוע." };
    }
    if (error.message.includes("not_eligible: role_skill")) {
      return { success: false, error: "לא ניתן להירשם: הרשאת התפקיד שלך עדיין לא הוגדרה במערכת." };
    }
    if (error.message.includes("not_eligible")) {
      return { success: false, error: "אינך עומד/ת בתנאי הקבלה למשמרת זו." };
    }
    if (error.message.includes("not_open")) {
      return { success: false, error: "האירוע אינו פתוח להרשמה יותר." };
    }
    return { success: false, error: "ההרשמה נכשלה. נסה/י שוב." };
  }

  revalidatePath("/employee/events");
  return { success: true, status: data.status };
}

export async function requestCancellation(registrationId: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "שגיאת תצורה בשרת." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "לא מחובר/ת למערכת." };

  const { error } = await supabase
    .from("event_registrations")
    .update({ cancellation_requested_at: new Date().toISOString() })
    .eq("id", registrationId)
    .eq("user_id", user.id)
    .not("status", "in", '("cancelled","no_show")');

  if (error) {
    console.error("[requestCancellation]", error.message);
    return { success: false, error: "שגיאה בבקשת הביטול. ייתכן והמשמרת כבר בוטלה." };
  }

  revalidatePath("/employee/events");
  return { success: true };
}
