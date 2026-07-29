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
    birth_date: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingProfile, setPendingProfile] = useState<{
    first_name: string;
    last_name: string;
    tz: string;
    birth_date: string;
  } | null>(null);

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

    if (!form.birth_date) {
      setError("Please choose your date of birth.");
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

    const pendingProfilePayload = {
      first_name: form.first_name,
      last_name: form.last_name,
      tz: form.tz,
      birth_date: form.birth_date,
    };

    setPendingProfile(pendingProfilePayload);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: pendingProfilePayload,
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

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: form.email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (otpError) {
      console.error("OTP ERROR:", otpError.message, otpError.status);
      setError("The account was created, but we could not send the verification code. Please try again.");
      setLoading(false);
      return;
    }

    setPendingEmail(form.email);
    setVerificationStep(true);
    setVerificationCode("");
    setSuccess("Account created. We sent a verification code to your email. Enter it below to continue.");
    setForm({
      first_name: "",
      last_name: "",
      tz: "",
      birth_date: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setLoading(false);
  };

  const handleVerifyEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVerificationLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured yet.");
      setVerificationLoading(false);
      return;
    }

    if (!pendingEmail || !verificationCode.trim()) {
      setError("Please enter the verification code from your email.");
      setVerificationLoading(false);
      return;
    }

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: verificationCode.trim(),
      type: "email",
    });

    if (verifyError) {
      setError("The verification code is invalid or has expired. Please try again.");
      setVerificationLoading(false);
      return;
    }

    const verifiedUserId = verifyData?.user?.id;

    if (!verifiedUserId) {
      setError("We could not complete the verification flow. Please try again.");
      setVerificationLoading(false);
      return;
    }

    if (!pendingProfile) {
      setError("We could not find your registration details. Please try again.");
      setVerificationLoading(false);
      return;
    }

    console.info("Register verification succeeded", {
      userId: verifiedUserId,
      email: pendingEmail,
      hasSession: Boolean(verifyData.session),
      payload: pendingProfile,
    });

    const profilePayload = {
      id: verifiedUserId,
      first_name: pendingProfile.first_name,
      last_name: pendingProfile.last_name,
      tz: pendingProfile.tz,
      birth_date: pendingProfile.birth_date || null,
      email: pendingEmail,
      role: "employee",
    };

    const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });

    if (profileError) {
      console.error("Direct profiles upsert failed", profileError);

      const profileResponse = await fetch("/api/auth/create-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(verifyData.session?.access_token
            ? { Authorization: `Bearer ${verifyData.session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          userId: verifiedUserId,
          ...pendingProfile,
        }),
      });

      if (!profileResponse.ok) {
        const profileMessage = await profileResponse.text();
        console.error("PROFILE CREATE ERROR:", profileMessage);
        setError("Your email is verified, but we could not save your profile yet. Please try again in a moment.");
        setVerificationLoading(false);
        return;
      }
    }

    setSuccess("Email verified successfully. You can sign in now.");
    setVerificationStep(false);
    setVerificationCode("");
    setPendingEmail("");
    setPendingProfile(null);
    setVerificationLoading(false);
    router.push("/login");
  };

  return (
    <AuthCard
      title="יצירת חשבון"
      subtitle="הצטרפו למערכת everyJob עם חשבון חדש ונוח."
      error={error}
      success={success}
    >
      {verificationStep ? (
        <form className="space-y-4" onSubmit={handleVerifyEmail}>
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800">
            <p className="font-semibold">אימות אימייל</p>
            <p className="mt-1">שלחנו לך קוד אימות לאימייל שלך. הכנס אותו כדי להשלים את ההרשמה.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="verificationCode">קוד אימות</label>
            <input
              id="verificationCode"
              required
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="הקלידו את הקוד שקיבלת"
            />
          </div>

          <button
            type="submit"
            disabled={verificationLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verificationLoading ? "מאמת..." : "אמת אימייל"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="first_name">שם פרטי</label>
            <input
              id="first_name"
              required
              value={form.first_name}
              onChange={(event) => handleChange("first_name", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="הקלידו שם פרטי"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="last_name">שם משפחה</label>
            <input
              id="last_name"
              required
              value={form.last_name}
              onChange={(event) => handleChange("last_name", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="הקלידו שם משפחה"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="tz">תעודת זהות</label>
          <input
            id="tz"
            required
            value={form.tz}
            onChange={(event) => handleChange("tz", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="הקלידו 8–9 ספרות"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="birth_date">תאריך לידה</label>
          <input
            id="birth_date"
            type="date"
            required
            value={form.birth_date}
            onChange={(event) => handleChange("birth_date", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">אימייל</label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(event) => handleChange("email", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="name@example.com"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="password">סיסמה</label>
            <input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(event) => handleChange("password", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="הקלידו סיסמה"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="confirmPassword">אימות סיסמה</label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={form.confirmPassword}
              onChange={(event) => handleChange("confirmPassword", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="הקלידו שוב"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "יוצר חשבון..." : "צור משתמש"}
          <ArrowRight className="h-4 w-4" />
        </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        כבר יש לך חשבון?{' '}
        <Link className="font-semibold text-sky-600 hover:text-sky-700" href="/login">
          התחבר
        </Link>
      </p>
    </AuthCard>
  );
}