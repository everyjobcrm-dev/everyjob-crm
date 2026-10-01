import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ensureSignupProfile } from "@/lib/auth/ensure-signup-profile";

// TODO(pre-launch): remove dev email verification bypass
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "שירות ההרשמה אינו זמין כרגע." },
      { status: 503 },
    );
  }

  const accessToken = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!accessToken) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);

  if (authError || !authData.user) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await ensureSignupProfile(adminClient, authData.user);

  if (result.error || !result.role) {
    return NextResponse.json(
      { success: false, error: "לא ניתן להשלים את הגדרת החשבון כרגע." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, role: result.role });
}