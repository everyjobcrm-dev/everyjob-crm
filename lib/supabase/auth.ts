import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRole = "admin" | "manager" | "employee" | "recruiter";

export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name,last_name,tz,birth_date,email,role,recruiter_bonus_rate")
    .eq("id", userId)
    .single();

  if (error) {
    console.warn("getUserProfile query error:", error, "userId:", userId);

    const { data: coreProfile, error: coreProfileError } = await supabase
      .from("profiles")
      .select("first_name,last_name,tz,birth_date,email,role")
      .eq("id", userId)
      .maybeSingle();

    if (coreProfileError) {
      const err2 = coreProfileError as unknown;
      const errorDetails = err2 instanceof Error
        ? { name: err2.name, message: err2.message, stack: err2.stack, cause: err2.cause }
        : { value: err2, ownKeys: err2 && typeof err2 === "object" ? Object.getOwnPropertyNames(err2) : [] };
      console.error("getUserProfile core fallback failed:", errorDetails, "userId:", userId);
      return null;
    }

    if (!coreProfile) {
      console.warn("getUserProfile: no profile row found for userId:", userId);
      return null;
    }

    return { ...coreProfile, recruiter_bonus_rate: null };
  }

  if (!data) {
    return null;
  }

  return data;
}

export async function getUserRole(supabase: SupabaseClient, userId: string) {
  const profile = await getUserProfile(supabase, userId);
  return (profile?.role as ProfileRole | null) ?? null;
}
