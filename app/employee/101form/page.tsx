"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";

function normalizeDateForInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length !== 8) {
    return "";
  }

  const day = digitsOnly.slice(0, 2);
  const month = digitsOnly.slice(2, 4);
  const year = digitsOnly.slice(4, 8);

  return `${year}-${month}-${day}`;
}

type FormState = {
  fullName: string;
  identityNumber: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  maritalStatus: string;
  dependents: string;
  employerName: string;
  jobTitle: string;
  startDate: string;
  wage: string;
  bankName: string;
  branchNumber: string;
  accountNumber: string;
  iban: string;
  notes: string;
};

const initialForm: FormState = {
  fullName: "",
  identityNumber: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  postalCode: "",
  maritalStatus: "",
  dependents: "",
  employerName: "",
  jobTitle: "",
  startDate: "",
  wage: "",
  bankName: "",
  branchNumber: "",
  accountNumber: "",
  iban: "",
  notes: "",
};

export default function Form101Page() {
  const { user, profile, loading } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
    const birthDate =
      user?.user_metadata?.birth_date ||
      user?.user_metadata?.date_of_birth ||
      "";
    const normalizedBirthDate = normalizeDateForInput(birthDate);

    setForm((current) => ({
      ...current,
      fullName: current.fullName || name,
      identityNumber: current.identityNumber || profile?.tz || "",
      dateOfBirth: current.dateOfBirth || normalizedBirthDate,
      email: current.email || user?.email || "",
      phone: current.phone || user?.user_metadata?.phone || "",
    }));
  }, [profile, user]);

  const displayName = (() => {
    const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
    if (profileName) return profileName;

    const metadataName = [user?.user_metadata?.first_name, user?.user_metadata?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (metadataName) return metadataName;

    const emailName = user?.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    return emailName || "משתמש/ת";
  })();

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.id) {
      setError("יש להתחבר כדי לשלוח טופס 101.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("לא ניתן להתחבר ל-Supabase כרגע.");
      setSubmitting(false);
      return;
    }

    const submissionPayload = {
      user_id: user.id,
      full_name: form.fullName.trim(),
      identity_number: form.identityNumber.trim(),
      date_of_birth: form.dateOfBirth.trim(),
      phone: form.phone.trim(),
      email: (form.email || user.email || "").trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      postal_code: form.postalCode.trim(),
      marital_status: form.maritalStatus.trim(),
      dependents: form.dependents.trim(),
      employer_name: form.employerName.trim(),
      job_title: form.jobTitle.trim(),
      start_date: form.startDate.trim(),
      wage: form.wage.trim(),
      bank_name: form.bankName.trim(),
      branch_number: form.branchNumber.trim(),
      account_number: form.accountNumber.trim(),
      iban: form.iban.trim(),
      notes: form.notes.trim(),
      created_at: new Date().toISOString(),
    };

    const { data: existingSubmissions, error: fetchError } = await supabase
      .from("form_101_submissions")
      .select("id")
      .eq("user_id", user.id);

    if (fetchError) {
      setError("שמירת הטופס נכשלה. לא הצלחנו לבדוק הגשות קודמות.");
      setSubmitting(false);
      return;
    }

    if (existingSubmissions && existingSubmissions.length > 0) {
      const existingIds = existingSubmissions.map((submission) => submission.id);
      const { error: deleteError } = await supabase
        .from("form_101_submissions")
        .delete()
        .in("id", existingIds);

      if (deleteError) {
        setError("שמירת הטופס נכשלה. לא הצלחנו להחליף הגשה ישנה.");
        setSubmitting(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("form_101_submissions").insert(submissionPayload);

    if (insertError) {
      setError("שמירת הטופס נכשלה. בדוק שהטבלה form_101_submissions קיימת ב-Supabase.");
      setSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ form_101_status: "pending" })
      .eq("id", user.id);

    if (profileError) {
      setError("הטופס נשמר, אבל עדכון הסטטוס בפרופיל נכשל.");
      setSubmitting(false);
      return;
    }

    setMessage("הטופס נשמר בהצלחה. הוא נשלח לבדיקה.");
    setForm(initialForm);
    setSubmitting(false);
  }

  return (
    <div className="pb-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-cream/50">טופס 101</p>
          <h1 className="font-display text-2xl text-cream">הגשת טופס 101</h1>
        </div>
        <Link
          href="/employee/profile"
          className="inline-flex items-center justify-center rounded-full border border-brass/20 px-4 py-2 text-sm font-semibold text-brass transition hover:bg-brass/10"
        >
          חזור לפרופיל
        </Link>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <section className="rounded-3xl border border-brass/15 bg-surface p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brass/15 text-brass">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm text-cream/60">שלום, {loading ? "..." : displayName}</p>
              <p className="text-sm text-cream/45">מלא/י את הפרטים הבאים לשמירת טופס 101 אמיתי.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-cream">1. פרטי עובד</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">שם מלא</span>
                  <input
                    required
                    value={form.fullName}
                    onChange={(event) => handleChange("fullName", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="לדוגמה: נועה כהן"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">תעודת זהות</span>
                  <input
                    required
                    value={form.identityNumber}
                    onChange={(event) => handleChange("identityNumber", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="123456789"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">תאריך לידה</span>
                  <input
                    type="date"
                    required
                    value={form.dateOfBirth}
                    onChange={(event) => handleChange("dateOfBirth", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">חברות בקופת גמל</span>
                  <input
                    type="text"
                    value={form.maritalStatus}
                    onChange={(event) => handleChange("maritalStatus", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="סטטוס משפחתי / קופת גמל"
                  />
                </label>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold text-cream">2. כתובת ופרטי קשר</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">טלפון</span>
                  <input
                    required
                    value={form.phone}
                    onChange={(event) => handleChange("phone", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="05x-xxxxxxx"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">אימייל</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="name@example.com"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">כתובת</span>
                  <input
                    required
                    value={form.address}
                    onChange={(event) => handleChange("address", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="רחוב ועיר"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">עיר</span>
                  <input
                    required
                    value={form.city}
                    onChange={(event) => handleChange("city", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="תל אביב"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">מיקוד</span>
                  <input
                    value={form.postalCode}
                    onChange={(event) => handleChange("postalCode", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="מיקוד"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">מספר תלויים</span>
                  <input
                    value={form.dependents}
                    onChange={(event) => handleChange("dependents", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="0"
                  />
                </label>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold text-cream">3. פרטי תעסוקה</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">שם המעסיק</span>
                  <input
                    required
                    value={form.employerName}
                    onChange={(event) => handleChange("employerName", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="שם המעסיק"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">תפקיד</span>
                  <input
                    required
                    value={form.jobTitle}
                    onChange={(event) => handleChange("jobTitle", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="מלצר/ית"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">תאריך התחלה</span>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(event) => handleChange("startDate", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">שכר לשעה</span>
                  <input
                    required
                    value={form.wage}
                    onChange={(event) => handleChange("wage", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="₪"
                  />
                </label>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold text-cream">4. פרטי חשבון בנק</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">שם הבנק</span>
                  <input
                    required
                    value={form.bankName}
                    onChange={(event) => handleChange("bankName", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="בנק הפועלים"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">סניף</span>
                  <input
                    required
                    value={form.branchNumber}
                    onChange={(event) => handleChange("branchNumber", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="123"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">מספר חשבון</span>
                  <input
                    required
                    value={form.accountNumber}
                    onChange={(event) => handleChange("accountNumber", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="123456"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">IBAN</span>
                  <input
                    required
                    value={form.iban}
                    onChange={(event) => handleChange("iban", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="IL..."
                  />
                </label>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold text-cream">5. פרטים נוספים</h2>
              <label className="block text-sm text-cream/80">
                <span className="mb-2 block font-semibold">הערות נוספות</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => handleChange("notes", event.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                  placeholder="פרטים חשובים נוספים..."
                />
              </label>
            </div>
          </div>

          {message ? (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4" strokeWidth={1.8} />
              <span>{message}</span>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || loading}
            className="inline-flex items-center gap-2 rounded-full bg-brass px-5 py-3 text-sm font-semibold text-obsidian transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                שומר…
              </>
            ) : (
              <>
                שלח טופס 101
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </>
            )}
          </button>
        </section>
      </form>
    </div>
  );
}
