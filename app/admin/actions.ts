"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/auth";

type ActionResult = { success: true } | { success: false; error: string };

type AdminAuth =
  | { ok: true; supabase: SupabaseClient; userId: string }
  | { ok: false; error: string };

/**
 * Re-verifies the caller is an authenticated admin on every action call.
 * The admin layout guard prevents *page* access, but Server Actions are
 * independently invocable endpoints — this is the real security boundary.
 */
async function requireAdmin(): Promise<AdminAuth> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { ok: false, error: "שגיאת תצורה בשרת. פנה/י לתמיכה." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "לא מחובר/ת למערכת." };
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    return { ok: false, error: "אין לך הרשאה לבצע פעולה זו." };
  }

  return { ok: true, supabase, userId: user.id };
}

export type CreateEventInput = {
  title: string;
  location: string;
  eventDate: string; // yyyy-mm-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  wageRate: number;
  spotsTotal: number;
  dressCode?: string;
};

export async function createEvent(input: CreateEventInput): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.title.trim() || !input.location.trim() || !input.eventDate) {
    return { success: false, error: "יש למלא כותרת, מיקום ותאריך." };
  }

  const { error } = await auth.supabase.from("events").insert({
    title: input.title.trim(),
    location: input.location.trim(),
    event_date: input.eventDate,
    start_time: input.startTime,
    end_time: input.endTime,
    wage_rate: input.wageRate,
    spots_total: input.spotsTotal,
    dress_code: input.dressCode?.trim() || null,
    status: "open",
    created_by: auth.userId,
  });

  if (error) {
    return { success: false, error: "יצירת האירוע נכשלה. נסה/י שוב." };
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function updateEventStatus(
  eventId: string,
  status: "open" | "closed" | "completed"
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from("events").update({ status }).eq("id", eventId);

  if (error) {
    return { success: false, error: "עדכון הסטטוס נכשל." };
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from("events").delete().eq("id", eventId);

  if (error) {
    return { success: false, error: "מחיקת האירוע נכשלה." };
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function updateUserRole(
  userId: string,
  role: "admin" | "employee" | "recruiter"
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  if (userId === auth.userId && role !== "admin") {
    return { success: false, error: "לא ניתן להסיר הרשאת מנהל מהחשבון שלך." };
  }

  const { error } = await auth.supabase.from("profiles").update({ role }).eq("id", userId);

  if (error) {
    return { success: false, error: "עדכון ההרשאה נכשל." };
  }

  revalidatePath("/admin/employees");
  return { success: true };
}

export async function approveForm101(userId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("profiles")
    .update({ form_101_status: "complete" })
    .eq("id", userId);

  if (error) {
    return { success: false, error: "אישור הטופס נכשל." };
  }

  revalidatePath("/admin/employees");
  return { success: true };
}

export async function broadcastMessage(title: string, body: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!title.trim() || !body.trim()) {
    return { success: false, error: "יש למלא כותרת ותוכן." };
  }

  const { error } = await auth.supabase.from("announcements").insert({
    title: title.trim(),
    body: body.trim(),
    created_by: auth.userId,
  });

  if (error) {
    return { success: false, error: "שליחת ההודעה נכשלה." };
  }

  revalidatePath("/employee/dashboard");
  return { success: true };
}
