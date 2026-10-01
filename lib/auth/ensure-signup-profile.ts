import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isValidIsraeliId } from "@/lib/validations/israeli-id";

export type ProfileRole = "admin" | "manager" | "employee" | "recruiter";

const ALLOWED_GENDERS = new Set(["male", "female", "other"]);
const PHONE_PATTERN = /^0(5[0-9]{8}|[23489][0-9]{7})$/;

function isProfileRole(value: unknown): value is ProfileRole {
  return (
    value === "admin" ||
    value === "manager" ||
    value === "employee" ||
    value === "recruiter"
  );
}

// TODO(pre-launch): remove dev email verification bypass
export async function ensureSignupProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<{ role: ProfileRole | null; error: string | null }> {
  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileLookupError) {
    return { role: null, error: "profile lookup failed" };
  }

  if (existingProfile) {
    if (isProfileRole(existingProfile.role)) {
      return { role: existingProfile.role, error: null };
    }

    const { error: roleUpdateError } = await supabase
      .from("profiles")
      .update({ role: "employee" })
      .eq("id", user.id);

    return roleUpdateError
      ? { role: null, error: "profile role repair failed" }
      : { role: "employee", error: null };
  }

  const metadata = user.user_metadata ?? {};
  const firstName = typeof metadata.first_name === "string" ? metadata.first_name.trim() : "";
  const lastName = typeof metadata.last_name === "string" ? metadata.last_name.trim() : "";
  const tz = typeof metadata.tz === "string" ? metadata.tz.trim() : "";
  const birthDate = typeof metadata.birth_date === "string" ? metadata.birth_date : "";
  const phoneNumber = typeof metadata.phone_number === "string" ? metadata.phone_number : "";
  const gender = typeof metadata.gender === "string" ? metadata.gender.toLowerCase() : "";

  if (
    !user.email ||
    !firstName ||
    !lastName ||
    !isValidIsraeliId(tz) ||
    !birthDate ||
    !PHONE_PATTERN.test(phoneNumber) ||
    !ALLOWED_GENDERS.has(gender)
  ) {
    return { role: null, error: "signup metadata is incomplete" };
  }

  const { error: insertError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      tz,
      birth_date: birthDate,
      email: user.email,
      role: "employee",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (insertError) {
    return { role: null, error: "profile insert failed" };
  }

  const { data: createdProfile, error: createdProfileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (createdProfileError || !createdProfile || !isProfileRole(createdProfile.role)) {
    return { role: null, error: "profile confirmation failed" };
  }

  return { role: createdProfile.role, error: null };
}