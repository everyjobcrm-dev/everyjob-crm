"use client";

import { ArrowLeft } from "lucide-react"; // Using ArrowLeft because it's RTL (points forward in Hebrew)
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { AuthCard } from "@/components/AuthCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Helper to calculate age dynamically
const calculateAge = (dob: string): number | null => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    tz: "",
    birth_date: "",
    phone_number: "",
    gender: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Verification State
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingProfile, setPendingProfile] = useState<{
    first_name: string;
    last_name: string;
    tz: string;
    birth_date: string;
    phone_number: string;
    gender: string;
  } | null>(null);

  // Auto-calculated age based on birth_date input
  const age = useMemo(() => calculateAge(form.birth_date), [form.birth_date]);

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
      setError("המערכת אינה מוגדרת כראוי. נסה שוב מאוחר יותר.");
      setLoading(false);
      return;
    }

    // Validations
    if (!/^[0-9]{8,9}$/.test(form.tz)) {
      setError("תעודת זהות חייבת להכיל 8-9 ספרות בלבד.");
      setLoading(false);
      return;
    }
    
    if (!/^[0-9]{9,10}$/.test(form.phone_number)) {
      setError("מספר טלפון לא תקין.");
      setLoading(false);
      return;
    }

    if (!form.birth_date) {
      setError("אנא בחר תאריך לידה.");
      setLoading(false);
      return;
    }
    
    if (!form.gender) {
      setError("אנא בחר מין.");
      setLoading(false);
      return;
    }

    if (form.password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים.");
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("הסיסמאות אינן תואמות. אנא נסה שוב.");
      setLoading(false);
      return;
    }

    const pendingProfilePayload = {
      first_name: form.first_name,
      last_name: form.last_name,
      tz: form.tz,
      birth_date: form.birth_date,
      phone_number: form.phone_number,
      gender: form.gender,
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
      const message = signUpError?.message?.toLowerCase() ?? "";
      if (message.includes("already registered")) {
        setError("אימייל זה כבר רשום במערכת.");
      } else if (message.includes("password")) {
        setError("הסיסמה חלשה מדי. בחר סיסמה מורכבת יותר.");
      } else if (message.includes("rate limit") || message.includes("too many requests")) {
        setError("יותר מדי ניסיונות. אנא המתן מספר דקות ונסה שוב.");
      } else {
        setError("לא הצלחנו ליצור את החשבון. אנא בדוק את הפרטים ונסה שוב.");
      }
      setLoading(false);
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: form.email,
      options: { shouldCreateUser: false },
    });

    if (otpError) {
      setError("החשבון נוצר, אך חלה שגיאה בשליחת קוד האימות. אנא נסה שוב.");
      setLoading(false);
      return;
    }

    setPendingEmail(form.email);
    setVerificationStep(true);
    setVerificationCode("");
    setSuccess("החשבון נוצר! שלחנו קוד אימות לאימייל שלך. הכנס אותו למטה.");
    setLoading(false);
  };

  const handleVerifyEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVerificationLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createSupabaseBrowserClient();
    
    // 1. ADD THIS GUARD: Tell TypeScript (and the browser) what to do if Supabase fails to load
    if (!supabase) {
      setError("המערכת אינה מוגדרת כראוי. נסה שוב מאוחר יותר.");
      setVerificationLoading(false);
      return;
    }

    // 2. Your existing checks...
    if (!pendingEmail || !verificationCode.trim()) {
      setError("אנא הכנס את קוד האימות שקיבלת.");
      setVerificationLoading(false);
      return;
    }

    // 3. TypeScript is now happy! It knows `supabase` is definitely not null here.
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: verificationCode.trim(),
      type: "email",
    });
    if (verifyError || !verifyData?.user?.id) {
      setError("קוד האימות שגוי או פג תוקף. אנא נסה שוב.");
      setVerificationLoading(false);
      return;
    }

    if (!pendingProfile) {
      setError("שגיאה במציאת פרטי ההרשמה. אנא נסה שוב.");
      setVerificationLoading(false);
      return;
    }

    const profilePayload = {
      id: verifyData.user.id,
      first_name: pendingProfile.first_name,
      last_name: pendingProfile.last_name,
      tz: pendingProfile.tz,
      birth_date: pendingProfile.birth_date || null,
      phone_number: pendingProfile.phone_number,
      gender: pendingProfile.gender,
      email: pendingEmail,
      role: "employee",
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (profileError) {
      // Fallback to API route if direct insert fails (e.g., due to strict RLS)
      const profileResponse = await fetch("/api/auth/create-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(verifyData.session?.access_token
            ? { Authorization: `Bearer ${verifyData.session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ userId: verifyData.user.id, ...pendingProfile }),
      });

      if (!profileResponse.ok) {
        setError("האימייל אומת, אך לא הצלחנו לשמור את הפרופיל כרגע.");
        setVerificationLoading(false);
        return;
      }
    }

    setSuccess("האימייל אומת בהצלחה. אתה מועבר להתחברות...");
    setTimeout(() => router.push("/login"), 2000);
  };

  const inputClasses = "w-full rounded-sm border-2 border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-[#4F46E5] focus:bg-white";
  const labelClasses = "mb-1.5 block text-sm font-bold text-slate-900";

  return (
    <AuthCard
      title="יצירת חשבון"
      subtitle="הצטרפו ל-everyJob עם חשבון חדש."
      error={error}
      success={success}
    >
      {verificationStep ? (
        <form className="space-y-6" onSubmit={handleVerifyEmail}>
          <div className="border-s-4 border-[#4F46E5] bg-[#4F46E5]/5 p-4 text-sm text-[#4F46E5]">
            <p className="font-bold">אימות אימייל</p>
            <p className="mt-1">שלחנו לך קוד אימות לאימייל שלך. הכנס אותו כדי להשלים את ההרשמה.</p>
          </div>

          <div>
            <label className={labelClasses} htmlFor="verificationCode">קוד אימות</label>
            <input
              id="verificationCode"
              required
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
              className={inputClasses}
              placeholder="הקלידו את הקוד שקיבלת"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={verificationLoading}
            className="group flex w-full items-center justify-center gap-2 rounded-sm bg-[#09090B] px-4 py-3.5 font-bold text-white transition-all hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verificationLoading ? "מאמת..." : "אמת אימייל"}
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </button>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClasses} htmlFor="first_name">שם פרטי</label>
              <input
                id="first_name"
                required
                value={form.first_name}
                onChange={(event) => handleChange("first_name", event.target.value)}
                className={inputClasses}
                placeholder="ישראל"
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="last_name">שם משפחה</label>
              <input
                id="last_name"
                required
                value={form.last_name}
                onChange={(event) => handleChange("last_name", event.target.value)}
                className={inputClasses}
                placeholder="ישראלי"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClasses} htmlFor="tz">תעודת זהות</label>
              <input
                id="tz"
                required
                value={form.tz}
                onChange={(event) => handleChange("tz", event.target.value)}
                className={inputClasses}
                placeholder="8–9 ספרות"
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="phone_number">מספר טלפון</label>
              <input
                id="phone_number"
                type="tel"
                required
                value={form.phone_number}
                onChange={(event) => handleChange("phone_number", event.target.value)}
                className={inputClasses}
                placeholder="050-0000000"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClasses} htmlFor="birth_date">
                תאריך לידה
                {age !== null && (
                  <span className="ms-2 inline-flex items-center rounded-sm bg-[#D4FF00] px-2 py-0.5 text-xs font-bold text-black">
                    גיל: {age}
                  </span>
                )}
              </label>
              <input
                id="birth_date"
                type="date"
                required
                value={form.birth_date}
                onChange={(event) => handleChange("birth_date", event.target.value)}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="gender">מין</label>
              <select
                id="gender"
                required
                value={form.gender}
                onChange={(event) => handleChange("gender", event.target.value)}
                className={inputClasses}
              >
                <option value="" disabled>בחרו...</option>
                <option value="male">זכר</option>
                <option value="female">נקבה</option>
                <option value="other">אחר</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClasses} htmlFor="email">אימייל</label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
              className={inputClasses}
              placeholder="name@example.com"
              dir="ltr"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClasses} htmlFor="password">סיסמה</label>
              <input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(event) => handleChange("password", event.target.value)}
                className={inputClasses}
                placeholder="8 תווים לפחות"
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="confirmPassword">אימות סיסמה</label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={(event) => handleChange("confirmPassword", event.target.value)}
                className={inputClasses}
                placeholder="הקלידו שוב"
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group mt-2 flex w-full items-center justify-center gap-2 rounded-sm border-2 border-[#09090B] bg-[#4F46E5] px-4 py-3.5 font-bold text-white shadow-[4px_4px_0px_0px_#D4FF00] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {loading ? "יוצר חשבון..." : "צור משתמש"}
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm font-medium text-slate-500">
        כבר יש לך חשבון?{' '}
        <Link className="font-bold text-[#4F46E5] underline decoration-2 underline-offset-4 transition hover:text-[#09090B]" href="/login">
          התחבר
        </Link>
      </p>
    </AuthCard>
  );
}