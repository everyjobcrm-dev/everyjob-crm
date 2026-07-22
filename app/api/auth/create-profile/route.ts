import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, first_name, last_name, tz, role = "employee" } = body ?? {};

    if (!userId || !first_name || !last_name || !tz) {
      return NextResponse.json(
        { success: false, error: "Profile details are incomplete." },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "The server is missing Supabase service role credentials, so profile creation is unavailable.",
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

    const { error } = await adminClient.from("profiles").insert({
      id: userId,
      first_name,
      last_name,
      tz,
      role,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "We could not save your profile right now. Please try again in a moment." },
      { status: 500 },
    );
  }
}
