import { createServerSupabaseClient } from "@/lib/supabase/server";

export type EventCreatorProfile = {
  id: string;
  role: "admin" | "employee";
  // Per-employee override, off by default. Lets an admin grant specific
  // recruiters/field managers event-creation rights without making them
  // full admins. Requires a `can_create_events boolean default false`
  // column on `profiles`.
  can_create_events: boolean;
};

/**
 * Loads the signed-in user's profile (id + role + permission flag).
 * Returns null if there's no session or no matching profile row —
 * callers should treat null as "not allowed", not as "allowed by default".
 */
export async function getCurrentProfile(): Promise<EventCreatorProfile | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, can_create_events")
    .eq("id", user.id)
    .single();

  if (error) {
    // במקרה של שגיאה (כמו עמודה חסרה), נדפיס אותה בצורה בולטת לטרמינל
    console.error("🚨 SUPABASE PROFILE FETCH ERROR:", error.message, error.hint, error.details);
    return null;
  }

  if (!profile) return null;

  return profile as EventCreatorProfile;
}

/** Admins always pass. Employees pass only with the explicit flag set. */
export function canCreateEvents(profile: EventCreatorProfile | null): boolean {
  if (!profile) return false;
  return profile.role === "admin" || profile.can_create_events === true;
}