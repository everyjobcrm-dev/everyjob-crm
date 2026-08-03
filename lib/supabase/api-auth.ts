import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/supabase/auth";

type Role = "admin" | "employee" | "recruiter";

type RequireAuthResult =
  | { authorized: true; user: { id: string; email: string | undefined }; role: Role | null }
  | { authorized: false; response: NextResponse };

/**
 * Verifies the request has a valid, authenticated Supabase session.
 * Optionally restricts access to specific roles.
 *
 * Usage in an API route:
 *
 *   export async function POST(request: Request) {
 *     const auth = await requireAuth(["admin"]);
 *     if (!auth.authorized) return auth.response;
 *
 *     // auth.user.id, auth.role are available here
 *   }
 */
export async function requireAuth(allowedRoles?: Role[]): Promise<RequireAuthResult> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No-op: API routes don't need to write cookies back.
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  const role = await getUserRole(supabase, user.id);

  if (allowedRoles && (!role || !allowedRoles.includes(role as Role))) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "You do not have permission to perform this action." },
        { status: 403 },
      ),
    };
  }

  return {
    authorized: true,
    user: { id: user.id, email: user.email },
    role: role as Role | null,
  };
}