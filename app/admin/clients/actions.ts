"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/auth";

type ActionResult = { success: true } | { success: false; error: string };

type AdminAuth = { ok: true; supabase: SupabaseClient; userId: string } | { ok: false; error: string };

// Mirrors the requireAdmin() guard in app/admin/actions.ts. Kept local here so this
// route stays self-contained — consider extracting a shared lib/admin/auth.ts if a
// third admin action file shows up.
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

export type CreateClientInput = {
  name: string;
  industry: string;
  contactName: string;
  contactPhone: string;
  address: string;
  hourlyRate: number;
  bonusPct: number; // fraction, e.g. 0.08 for 8%
};

export async function createClient(input: CreateClientInput): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!input.name.trim()) {
    return { success: false, error: "יש למלא שם לקוח." };
  }

  // NOTE: requires the `clients` table described in lib/admin/clients-data.ts.
  // Until that migration lands, this insert will fail — the caller (AddClientDialog)
  // already applies the new client optimistically on the client side, so the UI
  // stays usable either way.
  const { error } = await auth.supabase.from("clients").insert({
    name: input.name.trim(),
    industry: input.industry.trim() || "כללי",
    contact_name: input.contactName.trim() || null,
    contact_phone: input.contactPhone.trim() || null,
    address: input.address.trim() || null,
    hourly_rate: input.hourlyRate,
    bonus_pct: input.bonusPct,
    status: "active",
    created_by: auth.userId,
  });

  if (error) {
    return { success: false, error: "יצירת הלקוח נכשלה. נסה/י שוב." };
  }

  revalidatePath("/admin/clients");
  return { success: true };
}