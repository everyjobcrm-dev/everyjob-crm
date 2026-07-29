"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/auth";
import {
  mapClientRow,
  type ClientRecord,
  type ClientRow,
  type ClientContact,
  type PreferredRole,
} from "@/lib/admin/clients-data";

type AdminAuth =
  | { ok: true; supabase: SupabaseClient; userId: string }
  | { ok: false; error: string };

// Mirrors the requireAdmin() guard in app/admin/actions.ts.
// getUserRole() reads the role from `profiles` — see lib/supabase/auth.ts.
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

// ---------------------------------------------------------------------------
// createClient — matches the shape add-client-dialog.tsx actually sends
// ---------------------------------------------------------------------------

export type CreateClientInput = {
  name: string;
  industry: string;
  companyId: string;
  address: string;
  notes: string;
  overtimeThresholdHours?: number;
  minBillableHours?: number;
  contacts: ClientContact[];
  preferredRoles: PreferredRole[];
};

export type CreateClientResult =
  | { success: true; client: ClientRecord }
  | { success: false; error: string };

export async function createClient(input: CreateClientInput): Promise<CreateClientResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const name = input.name?.trim();
  if (!name) {
    return { success: false, error: "יש למלא שם לקוח." };
  }

  // clean contacts: drop fully-empty rows
  const cleanContacts = (input.contacts ?? [])
    .map((c) => ({ name: c.name.trim(), phone: c.phone.trim() }))
    .filter((c) => c.name.length > 0 || c.phone.length > 0);

  // clean preferred roles: drop rows with no role name, coerce rate to a number
  const cleanRoles = (input.preferredRoles ?? [])
    .map((r) => ({ role: r.role.trim(), rate: Number(r.rate) || 0 }))
    .filter((r) => r.role.length > 0);

  for (const r of cleanRoles) {
    if (r.rate < 0) {
      return { success: false, error: `תעריף לא תקין עבור התפקיד "${r.role}".` };
    }
  }

  if (input.overtimeThresholdHours !== undefined && input.overtimeThresholdHours <= 0) {
    return { success: false, error: "סף שעות נוספות חייב להיות מספר חיובי." };
  }
  if (input.minBillableHours !== undefined && input.minBillableHours < 0) {
    return { success: false, error: "מינימום לחיוב משמרת חייב להיות מספר לא שלילי." };
  }

  const { data, error } = await auth.supabase
    .from("clients")
    .insert({
      name,
      industry: input.industry?.trim() || null,
      company_id: input.companyId?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      overtime_threshold_hours: input.overtimeThresholdHours ?? null,
      min_billable_hours: input.minBillableHours ?? null,
      contacts: cleanContacts, // jsonb
      preferred_roles: cleanRoles, // jsonb
      status: "active",
    })
    .select("*, events(count)")
    .single();

  if (error || !data) {
    console.error("Supabase Insert Error:", error);
    return { success: false, error: "יצירת הלקוח נכשלה. נסה/י שוב." };
  }

  revalidatePath("/admin/clients");
  return { success: true, client: mapClientRow(data as unknown as ClientRow) };
}

// ---------------------------------------------------------------------------
// updateClient — same validation as createClient, but updates an existing row
// ---------------------------------------------------------------------------

export type UpdateClientInput = {
  name: string;
  industry: string;
  companyId: string;
  address: string;
  notes: string;
  status: "active" | "paused";
  overtimeThresholdHours?: number;
  minBillableHours?: number;
  contacts: ClientContact[];
  preferredRoles: PreferredRole[];
};

export type UpdateClientResult =
  | { success: true; client: ClientRecord }
  | { success: false; error: string };

export async function updateClient(clientId: string, input: UpdateClientInput): Promise<UpdateClientResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const name = input.name?.trim();
  if (!name) {
    return { success: false, error: "יש למלא שם לקוח." };
  }

  const cleanContacts = (input.contacts ?? [])
    .map((c) => ({ name: c.name.trim(), phone: c.phone.trim() }))
    .filter((c) => c.name.length > 0 || c.phone.length > 0);

  const cleanRoles = (input.preferredRoles ?? [])
    .map((r) => ({ role: r.role.trim(), rate: Number(r.rate) || 0 }))
    .filter((r) => r.role.length > 0);

  for (const r of cleanRoles) {
    if (r.rate < 0) {
      return { success: false, error: `תעריף לא תקין עבור התפקיד "${r.role}".` };
    }
  }

  if (input.overtimeThresholdHours !== undefined && input.overtimeThresholdHours <= 0) {
    return { success: false, error: "סף שעות נוספות חייב להיות מספר חיובי." };
  }
  if (input.minBillableHours !== undefined && input.minBillableHours < 0) {
    return { success: false, error: "מינימום לחיוב משמרת חייב להיות מספר לא שלילי." };
  }

  const { data, error } = await auth.supabase
    .from("clients")
    .update({
      name,
      industry: input.industry?.trim() || null,
      company_id: input.companyId?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      overtime_threshold_hours: input.overtimeThresholdHours ?? null,
      min_billable_hours: input.minBillableHours ?? null,
      contacts: cleanContacts,
      preferred_roles: cleanRoles,
      status: input.status,
    })
    .eq("id", clientId)
    .select("*, events(count)")
    .single();

  if (error || !data) {
    console.error("Supabase Update Error:", error);
    return { success: false, error: "עדכון הלקוח נכשל. נסה/י שוב." };
  }

  revalidatePath("/admin/clients");
  return { success: true, client: mapClientRow(data as unknown as ClientRow) };
}

// ---------------------------------------------------------------------------
// deleteClient — two-step deletion, verified server-side as well as client-side
// ---------------------------------------------------------------------------

export type DeleteClientResult = { success: true } | { success: false; error: string };

export async function deleteClient(clientId: string, confirmName: string): Promise<DeleteClientResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data: client, error: fetchError } = await auth.supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .single();

  if (fetchError || !client) {
    return { success: false, error: "הלקוח לא נמצא." };
  }

  if (confirmName.trim() !== client.name) {
    return { success: false, error: "האימות אינו תואם את שם הלקוח." };
  }

  const { error: deleteError } = await auth.supabase.from("clients").delete().eq("id", clientId);

  if (deleteError) {
    // 23503 = foreign_key_violation
    if (deleteError.code === "23503") {
      return {
        success: false,
        error: "לא ניתן למחוק לקוח עם אירועים משויכים. יש להעביר או למחוק את האירועים תחילה.",
      };
    }
    return { success: false, error: "מחיקת הלקוח נכשלה. נסה/י שוב." };
  }

  revalidatePath("/admin/clients");
  return { success: true };
}