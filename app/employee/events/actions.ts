// app/employee/events/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type RegistrationStatus = "pending" | "approved" | "rejected" | "waitlisted" | "cancelled";

export type EmployeeEventRole = {
  id: string;
  roleName: string;
  startTime: string;
  endTime: string;
  headcount: number;
  filledCount: number;
  baseRate: number;
  myStatus: RegistrationStatus | null;
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
  end_time: string;
  base_rate: number | null;
};

type RawEvent = {
  id: string;
  location: string;
  event_date: string;
  notes: string | null;
  clients: { name: string } | null;
  event_roles: RawRole[] | null;
};

export async function fetchEligibleEvents(): Promise<EmployeeEvent[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: events, error } = await supabase
    .from("events")
    .select(
      `id, location, event_date, notes,
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

  const roleIds = events.flatMap((e) => (e.event_roles ?? []).map((r) => r.id));
  if (roleIds.length === 0) return [];

  const [{ data: fillCounts }, { data: myRegs }] = await Promise.all([
    supabase
      .from("event_role_fill_counts")
      .select("event_role_id, filled_count")
      .in("event_role_id", roleIds)
      .returns<{ event_role_id: string; filled_count: number }[]>(),
    supabase
      .from("event_registrations")
      .select("event_role_id, status")
      .eq("user_id", user.id)
      .in("event_role_id", roleIds)
      .returns<{ event_role_id: string; status: RegistrationStatus }[]>(),
  ]);

  const filledByRole = new Map((fillCounts ?? []).map((f) => [f.event_role_id, f.filled_count]));
  const myStatusByRole = new Map((myRegs ?? []).map((r) => [r.event_role_id, r.status]));

  return events
    .map((e): EmployeeEvent => ({
      id: e.id,
      clientName: e.clients?.name ?? "לקוח",
      location: e.location,
      eventDate: e.event_date,
      notes: e.notes,
      // roles without a rate yet aren't visible to employees (event is
      // effectively "pending_rates" for that role even if others are open)
      roles: (e.event_roles ?? [])
        .filter((r): r is RawRole & { base_rate: number } => r.base_rate != null)
        .map((r) => ({
          id: r.id,
          roleName: r.role_name,
          startTime: r.start_time,
          endTime: r.end_time,
          headcount: r.headcount,
          filledCount: filledByRole.get(r.id) ?? 0,
          baseRate: r.base_rate,
          myStatus: myStatusByRole.get(r.id) ?? null,
        })),
    }))
    .filter((e) => e.roles.length > 0);
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