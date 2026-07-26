import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();
    const normalizedIdentifier = String(identifier ?? "").trim();

    if (!normalizedIdentifier) {
      return NextResponse.json(
        { success: false, error: "Please enter your TZ or email." },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "TZ login is not enabled yet because the Supabase service role key is missing. Please use your email and password for now.",
        },
        { status: 500 },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id,tz")
      .eq("tz", normalizedIdentifier)
      .single();

    if (profileError || !profile?.id) {
      return NextResponse.json(
        { success: false, error: "No account was found for this TZ. Please double-check the number or use your email." },
        { status: 404 },
      );
    }

    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(profile.id);

    if (userError || !userData?.user?.email) {
      return NextResponse.json(
        { success: false, error: "We could not resolve the account for this TZ. Please use your email instead." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, email: userData.user.email });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "We could not resolve the account right now. Please try again in a moment." },
      { status: 500 },
    );
  }
}