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

export type SubmitShiftAttendanceInput = {
  registrationId: string;
  reportedStart: string;
  reportedEnd: string;
  reportedHours: number;
  performanceRating?: number;
  performanceNotes?: string;
};

export async function submitShiftAttendance(input: SubmitShiftAttendanceInput): Promise<ActionResult> {
  const auth = await requireManager();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.registrationId || input.reportedHours <= 0) {
    return { success: false, error: "יש להזין מספר שעות חיובי." };
  }

  const { data: reg, error: regError } = await auth.supabase
    .from("event_registrations")
    .select("id, user_id, event_id")
    .eq("id", input.registrationId)
    .single();

  if (regError || !reg) {
    return { success: false, error: "הרשמת המשמרת לא נמצאה." };
  }

  const { error: subError } = await auth.supabase
    .from("shift_hour_submissions")
    .upsert(
      {
        registration_id: reg.id,
        employee_id: reg.user_id,
        event_id: reg.event_id,
        reported_start: input.reportedStart,
        reported_end: input.reportedEnd,
        reported_hours: input.reportedHours,
        performance_rating: input.performanceRating ?? null,
        performance_notes: input.performanceNotes?.trim() || null,
        submitted_by: auth.userId,
        submitted_at: new Date().toISOString(),
        status: "pending",
      },
      { onConflict: "registration_id" }
    );

  if (subError) {
    console.error("[submitShiftAttendance]", subError.message);
    return { success: false, error: "הגשת דוח השעות נכשלה." };
  }

  if (input.performanceRating && input.performanceRating >= 1 && input.performanceRating <= 5) {
    await auth.supabase.from("employee_ratings").insert({
      employee_id: reg.user_id,
      rater_id: auth.userId,
      event_id: reg.event_id,
      rating: input.performanceRating,
      review_notes: input.performanceNotes?.trim() || null,
    });
  }

  revalidatePath("/manager/events");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

