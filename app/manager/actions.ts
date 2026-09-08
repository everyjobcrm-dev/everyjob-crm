"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : T))
  | { success: false; error: string };

async function requireManager() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false as const, error: "שגיאת תצורה בשרת." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "לא מחובר/ת למערכת." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  
  if (profile?.role !== "manager" && profile?.role !== "admin" && profile?.role !== "recruiter") {
    return { ok: false as const, error: "אין לך הרשאה." };
  }

  return { ok: true as const, supabase, userId: user.id };
}

export async function approveCancellation(registrationId: string): Promise<ActionResult> {
  const auth = await requireManager();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("event_registrations")
    .update({ 
      status: "cancelled", 
      cancellation_requested_at: null 
    })
    .eq("id", registrationId);

  if (error) {
    console.error("[approveCancellation]", error.message);
    return { success: false, error: "שגיאה באישור הביטול." };
  }

  revalidatePath("/manager/events");
  return { success: true };
}

export async function rejectCancellation(registrationId: string): Promise<ActionResult> {
  const auth = await requireManager();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from("event_registrations")
    .update({ cancellation_requested_at: null })
    .eq("id", registrationId);

  if (error) {
    console.error("[rejectCancellation]", error.message);
    return { success: false, error: "שגיאה בדחיית הבקשה." };
  }

  revalidatePath("/manager/events");
  return { success: true };
}

export async function promoteWaitlist(registrationId: string): Promise<ActionResult> {
    const auth = await requireManager();
    if (!auth.ok) return { success: false, error: auth.error };
  
    const { error } = await auth.supabase
      .from("event_registrations")
      .update({ status: "pending" })
      .eq("id", registrationId);
  
    if (error) {
      console.error("[promoteWaitlist]", error.message);
      return { success: false, error: "שגיאה בקידום העובד/ת." };
    }
  
    revalidatePath("/manager/events");
    return { success: true };
}
