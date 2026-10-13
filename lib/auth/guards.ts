import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isAppRole,
  roleAtLeast,
  type AppRole,
  type PermissionProfile,
  type StaffRole,
} from "@/lib/auth/permissions";

/**
 * Server-side authorization (AGENTS.md 5.2). Reads the caller's role from the database on EVERY call - never from the
 * client, the request body or auth-context.tsx. Use at the top of every server action / server component that acts on
 * privileged data. The hierarchy itself lives in lib/auth/permissions.ts.
 */

export type AuthOk = {
  ok: true;
  supabase: SupabaseClient;
  userId: string;
  role: AppRole;
  profile: PermissionProfile;
};
export type AuthFail = { ok: false; error: string; reason: "config" | "unauthenticated" | "forbidden" };
export type AuthResult = AuthOk | AuthFail;

export async function getAuthContext(): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, reason: "config", error: "שגיאת תצורה בשרת. פנה/י לתמיכה." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated", error: "לא מחובר/ת למערכת." };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, can_create_events")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || !isAppRole(profile.role)) {
    return { ok: false, reason: "forbidden", error: "אין לך הרשאה לבצע פעולה זו." };
  }

  return {
    ok: true,
    supabase,
    userId: user.id,
    role: profile.role,
    profile: { id: user.id, role: profile.role, can_create_events: profile.can_create_events === true },
  };
}

/** Requires the caller to be at least `min` in the hierarchy (admin >= manager >= recruiter). */
export async function requireRole(min: StaffRole): Promise<AuthResult> {
  const ctx = await getAuthContext();
  if (!ctx.ok) return ctx;
  if (!roleAtLeast(ctx.role, min)) {
    return { ok: false, reason: "forbidden", error: "אין לך הרשאה לבצע פעולה זו." };
  }
  return ctx;
}

/** Convenience for pages (e.g. /new): the signed-in user's profile, or null. */
export async function getCurrentProfile(): Promise<PermissionProfile | null> {
  const ctx = await getAuthContext();
  return ctx.ok ? ctx.profile : null;
}
