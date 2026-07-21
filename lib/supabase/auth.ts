import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileRole = "admin" | "employee" | "recruiter";

export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name,last_name,tz,role")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getUserRole(supabase: SupabaseClient, userId: string) {
  const profile = await getUserProfile(supabase, userId);
  return (profile?.role as ProfileRole | null) ?? null;
}
