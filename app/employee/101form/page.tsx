"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";

type FormState = {
  fullName: string;
  identityNumber: string;
  phone: string;
  email: string;
  address: string;
  bankDetails: string;
  notes: string;
};

const initialForm: FormState = {
  fullName: "",
  identityNumber: "",
  phone: "",
  email: "",
  address: "",
  bankDetails: "",
  notes: "",
};

export default function Form101Page() {
  const { user, profile, loading } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      phone: form.phone.trim(),
      email: (form.email || user.email || "").trim(),
      address: form.address.trim(),
      bank_details: form.bankDetails.trim(),
      notes: form.notes.trim(),
      created_at: new Date().toISOString(),
    };

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
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-cream/50">טופס 101</p>
          <h1 className="font-display text-2xl text-cream">יצירת טופס 101</h1>
        </div>
        <Link
          href="/employee/profile"
          className="rounded-full border border-brass/20 px-3 py-2 text-sm font-semibold text-brass transition hover:bg-brass/10"
        >
          חזור לפרופיל
        </Link>
      </div>

      <section className="rounded-3xl border border-brass/20 bg-surface p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brass/15 bg-surface2 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brass/15 text-brass">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm text-cream/60">שלום, {loading ? "..." : displayName}</p>
            <p className="text-sm text-cream/45">מלא/י את הפרטים הבאים כדי לשמור את הטופס במערכת.</p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
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
                value={form.email}
                onChange={(event) => handleChange("email", event.target.value)}
                className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                placeholder="name@example.com"
              />
            </label>
          </div>

          <label className="block text-sm text-cream/80">
            <span className="mb-2 block font-semibold">כתובת</span>
            <input
              required
              value={form.address}
              onChange={(event) => handleChange("address", event.target.value)}
              className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
              placeholder="תל אביב, רחוב ..."
            />
          </label>

          <label className="block text-sm text-cream/80">
            <span className="mb-2 block font-semibold">פרטי חשבון / בנק</span>
            <input
              required
              value={form.bankDetails}
              onChange={(event) => handleChange("bankDetails", event.target.value)}
              className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
              placeholder="פרטי בנק, מספר חשבון, שם הבנק"
            />
          </label>

          <label className="block text-sm text-cream/80">
            <span className="mb-2 block font-semibold">הערות</span>
            <textarea
              value={form.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
              placeholder="הוסף הערות או מידע נוסף"
            />
          </label>

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
        </form>
      </section>
    </div>
  );
}
