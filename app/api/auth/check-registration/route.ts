import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TZ_PATTERN = /^[0-9]{8,9}$/;

export async function POST(request: Request) {
  try {
    const { email, tz } = await request.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedTz = String(tz ?? "").trim();

    if (!EMAIL_PATTERN.test(normalizedEmail) || !TZ_PATTERN.test(normalizedTz)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email and ID number." },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { success: false, error: "Registration is temporarily unavailable." },
        { status: 503 },
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json({ success: true, preflightSkipped: true });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existingProfile, error } = await adminClient
      .from("profiles")
      .select("tz,email")
      .or(`tz.eq.${normalizedTz},email.ilike.${normalizedEmail}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: "We could not check the registration details." },
        { status: 500 },
      );
    }

    if (existingProfile?.tz === normalizedTz) {
      return NextResponse.json(
        { success: false, error: "This ID number is already registered." },
        { status: 400 },
      );
    }

    if (existingProfile?.email?.toLowerCase() === normalizedEmail) {
      return NextResponse.json(
        { success: false, error: "This email is already registered." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "We could not check the registration details." },
      { status: 500 },
    );
  }
}