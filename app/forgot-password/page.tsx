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
          <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="email">
            אימייל
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field"
            placeholder="name@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-lg group w-full"
        >
          {loading ? "שולח..." : "שלח קישור לאיפוס"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        חזרו ל{' '}
        <Link className="font-semibold text-primary-soft hover:underline" href="/login">
          התחברות
        </Link>
      </p>
    </AuthCard>
  );
}
