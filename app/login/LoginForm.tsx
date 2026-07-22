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
      title="Sign in"
      subtitle="Sign in with your TZ or email and password."
      error={error}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="identifier">
            TZ or Email
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400 focus:bg-slate-950"
            placeholder="Enter TZ or email"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-slate-950"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link className="font-medium text-cyan-400 transition hover:text-cyan-300" href="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        New here?{' '}
        <Link className="font-semibold text-cyan-400 hover:text-cyan-300" href="/register">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
