"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (resetError) {
      const message = resetError.message ?? "";
      if (message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("too many requests")) {
        setError("Too many reset attempts. Please wait a few minutes and try again.");
      } else if (message.toLowerCase().includes("not found")) {
        setError("No account was found for this email. Please check the address or create a new account.");
      } else {
        setError("We could not send the reset link right now. Please try again in a moment.");
      }
      setLoading(false);
      return;
    }

    setSuccess("A password reset link has been sent to your email. If you are locked out, this is the fastest way to recover access.");
    setEmail("");
    setLoading(false);
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email to receive a reset link."
      error={error}
      success={success}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:bg-slate-950"
            placeholder="name@company.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Return to{' '}
        <Link className="font-semibold text-cyan-400 hover:text-cyan-300" href="/login">
          sign in
        </Link>
      </p>
    </AuthCard>
  );
}
