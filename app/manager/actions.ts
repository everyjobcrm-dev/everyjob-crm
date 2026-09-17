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

async function requireManagerOrAdmin() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false as const, error: "שגיאת תצורה בשרת." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "לא מחובר/ת למערכת." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager" && profile?.role !== "admin") {
    return { ok: false as const, error: "אין לך הרשאה." };
  }

  return { ok: true as const, supabase, userId: user.id, role: profile.role };
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

export async function setEmployeeRate(
  eventId: string,
  registrationId: string,
  wageRate: number,
): Promise<ActionResult> {
  const auth = await requireManagerOrAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!Number.isFinite(wageRate) || wageRate <= 0) {
    return { success: false, error: "יש להזין תעריף שעתי חיובי." };
  }

  const { data: event } = await auth.supabase
    .from("events")
    .select("id, event_date")
    .eq("id", eventId)
    .single();
  if (!event) return { success: false, error: "האירוע לא נמצא." };

  if (auth.role === "manager") {
    const eventDate = new Date(`${event.event_date}T00:00:00Z`);
    const cutoff = new Date(Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth() + 1, 10));
    if (new Date() > cutoff) {
      return { success: false, error: "חלון עדכון התעריף הסתיים ב-10 לחודש שלאחר האירוע." };
    }
  }

  const { error } = await auth.supabase
    .from("event_registrations")
    .update({ wage_rate: wageRate, rate_set_by: auth.userId, rate_set_at: new Date().toISOString() })
    .eq("id", registrationId)
    .eq("event_id", eventId);

  if (error) return { success: false, error: "עדכון התעריף נכשל." };
  revalidatePath(`/manager/events/${eventId}`);
  return { success: true };
}

export async function redeemRecruitmentCredits(
  eventId: string,
  recruiterId: string,
  creditCount: number,
): Promise<ActionResult<{ redeemedCount: number }>> {
  const auth = await requireManagerOrAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!Number.isInteger(creditCount) || creditCount < 1) {
    return { success: false, error: "יש לבחור מספר זיכויים חיובי." };
  }

  const { data: credits, error: creditsError } = await auth.supabase
    .from("recruiter_bonuses")
    .select("id")
    .eq("recruiter_id", recruiterId)
    .is("redeemed_at", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(creditCount);

  if (creditsError) return { success: false, error: "שליפת הזיכויים נכשלה." };
  if (!credits || credits.length < creditCount) {
    return { success: false, error: "אין מספיק זיכויים ממתינים למימוש." };
  }

  const ids = credits.map((credit) => credit.id);
  const { data: redeemed, error: redeemError } = await auth.supabase
    .from("recruiter_bonuses")
    .update({
      redeemed_at: new Date().toISOString(),
      redeemed_by: auth.userId,
      redeemed_context_event_id: eventId,
    })
    .in("id", ids)
    .is("redeemed_at", null)
    .select("id");

  if (redeemError || redeemed?.length !== ids.length) {
    return { success: false, error: "מימוש הזיכויים נכשל. נסה/י שוב." };
  }

  revalidatePath(`/manager/events/${eventId}`);
  revalidatePath("/employee/profile");
  revalidatePath("/admin/recruiters");
  return { success: true, redeemedCount: redeemed.length };
}

