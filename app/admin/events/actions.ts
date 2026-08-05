  "use server";

  import { revalidatePath } from "next/cache";
  import { createServerSupabaseClient } from "@/lib/supabase/server";
  import { createEventSchema, type CreateEventInput } from "@/lib/validations/event";
  import { getCurrentProfile, canCreateEvents } from "@/lib/auth/permissions";

  // address is included so CreateEventForm can prefill location from it
  export type ClientOption = { 
    id: string; 
    name: string;
    address: string | null;
  };

  type ActionResult<T = undefined> =
    | ({ success: true } & (T extends undefined ? object : T))
    | { success: false; error: string };

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
    status: "pending_rates" | "open" | "closed" | "completed" | "cancelled";
    roles: EventRoleView[];
    closure: ClosureFinancials | null;
  };

  async function requirePermission() {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return { ok: false as const, error: "אין הרשאה. יש להתחבר מחדש." };

    const profile = await getCurrentProfile();
    if (!canCreateEvents(profile)) {
      return { ok: false as const, error: "אין לך הרשאה לבצע פעולה זו. פנה/י למנהל/ת המערכת." };
    }
    return { ok: true as const, supabase, profile };
  }

  export async function fetchClients(): Promise<ClientOption[]> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return [];

    // הוספנו את ה-address לשאילתה!
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, address")
      .order("name");
      
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
  // end_time removed from here
  status: AdminEvent["status"];
  min_rating: number | null;
  travel_budget_per_worker: number | null;
  clients: { name: string } | null;
  event_roles: RawEventRole[] | null;
  event_closures: RawEventClosure | null;
};

export async function fetchEvents(): Promise<AdminEvent[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: events, error } = await supabase
    .from("events")
    .select(
      // Removed end_time from this select string
      `id, location, event_date, start_time, status, min_rating, travel_budget_per_worker,
      clients ( name ),
      event_roles ( id, role_name, headcount, base_rate ),
      event_closures ( total_hours_reported, travel_paid_to_workers, travel_charged_to_client, actual_income, actual_expense )`
    )
    .order("event_date", { ascending: false })
    .returns<RawEventRow[]>();

  if (error || !events) {
    console.error("[fetchEvents]", error?.message);
    return [];
  }

  const { data: fillCounts } = await supabase
    .from("event_role_fill_counts")
    .select("event_role_id, filled_count")
    .returns<{ event_role_id: string; filled_count: number }[]>();

  const filledByRole = new Map((fillCounts ?? []).map((f) => [f.event_role_id, f.filled_count]));

  return events.map((e): AdminEvent => ({
    id: e.id,
    clientName: e.clients?.name ?? "לקוח לא ידוע",
    location: e.location,
    eventDate: e.event_date,
    startTime: e.start_time,
    endTime: null, // Hardcoded to null since it doesn't exist on the events table
    minRating: e.min_rating,
    travelBudgetPerWorker: e.travel_budget_per_worker,
    status: e.status,
    roles: (e.event_roles ?? []).map((r): EventRoleView => ({
      id: r.id,
      roleName: r.role_name,
      headcount: r.headcount,
      filledCount: filledByRole.get(r.id) ?? 0,
      baseRate: r.base_rate,
    })),
    closure: e.event_closures
      ? {
          totalHoursReported: e.event_closures.total_hours_reported,
          travelPaidToWorkers: e.event_closures.travel_paid_to_workers,
          travelChargedToClient: e.event_closures.travel_charged_to_client,
          actualIncome: e.event_closures.actual_income,
          actualExpense: e.event_closures.actual_expense,
        }
      : null,
  }));
}

  export async function createEvent(
    input: CreateEventInput
  ): Promise<ActionResult<{ eventId: string; status: "pending_rates" | "open" }>> {
    const auth = await requirePermission();
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = createEventSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "נתונים לא תקינים" };
    }
    const { roles, ...event } = parsed.data;

    const missingRates = roles.some((r) => r.base_rate == null);
    const status: "pending_rates" | "open" = missingRates ? "pending_rates" : "open";
    const spotsTotal = roles.reduce((sum, r) => sum + r.headcount, 0);

    const { data: eventRow, error: eventError } = await auth.supabase
      .from("events")
      .insert({
        client_id: event.client_id,
        event_date: event.event_date,
        start_time: event.start_time,
        end_time: event.end_time || null, // recorded later, at closure
        location: event.location,
        notes: event.notes || null,
        dress_code: event.dress_code || null,
        min_age: event.min_age ?? null,
        min_rating: event.min_rating ?? null,
        travel_budget_per_worker: event.travel_budget_per_worker ?? 0,
        spots_total: spotsTotal,
        status,
        created_by: auth.profile!.id,
      })
      .select("id")
      .single();

    if (eventError || !eventRow) {
      console.error("[createEvent] event insert failed", eventError?.message);
      return { success: false, error: "יצירת האירוע נכשלה. נסה/י שוב." };
    }

    const rolesPayload = roles.map((r) => ({
      event_id: eventRow.id,
      role_name: r.role_name,
      headcount: r.headcount,
      start_time: r.start_time,
      end_time: r.end_time,
      base_rate: r.base_rate ?? null,
    }));

    const { error: rolesError } = await auth.supabase.from("event_roles").insert(rolesPayload);

    if (rolesError) {
      console.error("[createEvent] role insert failed, rolling back event", rolesError.message);
      await auth.supabase.from("events").delete().eq("id", eventRow.id);
      return { success: false, error: "שמירת התפקידים נכשלה, האירוע לא נוצר." };
    }

    revalidatePath("/admin/events");
    return { success: true, eventId: eventRow.id, status };
  }

  export async function updateEventStatus(
    eventId: string,
    status: "open" | "closed" | "cancelled"
  ): Promise<ActionResult> {
    const auth = await requirePermission();
    if (!auth.ok) return { success: false, error: auth.error };

    // Guard: an event with any missing rate can't be pushed to 'open' from here —
    // that transition only happens automatically inside updateRoleRate.
    const { error } = await auth.supabase
      .from("events")
      .update({ status })
      .eq("id", eventId)
      .neq("status", "pending_rates");

    if (error) return { success: false, error: "עדכון הסטטוס נכשל." };

    revalidatePath("/admin/events");
    return { success: true };
  }

  export async function deleteEvent(eventId: string): Promise<ActionResult> {
    const auth = await requirePermission();
    if (!auth.ok) return { success: false, error: auth.error };

    const { error } = await auth.supabase.from("events").delete().eq("id", eventId);
    if (error) return { success: false, error: "מחיקת האירוע נכשלה." };

    revalidatePath("/admin/events");
    return { success: true };
  }