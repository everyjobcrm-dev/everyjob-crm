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
      title="איפוס סיסמה"
      subtitle="הקלידו את האימייל שלכם ותישלח אליכם קישור לאיפוס הסיסמה."
      error={error}
      success={success}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">
            אימייל
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="name@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "שולח..." : "שלח קישור לאיפוס"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        חזרו ל{' '}
        <Link className="font-semibold text-sky-600 hover:text-sky-700" href="/login">
          התחברות
        </Link>
      </p>
    </AuthCard>
  );
}
