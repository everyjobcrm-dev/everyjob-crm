"use client";

import { ArrowLeft } from "lucide-react"; // Using ArrowLeft because it's RTL (points forward in Hebrew)
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { AuthCard } from "@/components/AuthCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isValidIsraeliId } from "@/lib/validations/israeli-id";
import { readJsonResponse } from "@/lib/http/read-json";

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
    if (!isValidIsraeliId(form.tz)) {
      setError("מספר תעודת הזהות אינו תקין. יש להזין מספר ישראלי תקף.");
      setLoading(false);
      return;
    }
    
    if (!/^0(5[0-9]{8}|[23489][0-9]{7})$/.test(form.phone_number)) {
      setError("מספר טלפון לא תקין. יש להזין מספר ישראלי ללא מקפים.");
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

    try {
      const registrationResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          tz: form.tz,
          birth_date: form.birth_date,
          phone_number: form.phone_number,
          gender: form.gender,
        }),
      });
      // Defensive parse: a proxy/redirect/5xx can return HTML or an empty body instead of JSON.
      const registrationPayload = await readJsonResponse<{
        success?: boolean;
        error?: string;
        email?: string;
        verificationRequired?: boolean;
      }>(registrationResponse);

      if (!registrationPayload) {
        setError("שירות ההרשמה אינו זמין כרגע. נסה שוב מאוחר יותר.");
        setLoading(false);
        return;
      }

      if (!registrationResponse.ok || !registrationPayload.success) {
        setError(registrationPayload.error ?? "ההרשמה נכשלה. נסה שוב.");
        setLoading(false);
        return;
      }

      // TODO(pre-launch): remove dev email verification bypass
      if (registrationPayload.verificationRequired === false) {
        setSuccess("החשבון נוצר בהצלחה. אתה מועבר להתחברות...");
        setLoading(false);
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      setPendingEmail(registrationPayload.email ?? "");
    } catch (caughtError) {
      const thrownError = caughtError as {
        message?: unknown;
        status?: unknown;
        code?: unknown;
      };
      const thrownMessage = typeof thrownError.message === "string" ? thrownError.message.trim() : "";
      const thrownStatus = typeof thrownError.status === "number" ? thrownError.status : null;

      console.warn("Registration request failed", {
        message: thrownMessage || "No error message returned",
        status: thrownStatus,
        code: typeof thrownError.code === "string" ? thrownError.code : null,
      });
      setError(
        thrownMessage
          ? `${thrownMessage}${thrownStatus ? ` (${thrownStatus})` : ""}`
          : `שירות ההרשמה החזיר שגיאת שרת${thrownStatus ? ` (${thrownStatus})` : ""}. נסה שוב מאוחר יותר.`,
      );
      setLoading(false);
      return;
    }

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

    // Profile creation is handled atomically by the auth.users insert trigger.
    // Do not write to public.profiles here; the trigger is the single source of truth.
    setSuccess("האימייל אומת בהצלחה. אתה מועבר להתחברות...");
    setTimeout(() => router.push("/login"), 2000);
  };

  const inputClasses = "field";
  const labelClasses = "mb-1.5 block text-sm font-semibold text-ink";

  return (
    <AuthCard
      title="יצירת חשבון"
      subtitle="הצטרפו ל-everyJob עם חשבון חדש."
      error={error}
      success={success}
    >
      {verificationStep ? (
        <form className="space-y-6" onSubmit={handleVerifyEmail}>
          <div className="rounded-lg border-s-4 border-sky bg-sky/15 p-4 text-sm text-sky-deep">
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
            className="btn btn-primary btn-lg group w-full"
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
                  <span className="ms-2 inline-flex items-center rounded-sm bg-sun px-2 py-0.5 text-xs font-bold text-ink">
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
            className="btn btn-primary btn-lg group mt-2 w-full"
          >
            {loading ? "יוצר חשבון..." : "צור משתמש"}
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm font-medium text-muted">
        כבר יש לך חשבון?{' '}
        <Link className="font-bold text-primary-soft underline decoration-2 underline-offset-4" href="/login">
          התחבר
        </Link>
      </p>
    </AuthCard>
  );
}