import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// TZ login. The email behind a ת"ז never leaves the server: we sign in here and return only the session,
// and an unknown ת"ז gets the same answer as a wrong password (no account enumeration).
const INVALID = "Invalid login credentials";

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();
    const tz = String(identifier ?? "").trim();
    const pass = typeof password === "string" ? password : "";

    if (!tz || !pass) {
      return NextResponse.json({ success: false, error: "יש להזין תעודת זהות וסיסמה." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "התחברות עם תעודת זהות אינה זמינה כרגע. התחברו עם אימייל וסיסמה." },
        { status: 500 },
      );
    }

    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    const adminClient = createClient(supabaseUrl, serviceRoleKey, options);

    const { data: profile } = await adminClient.from("profiles").select("id").eq("tz", tz).maybeSingle();
    const email = profile?.id ? (await adminClient.auth.admin.getUserById(profile.id)).data?.user?.email : null;
    if (!email) {
      return NextResponse.json({ success: false, error: INVALID }, { status: 401 });
    }

    // Supabase Auth's own rate limit and checks (banned, unconfirmed email) still apply to this call.
    const { data, error } = await createClient(supabaseUrl, anonKey, options).auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error || !data.session) {
      return NextResponse.json({ success: false, error: error?.message ?? INVALID }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "לא הצלחנו להתחבר כרגע. נסו שוב בעוד רגע." },
      { status: 500 },
    );
  }
}
