"use client";

import { ArrowRight } from "lucide-react";
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

    if (!/^[0-9]{8,9}$/.test(form.tz)) {
      setError("TZ must contain only digits and be 8–9 characters long.");
      setLoading(false);
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match. Please re-enter them carefully.");
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
      const message = signUpError?.message ?? "";
      if (message.toLowerCase().includes("already registered")) {
        setError("This email is already registered. Please use another email or reset your password.");
      } else if (message.toLowerCase().includes("password")) {
        setError("The password does not meet the required policy. Please choose a stronger password.");
      } else if (message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("too many requests")) {
        setError("Too many registration attempts. Please wait a few minutes and try again.");
      } else {
        setError("We could not create your account. Please review the form and try again.");
      }
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
      setError(`We created the auth account, but the profile could not be saved: ${result.error.message}`);
      setLoading(false);
      return;
    }

    setSuccess("Account created successfully. Please check your inbox to confirm your email before signing in.");
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
            <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="first_name">
              First Name
            </label>
            <input
              id="first_name"
              required
              value={form.first_name}
              onChange={(event) => handleChange("first_name", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-slate-950"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="last_name">
              Last Name
            </label>
            <input
              id="last_name"
              required
              value={form.last_name}
              onChange={(event) => handleChange("last_name", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-slate-950"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="tz">
            TZ (ID Number)
          </label>
          <input
            id="tz"
            required
            value={form.tz}
            onChange={(event) => handleChange("tz", event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-slate-950"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(event) => handleChange("email", event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-slate-950"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(event) => handleChange("password", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-slate-950"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={form.confirmPassword}
              onChange={(event) => handleChange("confirmPassword", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-slate-950"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
          <ArrowRight className="h-4 w-4" />
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
