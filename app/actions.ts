"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createEventSchema, type CreateEventInput } from "@/lib/validations/event";
import { getCurrentProfile, canCreateEvents } from "@/lib/auth/permissions";

export type ClientOption = { id: string; name: string };

export async function fetchClients(): Promise<ClientOption[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("[fetchClients]", error.message);
    return [];
  }
  return data ?? [];
}

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : T))
  | { success: false; error: string };

/**
 * Creates an event and its full role roster.
 *
 * NOTE ON ATOMICITY: supabase-js has no native cross-table transaction, so
 * this does an insert-then-insert with a compensating delete if the second
 * write fails. For true atomicity, replace this with a single call to a
 * Postgres function, e.g.:
 *
 *   create function create_event_with_roles(event jsonb, roles jsonb)
 *   returns uuid language plpgsql as $$
 *   declare new_id uuid;
 *   begin
 *     insert into events select * from jsonb_populate_record(null::events, event)
 *       returning id into new_id;
 *     insert into event_roles
 *       select new_id, * from jsonb_populate_recordset(null::event_roles, roles);
 *     return new_id;
 *   end; $$;
 *
 * and call it here with `supabase.rpc('create_event_with_roles', {...})`.
 */
export async function createEvent(
  input: CreateEventInput
): Promise<ActionResult<{ eventId: string; status: "pending_rates" | "open" }>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "אין הרשאה. יש להתחבר מחדש." };

  // Server-side gate — this is the real enforcement point. Any page that
  // renders CreateEventForm (admin today, permitted employees later) can
  // only ever be a UX convenience; a signed-in user without this flag
  // still can't create an event by calling the action directly.
  const profile = await getCurrentProfile();
  if (!canCreateEvents(profile)) {
    return { success: false, error: "אין לך הרשאה ליצור אירועים. פנה/י למנהל/ת המערכת." };
  }

  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "נתונים לא תקינים" };
  }
  const { roles, ...event } = parsed.data;

  // Business rule: any role without a base_rate forces the event into
  // pending_rates, regardless of what the admin picked for status.
  const missingRates = roles.some((r) => r.base_rate == null);
  const status: "pending_rates" | "open" = missingRates ? "pending_rates" : "open";
  const spotsTotal = roles.reduce((sum, r) => sum + r.headcount, 0);

  const { data: eventRow, error: eventError } = await supabase
    .from("events")
    .insert({
      client_id: event.client_id,
      event_date: event.event_date,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      notes: event.notes || null,
      dress_code: event.dress_code || null,
      min_age: event.min_age ?? null,
      max_age: event.max_age ?? null,
      required_rank: event.required_rank,
      travel_budget: event.travel_budget ?? null,
      spots_total: spotsTotal,
      status,
      created_by: profile!.id,
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

  const { error: rolesError } = await supabase.from("event_roles").insert(rolesPayload);

  if (rolesError) {
    console.error("[createEvent] role insert failed, rolling back event", rolesError.message);
    await supabase.from("events").delete().eq("id", eventRow.id);
    return { success: false, error: "שמירת התפקידים נכשלה, האירוע לא נוצר." };
  }

  revalidatePath("/admin/events");
  return { success: true, eventId: eventRow.id, status };
}

/**
 * Fills in (or updates) a single role's base_rate. When every role on the
 * parent event now has a rate, the event automatically flips from
 * pending_rates to open so it becomes visible to workers.
 */
export async function updateRoleRate(
  roleId: string,
  baseRate: number
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "אין הרשאה. יש להתחבר מחדש." };

  const profile = await getCurrentProfile();
  if (!canCreateEvents(profile)) {
    return { success: false, error: "אין לך הרשאה לעדכן תעריפים. פנה/י למנהל/ת המערכת." };
  }

  if (!Number.isFinite(baseRate) || baseRate <= 0) {
    return { success: false, error: "תעריף לא תקין" };
  }

  const { data: role, error: roleError } = await supabase
    .from("event_roles")
    .update({ base_rate: baseRate })
    .eq("id", roleId)
    .select("event_id")
    .single();

  if (roleError || !role) {
    return { success: false, error: "עדכון התעריף נכשל" };
  }

  const { data: siblingRoles, error: siblingError } = await supabase
    .from("event_roles")
    .select("base_rate")
    .eq("event_id", role.event_id);

  if (!siblingError && siblingRoles && siblingRoles.every((r) => r.base_rate != null)) {
    await supabase.from("events").update({ status: "open" }).eq("id", role.event_id).eq("status", "pending_rates");
  }

  revalidatePath("/admin/events");
  return { success: true };
}