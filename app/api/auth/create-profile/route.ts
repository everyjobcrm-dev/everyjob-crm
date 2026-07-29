import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, first_name, last_name, tz, birth_date, role = "employee" } = body ?? {};

    if (!userId || !first_name || !last_name || !tz) {
      return NextResponse.json(
        { success: false, error: "Profile details are incomplete." },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase URL or anon key is missing.",
        },
        { status: 500 },
      );
    }

    const authToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || body?.accessToken || "";

    console.info("Create profile request", {
      userId,
      hasAuthToken: Boolean(authToken),
      hasServiceRole: Boolean(serviceRoleKey),
      birthDateProvided: Boolean(birth_date),
    });

    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);

      if (userError || !userData?.user) {
        return NextResponse.json(
          { success: false, error: "The user could not be found in Supabase." },
          { status: 404 },
        );
      }

      const emailVerified = Boolean(userData.user.email_confirmed_at || userData.user.confirmed_at);

      if (!emailVerified) {
        await adminClient.from("profiles").delete().eq("id", userId);
        return NextResponse.json(
          { success: false, error: "Email verification is required before saving the profile." },
          { status: 403 },
        );
      }

      const { error } = await adminClient.from("profiles").upsert(
        {
          id: userId,
          first_name,
          last_name,
          tz,
          birth_date: birth_date || null,
          email: body?.email || null,
          role,
        },
        { onConflict: "id" },
      );

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 },
        );
      }

      if (birth_date) {
        await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: {
            birth_date,
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: authToken
          ? {
              Authorization: `Bearer ${authToken}`,
            }
          : undefined,
      },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json(
        { success: false, error: "The user could not be authenticated for profile creation." },
        { status: 401 },
      );
    }

    const emailVerified = Boolean(userData.user.email_confirmed_at || userData.user.confirmed_at);

    if (!emailVerified) {
      return NextResponse.json(
        { success: false, error: "Email verification is required before saving the profile." },
        { status: 403 },
      );
    }

    const { data: profileData, error } = await userClient.from("profiles").upsert(
      {
        id: userId,
        first_name,
        last_name,
        tz,
        birth_date: birth_date || null,
        email: body?.email || null,
        role,
      },
      { onConflict: "id" },
    );

    console.info("Create profile upsert result", { profileData, error: error?.message });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message, details: error.details, hint: "Make sure the public.profiles table exists and the RLS policies allow inserts for the authenticated user." },
        { status: 500 },
      );
    }

    if (birth_date) {
      try {
        await userClient.auth.updateUser({
          data: {
            birth_date,
          },
        });
      } catch (metadataError) {
        console.warn("Metadata update failed", metadataError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "We could not save your profile right now. Please try again in a moment." },
      { status: 500 },
    );
  }
}
