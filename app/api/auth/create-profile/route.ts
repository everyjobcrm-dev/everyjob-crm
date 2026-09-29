import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const ALLOWED_GENDERS = new Set(["male", "female", "other"]);
const PHONE_PATTERN = /^0(5[0-9]{8}|[23489][0-9]{7})$/;
const TZ_PATTERN = /^[0-9]{8,9}$/;

export async function POST(request: Request) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Profile creation is handled atomically by the auth.users insert trigger. This endpoint is deprecated and intentionally disabled.",
      deprecated: true,
    },
    { status: 410 },
  );
}