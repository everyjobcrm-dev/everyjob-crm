"use client";

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
  const [email, setEmail] = useState("");
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

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setError("Invalid credentials. Please verify your email and password.");
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
      subtitle="Welcome back. Access your CRM workspace with your email and password."
      error={error}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none ring-0 transition focus:border-cyan-400"
            placeholder="name@company.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
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
          className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
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
