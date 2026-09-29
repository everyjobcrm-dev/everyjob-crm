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
    const missingRecruiterRateColumn =
      error.message.includes("recruiter_bonus_rate") &&
      (error.code === "42703" || error.code === "PGRST204");

    if (!missingRecruiterRateColumn) return null;

    const { data: coreProfile, error: coreProfileError } = await supabase
      .from("profiles")
      .select("first_name,last_name,tz,birth_date,email,role")
      .eq("id", userId)
      .single();

    if (coreProfileError) return null;

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
