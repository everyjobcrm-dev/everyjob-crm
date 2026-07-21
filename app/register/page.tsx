"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    tz: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured yet.");
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.first_name,
          last_name: form.last_name,
          tz: form.tz,
        },
      },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Unable to create an account right now.");
      setLoading(false);
      return;
    }

    const result = await supabase.from("profiles").insert({
      id: data.user.id,
      first_name: form.first_name,
      last_name: form.last_name,
      tz: form.tz,
      role: "employee",
    });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setSuccess("Account created successfully. Please check your inbox to confirm your email.");
    setForm({
      first_name: "",
      last_name: "",
      tz: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setLoading(false);
    router.push("/login");
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join EveryJob CRM as an employee. Your profile will be created automatically."
      error={error}
      success={success}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="first_name">
              First Name
            </label>
            <input
              id="first_name"
              required
              value={form.first_name}
              onChange={(event) => handleChange("first_name", event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="last_name">
              Last Name
            </label>
            <input
              id="last_name"
              required
              value={form.last_name}
              onChange={(event) => handleChange("last_name", event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="tz">
            TZ (ID Number)
          </label>
          <input
            id="tz"
            required
            value={form.tz}
            onChange={(event) => handleChange("tz", event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(event) => handleChange("email", event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(event) => handleChange("password", event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={form.confirmPassword}
              onChange={(event) => handleChange("confirmPassword", event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link className="font-semibold text-cyan-400 hover:text-cyan-300" href="/login">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
