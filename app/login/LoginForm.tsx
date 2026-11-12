"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getUserRole } from "@/lib/supabase/auth";
import { readJsonResponse } from "@/lib/http/read-json";

const LOGIN_REQUEST_TIMEOUT_MS = 15_000;

function withTimeout<T>(request: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Login request timed out")), LOGIN_REQUEST_TIMEOUT_MS);
  });

  return Promise.race([request, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;
  
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("שירות ההתחברות אינו מוגדר. פנו לתמיכה.");
      setLoading(false);
      return;
    }

    const normalizedIdentifier = identifier.trim();
    let emailToLogin = normalizedIdentifier;

    // If there is no '@' symbol, assume it is a TZ and resolve it
    if (!normalizedIdentifier.includes("@")) {
      try {
        const response = await fetch("/api/auth/resolve-identifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: normalizedIdentifier }),
          signal: AbortSignal.timeout(LOGIN_REQUEST_TIMEOUT_MS),
        });

        // Defensive parse: never crash on an HTML/empty response.
        const payload = await readJsonResponse<{ success?: boolean; email?: string; error?: string }>(response);

        if (!payload) {
          setError("שירות ההתחברות אינו זמין כרגע. נסו שוב מאוחר יותר או התחברו עם אימייל וסיסמה.");
          setLoading(false);
          return;
        }

        if (!response.ok || !payload.success || !payload.email) {
          setError(payload.error ?? "לא נמצא חשבון עם תעודת הזהות הזו. נסו להתחבר עם אימייל.");
          setLoading(false);
          return;
        }

        emailToLogin = payload.email;
      } catch {
        setError("לא הצלחנו לזהות את תעודת הזהות. התחברו עם אימייל וסיסמה.");
        setLoading(false);
        return;
      }
    }

    let signInResult;
    try {
      signInResult = await withTimeout(
        supabase.auth.signInWithPassword({
          email: emailToLogin,
          password,
        }),
      );
    } catch {
      setError("ההתחברות מתעכבת. בדקו את החיבור ונסו שוב.");
      setLoading(false);
      return;
    }

    const { data, error: signInError } = signInResult;

    if (signInError || !data.user) {
      const message = signInError?.message ?? "";
      if (message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("too many requests")) {
        setError("יותר מדי ניסיונות. המתינו כמה דקות ונסו שוב, או אפסו את הסיסמה.");
      } else if (message.toLowerCase().includes("banned")) {
        // soft-deleted users are banned in Auth (p10c)
        setError("החשבון אינו פעיל. לפרטים פנו למשרד.");
      } else if (message.toLowerCase().includes("invalid login credentials")) {
        setError("תעודת הזהות/האימייל או הסיסמה שגויים. נסו שוב.");
      } else if (message.toLowerCase().includes("email not confirmed")) {
        setError("יש לאשר את כתובת האימייל לפני ההתחברות.");
      } else {
        setError("לא הצלחנו לחבר אותך. בדקו את הפרטים ונסו שוב.");
      }
      setLoading(false);
      return;
    }
  
    let role = await withTimeout(getUserRole(supabase, data.user.id)).catch(() => null);
    if (role && !new Set(["admin", "manager", "employee", "recruiter"]).has(role)) {
      role = null;
    }

    // TODO(pre-launch): remove dev email verification bypass
    if (!role && data.session?.access_token) {
      const profileResponse = await fetch("/api/auth/ensure-profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        signal: AbortSignal.timeout(LOGIN_REQUEST_TIMEOUT_MS),
      }).catch(() => null);

      if (profileResponse?.ok) {
        const profilePayload = await profileResponse.json().catch(() => null);
        if (profilePayload?.success && typeof profilePayload.role === "string") {
          role = profilePayload.role;
        }
      }
    }

    const destination =
      redirectTo ??
      (role === "admin"
        ? "/admin/dashboard"
        : role === "manager" || role === "recruiter"
        ? "/manager/events"
        : role === "employee"
        ? "/employee/dashboard"
        : null);

    if (destination) {
      window.location.href = destination;
    } else {
      setError("החשבון שלך עדיין לא הוגדר במלואו. פנה/י לתמיכה.");
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="התחברות"
      subtitle="התחברו עם תעודת זהות או אימייל וסיסמה."
      error={error}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="identifier">
            תעודת זהות או אימייל
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="field"
            placeholder="הקלידו תעודת זהות או אימייל"
            suppressHydrationWarning={true}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="password">
            סיסמה
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
            placeholder="••••••••"
            suppressHydrationWarning={true}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link className="font-medium text-primary-soft hover:underline" href="/forgot-password">
            שכחת סיסמה?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          suppressHydrationWarning={true}
          className="btn btn-primary btn-lg group w-full"
        >
          {loading ? "מתחבר..." : "התחבר"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        חדש כאן?{' '}
        <Link className="font-semibold text-primary-soft hover:underline" href="/register">
          צור חשבון
        </Link>
      </p>
    </AuthCard>
  );
}