import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ensureSignupProfile } from "@/lib/auth/ensure-signup-profile";
import { isValidIsraeliId } from "@/lib/validations/israeli-id";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^0(5[0-9]{8}|[23489][0-9]{7})$/;
const ALLOWED_GENDERS = new Set(["male", "female", "other"]);

const GENERIC_DUPLICATE_MESSAGE = "פרטי ההרשמה כבר קיימים במערכת.";

type RegistrationBody = {
  email?: unknown;
  password?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  tz?: unknown;
  birth_date?: unknown;
  phone_number?: unknown;
  gender?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function maskTz(tz: string): string {
  return `******${tz.slice(-3)}`;
}

function hashTz(tz: string): string {
  const secret = process.env.SIGNUP_RATE_LIMIT_SECRET;
  if (!secret) throw new Error("SIGNUP_RATE_LIMIT_SECRET is not configured");

  return createHash("sha256").update(`${secret}:${tz}`).digest("hex");
}

function genericDuplicateError() {
  return NextResponse.json(
    { success: false, error: GENERIC_DUPLICATE_MESSAGE },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  // TODO(pre-launch): remove dev email verification bypass
  const skipEmailVerification =
    process.env.DEV_SKIP_EMAIL_VERIFICATION?.trim().toLowerCase() === "true";

  if (skipEmailVerification && process.env.NODE_ENV === "production") {
    throw new Error("DEV_SKIP_EMAIL_VERIFICATION cannot be enabled in production");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "שירות ההרשמה אינו זמין כרגע." },
      { status: 503 },
    );
  }

  let body: RegistrationBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "פרטי ההרשמה אינם תקינים." },
      { status: 400 },
    );
  }

  const email = text(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const firstName = text(body.first_name);
  const lastName = text(body.last_name);
  const tz = text(body.tz);
  const birthDate = text(body.birth_date);
  const phoneNumber = text(body.phone_number);
  const gender = text(body.gender).toLowerCase();

  if (
    !EMAIL_PATTERN.test(email) ||
    password.length < 8 ||
    !firstName ||
    !lastName ||
    !isValidIsraeliId(tz) ||
    !birthDate ||
    !PHONE_PATTERN.test(phoneNumber) ||
    !ALLOWED_GENDERS.has(gender)
  ) {
    return NextResponse.json(
      { success: false, error: "יש לבדוק את כל פרטי ההרשמה." },
      { status: 400 },
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let tzHash: string;
  try {
    tzHash = hashTz(tz);
  } catch {
    return NextResponse.json(
      { success: false, error: "שירות ההרשמה אינו זמין כרגע." },
      { status: 503 },
    );
  }

  const { data: allowed, error: rateLimitError } = await adminClient.rpc(
    "consume_signup_tz_attempt",
    { p_tz_hash: tzHash, p_window_seconds: 900, p_max_attempts: 3 },
  );

  if (rateLimitError) {
    console.warn("Signup rate-limit RPC failed", {
      code: rateLimitError.code ?? null,
      message: rateLimitError.message,
      details: rateLimitError.details ?? null,
    });
  }

  if (rateLimitError || allowed !== true) {
    return NextResponse.json(
      {
        success: false,
        error: "בוצעו יותר מדי ניסיונות. נסה שוב בעוד מספר דקות.",
      },
      { status: 429 },
    );
  }

  const leaseToken = randomUUID();
  const { data: leaseAcquired, error: leaseError } = await adminClient.rpc(
    "acquire_signup_tz_lease",
    {
      p_tz_hash: tzHash,
      p_lease_token: leaseToken,
      p_lease_seconds: 60,
    },
  );

  if (leaseError) {
    console.warn("Signup lease RPC failed", {
      code: leaseError.code ?? null,
      message: leaseError.message,
      details: leaseError.details ?? null,
    });
  }

  if (leaseError || leaseAcquired !== true) {
    return NextResponse.json(
      { success: false, error: "לא ניתן להשלים את ההרשמה כרגע. נסה שוב." },
      { status: 409 },
    );
  }

  try {
    const { data: existingProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, tz")
      .eq("tz", tz)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { success: false, error: "לא ניתן לבדוק את פרטי ההרשמה כרגע." },
        { status: 500 },
      );
    }

    if (existingProfile) {
      const { data: existingAuthUser, error: existingAuthUserError } =
        await adminClient.auth.admin.getUserById(existingProfile.id);

      if (existingAuthUserError || !existingAuthUser.user) {
        return genericDuplicateError();
      }

      if (existingAuthUser.user.email_confirmed_at !== null) {
        return genericDuplicateError();
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(
        existingProfile.id,
      );

      if (deleteError) {
        console.warn("Signup replacement delete failed", {
          code: deleteError.code ?? null,
          message: deleteError.message,
          status: deleteError.status ?? null,
        });
        return NextResponse.json(
          { success: false, error: "לא ניתן להשלים את ההרשמה כרגע. נסה שוב." },
          { status: 409 },
        );
      }
    }

    const userMetadata = {
      first_name: firstName,
      last_name: lastName,
      tz,
      gender,
      phone_number: phoneNumber,
      birth_date: birthDate,
    };

    console.info("Signup user_metadata payload", {
      keys: Object.keys(userMetadata),
      values: { ...userMetadata, tz: maskTz(tz) },
    });

    // TODO(pre-launch): remove dev email verification bypass
    if (skipEmailVerification) {
      const { data: createdUser, error: createUserError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: userMetadata,
        });

      if (createUserError || !createdUser.user) {
        if (
          createUserError?.message.toLowerCase().includes("already registered") ||
          createUserError?.code === "email_exists"
        ) {
          return genericDuplicateError();
        }

        if (
          createUserError?.status != null &&
          createUserError.status >= 500 &&
          createUserError.status <= 599
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "לא ניתן להשלים את ההרשמה כרגע. נסה שוב מאוחר יותר.",
            },
            { status: 503 },
          );
        }

        return NextResponse.json(
          { success: false, error: "לא ניתן להשלים את ההרשמה כרגע. נסה שוב." },
          { status: 400 },
        );
      }

      // TODO(pre-launch): remove dev email verification bypass
      const profileResult = await ensureSignupProfile(adminClient, createdUser.user);
      if (profileResult.error || !profileResult.role) {
        return NextResponse.json(
          { success: false, error: "לא ניתן להשלים את הגדרת החשבון כרגע." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        email,
        verificationRequired: false,
      });
    }

    const { data: signupData, error: signupError } =
      await publicClient.auth.signUp({
        email,
        password,
        options: {
          data: userMetadata,
        },
      });

    if (signupError || !signupData.user) {
      if (signupError) {
        const errorPropertyNames = Object.getOwnPropertyNames(signupError);
        const errorProperties = signupError as unknown as Record<string, unknown>;

        console.warn("Signup Auth signUp failed", {
          name: errorPropertyNames.includes("name")
            ? errorProperties.name
            : signupError.name,
          status: errorPropertyNames.includes("status")
            ? errorProperties.status
            : signupError.status ?? null,
          code: errorPropertyNames.includes("code")
            ? errorProperties.code
            : signupError.code ?? null,
          message: errorPropertyNames.includes("message")
            ? errorProperties.message
            : signupError.message,
        });
      }

      if (signupError?.message?.toLowerCase().includes("already registered")) {
        return genericDuplicateError();
      }

      if (
        signupError?.status != null &&
        signupError.status >= 500 &&
        signupError.status <= 599
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "לא ניתן להשלים את ההרשמה או לשלוח את הודעת האימות כרגע. נסה שוב מאוחר יותר.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { success: false, error: "לא ניתן להשלים את ההרשמה כרגע. נסה שוב." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, email });
  } finally {
    await adminClient.rpc("release_signup_tz_lease", {
      p_tz_hash: tzHash,
      p_lease_token: leaseToken,
    });
  }
}
