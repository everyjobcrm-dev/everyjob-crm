"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/guards";
import { areaSchema, type AreaInput } from "@/lib/areas";

/** The signed-in user edits their own city / region / role tags (RLS: own row; guard_profile_protected_columns allows these). */
export async function updateMyArea(input: AreaInput): Promise<{ success: boolean; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const args = areaSchema.safeParse(input);
  if (!args.success) return { success: false, error: args.error.issues[0]?.message ?? "פרטים לא תקינים." };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ city: args.data.city || null, region: args.data.region || null, role_tags: args.data.roleTags })
    .eq("id", ctx.userId);
  if (error) {
    console.error("[updateMyArea]", error.code, error.message);
    return { success: false, error: "השמירה נכשלה." };
  }
  revalidatePath("/employee/events");
  revalidatePath("/employee/profile");
  return { success: true };
}
