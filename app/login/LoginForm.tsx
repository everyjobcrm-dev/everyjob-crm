"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getUserRole } from "@/lib/supabase/auth";

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
      setError("Supabase has not been configured for this app.");
      setLoading(false);
      return;
    }

    const normalizedIdentifier = identifier.trim();
    let email = normalizedIdentifier;

    if (!normalizedIdentifier.includes("@")) {
      try {
        const response = await fetch("/api/auth/resolve-identifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: normalizedIdentifier }),
        });

        const payload = await response.json();
        if (!response.ok || !payload.success || !payload.email) {
          setError(payload.error ?? "We could not find an account for this TZ. Please try your email instead.");
          setLoading(false);
          return;
        }

        email = payload.email;
      } catch {
        setError("We could not resolve your TZ automatically. Please use your email and password instead.");
        setLoading(false);
        return;
      }
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      const message = signInError?.message ?? "";
      if (message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("too many requests")) {
        setError("Too many attempts. Please wait a few minutes and try again, or use the password reset option.");
      } else if (message.toLowerCase().includes("invalid login credentials")) {
        setError("The email/TZ and password you entered do not match. Please try again.");
      } else if (message.toLowerCase().includes("email not confirmed")) {
        setError("Please confirm your email before signing in.");
      } else {
        setError("We could not sign you in. Please verify your credentials and try again.");
      }
      setLoading(false);
      return;
    }

    const role = await getUserRole(supabase, data.user.id);
    const destination = role === "admin" ? "/admin/dashboard" : "/employee/home";
    router.replace(redirectTo ?? destination);
    setLoading(false);
  };

  return (
    <AuthCard
      title="התחברות"
      subtitle="התחברו עם תעודת זהות או אימייל וסיסמה."
      error={error}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="identifier">
            תעודת זהות או אימייל
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="הקלידו תעודת זהות או אימייל"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="password">
            סיסמה
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link className="font-medium text-sky-600 transition hover:text-sky-700" href="/forgot-password">
            שכחת סיסמה?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "מתחבר..." : "התחבר"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        חדש כאן?{' '}
        <Link className="font-semibold text-sky-600 hover:text-sky-700" href="/register">
          צור חשבון
        </Link>
      </p>
    </AuthCard>
  );
}
