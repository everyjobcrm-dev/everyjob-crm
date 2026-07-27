import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getUserRole } from "@/lib/supabase/auth";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password"];
const ADMIN_PREFIX = "/admin";
const EMPLOYEE_PREFIX = "/employee";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (PUBLIC_PATHS.includes(pathname)) {
  if (user) {
    const role = await getUserRole(supabase, user.id);

    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (role === "employee") {
      return NextResponse.redirect(new URL("/employee/dashboard", request.url));
    }
    
    return response;
  }

  return response;
}

  if (!user) {
    const redirectTo = `/login?redirectTo=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  const role = await getUserRole(supabase, user.id);

  if (pathname.startsWith(ADMIN_PREFIX) && role !== "admin") {
    return NextResponse.redirect(new URL("/employee/dashboard", request.url));
  }

  if (pathname.startsWith(EMPLOYEE_PREFIX) && role === null) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
