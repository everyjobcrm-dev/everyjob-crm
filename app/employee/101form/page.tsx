"use client";

import { useEffect, useMemo, useState } from "react";
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



function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "y";
  }

  return false;
}

function isEligibleChildByBirthDate(dateOfBirth: string) {
  if (!dateOfBirth) return false;

  const birthDate = new Date(dateOfBirth);

  // סוף שנת המס
  const endOfTaxYear = new Date(new Date().getFullYear(), 11, 31);

  let age = endOfTaxYear.getFullYear() - birthDate.getFullYear();

  const birthdayPassed =
    endOfTaxYear.getMonth() > birthDate.getMonth() ||
    (endOfTaxYear.getMonth() === birthDate.getMonth() &&
      endOfTaxYear.getDate() >= birthDate.getDate());

  if (!birthdayPassed) {
    age--;
  }

  return age < 18;
}

type FormState = {
  employerName: string;
  employerTaxFileNumber: string;
  firstName: string;
  lastName: string;
  identityNumber: string;
  dateOfBirth: string;
  dateOfImmigration: string;
  gender: string;
  israeliResidentStatus: string;
  street: string;
  houseNumber: string;
  apartment: string;
  city: string;
  postalCode: string;
  email: string;
  mobilePhone: string;
  maritalStatus: string;
  spouseName: string;
  spouseId: string;
  spouseEmploymentStatus: string;
  employmentStartDate: string;
  israeliResident: boolean;
  newImmigrant: boolean;
  returningResident: boolean;
  singleParent: boolean;
  eligibleChildren: boolean;
  disabledEmployee: boolean;
  disabledChild: boolean;
  academicDegreeEligibility: boolean;
  releasedSoldier: boolean;
  taxCoordination: boolean;
  additionalEmployer: boolean;
  pensionIncome: boolean;
  otherTaxCreditEligibility: boolean;
};

const initialForm: FormState = {
  employerName: "",
  employerTaxFileNumber: "",
  firstName: "",
  lastName: "",
  identityNumber: "",
  dateOfBirth: "",
  dateOfImmigration: "",
  gender: "",
  israeliResidentStatus: "",
  street: "",
  houseNumber: "",
  apartment: "",
  city: "",
  postalCode: "",
  email: "",
  mobilePhone: "",
  maritalStatus: "",
  spouseName: "",
  spouseId: "",
  spouseEmploymentStatus: "",
  employmentStartDate: "",
  israeliResident: false,
  newImmigrant: false,
  returningResident: false,
  singleParent: false,
  eligibleChildren: false,
  disabledEmployee: false,
  disabledChild: false,
  academicDegreeEligibility: false,
  releasedSoldier: false,
  taxCoordination: false,
  additionalEmployer: false,
  pensionIncome: false,
  otherTaxCreditEligibility: false,
};

const requiredFieldMetadata: Array<{ key: keyof FormState; label: string }> = [
  { key: "employerName", label: "שם המעסיק" },
  { key: "employerTaxFileNumber", label: "מספר תיק ניכויים" },
  { key: "firstName", label: "שם פרטי" },
  { key: "lastName", label: "שם משפחה" },
  { key: "identityNumber", label: "מספר תעודת זהות" },
  { key: "dateOfBirth", label: "תאריך לידה" },
  { key: "street", label: "רחוב" },
  { key: "houseNumber", label: "מספר בית" },
  { key: "city", label: "עיר" },
  { key: "postalCode", label: "מיקוד" },
  { key: "email", label: "אימייל" },
  { key: "mobilePhone", label: "מספר נייד" },
  { key: "employmentStartDate", label: "תאריך תחילת עבודה" },
];

const taxFlagMetadata: Array<{ key: keyof FormState; label: string }> = [
  { key: "israeliResident", label: "תושב ישראל" },
  { key: "newImmigrant", label: "עולה חדש" },
  { key: "returningResident", label: "תושב חוזר" },
  { key: "singleParent", label: "הורה יחיד" },
  { key: "eligibleChildren", label: "ילדים זכאים(עד סוף שנת המס נשאר מתחת ל-18)" },
  { key: "disabledEmployee", label: "עובד עם מוגבלות" },
  { key: "disabledChild", label: "ילד עם מוגבלות" },
  { key: "academicDegreeEligibility", label: "זכאות לתואר אקדמי" },
  { key: "releasedSoldier", label: "חייל משוחרר" },
  { key: "taxCoordination", label: "תיאום מס" },
  { key: "additionalEmployer", label: "מעסיק נוסף" },
  { key: "pensionIncome", label: "הכנסת פנסיה" },
  { key: "otherTaxCreditEligibility", label: "זיכוי מס נוסף" },
];

function buildAutoPopulatedForm(
  profile: { first_name?: string | null; last_name?: string | null; tz?: string | null; birth_date?: string | null } | null,
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null,
): FormState {
  const metadata = user?.user_metadata ?? {};
  const firstName = String(profile?.first_name ?? metadata.first_name ?? "").trim();
  const lastName = String(profile?.last_name ?? metadata.last_name ?? "").trim();
  const identityNumber = String(profile?.tz ?? metadata.tz ?? "").trim();
  const dateOfBirth = normalizeDateForInput(
    String(profile?.birth_date ?? metadata.birth_date ?? metadata.date_of_birth ?? "").trim(),
  );
  const dateOfImmigration = normalizeDateForInput(
    String(metadata.date_of_immigration ?? metadata.immigration_date ?? "").trim(),
  );
  const employmentStartDate = normalizeDateForInput(
    String(metadata.employment_start_date ?? metadata.start_date ?? "").trim(),
  );

  return {
    employerName: String(metadata.employer_name ?? "").trim(),
    employerTaxFileNumber: String(metadata.employer_tax_file_number ?? metadata.deductions_file_num ?? "").trim(),
    firstName,
    lastName,
    identityNumber,
    dateOfBirth,
    dateOfImmigration,
    gender: String(metadata.gender ?? "").trim(),
    israeliResidentStatus: String(metadata.israeli_resident_status ?? metadata.resident_status ?? "").trim(),
    street: String(metadata.street ?? "").trim(),
    houseNumber: String(metadata.house_number ?? "").trim(),
    apartment: String(metadata.apartment ?? "").trim(),
    city: String(metadata.city ?? "").trim(),
    postalCode: String(metadata.postal_code ?? "").trim(),
    email: String(user?.email ?? metadata.email ?? "").trim(),
    mobilePhone: String(metadata.mobile_phone ?? metadata.phone_number ?? metadata.phone ?? "").trim(),
    maritalStatus: String(metadata.marital_status ?? "").trim(),
    spouseName: String(metadata.spouse_name ?? "").trim(),
    spouseId: String(metadata.spouse_id ?? "").trim(),
    spouseEmploymentStatus: String(metadata.spouse_employment_status ?? "").trim(),
    employmentStartDate,
    israeliResident: normalizeBoolean(metadata.israeli_resident),
    newImmigrant: normalizeBoolean(metadata.new_immigrant),
    returningResident: normalizeBoolean(metadata.returning_resident),
    singleParent: normalizeBoolean(metadata.single_parent),
    eligibleChildren: normalizeBoolean(metadata.eligible_children),
    disabledEmployee: normalizeBoolean(metadata.disabled_employee),
    disabledChild: normalizeBoolean(metadata.disabled_child),
    academicDegreeEligibility: normalizeBoolean(metadata.academic_degree_eligibility),
    releasedSoldier: normalizeBoolean(metadata.released_soldier),
    taxCoordination: normalizeBoolean(metadata.tax_coordination),
    additionalEmployer: normalizeBoolean(metadata.additional_employer),
    pensionIncome: normalizeBoolean(metadata.pension_income),
    otherTaxCreditEligibility: normalizeBoolean(metadata.other_tax_credit_eligibility),
  };
}

function hasValue(value: string | boolean) {
  return typeof value === "boolean" ? value : value.trim().length > 0;
}

export default function Form101Page() {
  const { user, profile, loading } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const autoPopulatedForm = buildAutoPopulatedForm(profile, user);
    setForm((current) => ({
      ...current,
      ...autoPopulatedForm,
      employerName: current.employerName || autoPopulatedForm.employerName,
      employerTaxFileNumber: current.employerTaxFileNumber || autoPopulatedForm.employerTaxFileNumber,
      firstName: current.firstName || autoPopulatedForm.firstName,
      lastName: current.lastName || autoPopulatedForm.lastName,
      identityNumber: current.identityNumber || autoPopulatedForm.identityNumber,
      dateOfBirth: current.dateOfBirth || autoPopulatedForm.dateOfBirth,
      dateOfImmigration: current.dateOfImmigration || autoPopulatedForm.dateOfImmigration,
      gender: current.gender || autoPopulatedForm.gender,
      israeliResidentStatus: current.israeliResidentStatus || autoPopulatedForm.israeliResidentStatus,
      street: current.street || autoPopulatedForm.street,
      houseNumber: current.houseNumber || autoPopulatedForm.houseNumber,
      apartment: current.apartment || autoPopulatedForm.apartment,
      city: current.city || autoPopulatedForm.city,
      postalCode: current.postalCode || autoPopulatedForm.postalCode,
      email: current.email || autoPopulatedForm.email,
      mobilePhone: current.mobilePhone || autoPopulatedForm.mobilePhone,
      maritalStatus: current.maritalStatus || autoPopulatedForm.maritalStatus,
      spouseName: current.spouseName || autoPopulatedForm.spouseName,
      spouseId: current.spouseId || autoPopulatedForm.spouseId,
      spouseEmploymentStatus: current.spouseEmploymentStatus || autoPopulatedForm.spouseEmploymentStatus,
      employmentStartDate: current.employmentStartDate || autoPopulatedForm.employmentStartDate,
      israeliResident: current.israeliResident || autoPopulatedForm.israeliResident,
      newImmigrant: current.newImmigrant || autoPopulatedForm.newImmigrant,
      returningResident: current.returningResident || autoPopulatedForm.returningResident,
      singleParent: current.singleParent || autoPopulatedForm.singleParent,
      eligibleChildren: isEligibleChildByBirthDate(current.dateOfBirth || autoPopulatedForm.dateOfBirth),
      disabledEmployee: current.disabledEmployee || autoPopulatedForm.disabledEmployee,
      disabledChild: current.disabledChild || autoPopulatedForm.disabledChild,
      academicDegreeEligibility:
        current.academicDegreeEligibility || autoPopulatedForm.academicDegreeEligibility,
      releasedSoldier: current.releasedSoldier || autoPopulatedForm.releasedSoldier,
      taxCoordination: current.taxCoordination || autoPopulatedForm.taxCoordination,
      additionalEmployer: current.additionalEmployer || autoPopulatedForm.additionalEmployer,
      pensionIncome: current.pensionIncome || autoPopulatedForm.pensionIncome,
      otherTaxCreditEligibility:
        current.otherTaxCreditEligibility || autoPopulatedForm.otherTaxCreditEligibility,
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

  const missingFields = useMemo(
    () => requiredFieldMetadata.filter((field) => !hasValue(form[field.key] as string)).map((field) => field.label),
    [form],
  );

  const showSpouseFields = /נשוי|married/i.test(form.maritalStatus);
  const populatedFieldsCount = requiredFieldMetadata.length - missingFields.length;

  function handleChange<K extends keyof FormState>(
  field: K,
  value: FormState[K]
  ) {
    setForm((current) => {
      const updated = {
        ...current,
        [field]: value,
      };

      if (field === "dateOfBirth") {
        updated.eligibleChildren = isEligibleChildByBirthDate(
          value as string
        );
      }

      return updated;
    });
  }

  function validateForm() {
    if (!form.employerName.trim()) return "שם המעסיק הוא שדה חובה.";
    if (!form.employerTaxFileNumber.trim()) return "מספר תיק ניכויים הוא שדה חובה.";
    if (!form.firstName.trim() || !form.lastName.trim()) return "שם פרטי ושם משפחה הם שדות חובה.";
    if (!/^\d{8,9}$/.test(form.identityNumber.trim())) return "מספר תעודת זהות חייב להכיל 8–9 ספרות.";
    if (!form.dateOfBirth.trim()) return "תאריך לידה הוא שדה חובה.";
    if (!form.street.trim() || !form.houseNumber.trim() || !form.city.trim() || !form.postalCode.trim()) {
      return "חובה למלא רחוב, מספר בית, עיר ומיקוד.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "כתובת אימייל אינה תקינה.";
    if (!/^0(5[0-9]{8}|[23489][0-9]{7})$/.test(form.mobilePhone.trim())) return "מספר נייד חייב להיות בפורמט ישראלי תקין.";
    if (!form.employmentStartDate.trim()) return "תאריך תחילת עבודה הוא שדה חובה.";
    if (showSpouseFields && (!form.spouseName.trim() || !/^\d{8,9}$/.test(form.spouseId.trim()))) {
      return "כאשר מצב משפחתי הוא נשוי/אה, יש למלא גם שם בן/בת זוג ותעודת זהות.";
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.id) {
      setError("יש להתחבר כדי לשלוח טופס 101.");
      return;
    }

    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
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

    const now = new Date().toISOString();
    const submissionPayload = {
      user_id: user.id,
      full_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      identity_number: form.identityNumber.trim(),
      date_of_birth: form.dateOfBirth.trim(),
      phone: form.mobilePhone.trim(),
      email: form.email.trim(),
      address: `${form.street.trim()} ${form.houseNumber.trim()}${form.apartment ? `, דירה ${form.apartment.trim()}` : ""}`.trim(),
      city: form.city.trim(),
      postal_code: form.postalCode.trim(),
      marital_status: form.maritalStatus.trim(),
      dependents: "",
      employer_name: form.employerName.trim(),
      job_title: form.employerName.trim(),
      department: "",
      position: "",
      manager: "",
      start_date: form.employmentStartDate.trim(),
      wage: "",
      bank_name: "",
      branch_number: "",
      account_number: "",
      iban: "",
      tax_id: "",
      emergency_contact: form.spouseName.trim(),
      emergency_phone: form.spouseId.trim(),
      notes: "",
      created_at: now,
      updated_at: now,
      updated_by: user.id,
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
      setError("שמירת הטופס נכשלה. בדוק שהטבלה form_101_submissions תואמת את השדות הנדרשים.");
      setSubmitting(false);
      return;
    }

    setMessage(
      `הטופס נשמר בהצלחה. ${populatedFieldsCount} מתוך ${requiredFieldMetadata.length} שדות חובה מולאו אוטומטית מהנתונים הקיימים.`,
    );
    setSubmitting(false);
  }

  return (
    <div className="pb-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-cream/50">טופס 101</p>
          <h1 className="font-display text-2xl text-cream">מילוי אוטומטי של טופס 101</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center rounded-full border border-brass/20 px-4 py-2 text-sm font-semibold text-brass transition hover:bg-brass/10"
          >
            הדפס / PDF
          </button>
          <Link
            href="/employee/profile"
            className="inline-flex items-center justify-center rounded-full border border-brass/20 px-4 py-2 text-sm font-semibold text-brass transition hover:bg-brass/10"
          >
            חזור לפרופיל
          </Link>
        </div>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <section className="rounded-3xl border border-brass/15 bg-surface p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brass/15 text-brass">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm text-cream/60">שלום, {loading ? "..." : displayName}</p>
              <p className="text-sm text-cream/45">
                כל שדה עם ערך קיים ממולא אוטומטית. רק השדות החסרים נשארים לפתיחה ידנית.
              </p>
            </div>
          </div>

          {missingFields.length > 0 ? (
            <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">
              שדות חסרים להשלמה: {missingFields.join(", ")}
            </div>
          ) : null}

          <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-cream">א. פרטי המעסיק</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">שם המעסיק</span>
                  <input
                    value={form.employerName}
                    onChange={(event) => handleChange("employerName", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("שם המעסיק") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">מספר תיק ניכויים</span>
                  <input
                    value={form.employerTaxFileNumber}
                    onChange={(event) => handleChange("employerTaxFileNumber", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("מספר תיק ניכויים") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold text-cream">ב. פרטי העובד/ת</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">שם פרטי</span>
                  <input
                    value={form.firstName}
                    onChange={(event) => handleChange("firstName", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("שם פרטי") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">שם משפחה</span>
                  <input
                    value={form.lastName}
                    onChange={(event) => handleChange("lastName", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("שם משפחה") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">מספר תעודת זהות</span>
                  <input
                    value={form.identityNumber}
                    onChange={(event) => handleChange("identityNumber", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("מספר תעודת זהות") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">תאריך לידה</span>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(event) => handleChange("dateOfBirth", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("תאריך לידה") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">תאריך עלייה / הגירה</span>
                  <input
                    type="date"
                    value={form.dateOfImmigration}
                    onChange={(event) => handleChange("dateOfImmigration", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">מין</span>
                  <input
                    value={form.gender}
                    onChange={(event) => handleChange("gender", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="זכר / נקבה"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">סטטוס תושב</span>
                  <input
                    value={form.israeliResidentStatus}
                    onChange={(event) => handleChange("israeliResidentStatus", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="ישראלי / תושב חוזר / עולה"
                  />
                </label>
                <label className="text-sm text-cream/80 md:col-span-2">
                  <span className="mb-2 block font-semibold">רחוב</span>
                  <input
                    value={form.street}
                    onChange={(event) => handleChange("street", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("רחוב") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">מספר בית</span>
                  <input
                    value={form.houseNumber}
                    onChange={(event) => handleChange("houseNumber", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("מספר בית") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">דירה</span>
                  <input
                    value={form.apartment}
                    onChange={(event) => handleChange("apartment", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">עיר</span>
                  <input
                    value={form.city}
                    onChange={(event) => handleChange("city", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("עיר") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">מיקוד</span>
                  <input
                    value={form.postalCode}
                    onChange={(event) => handleChange("postalCode", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("מיקוד") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">אימייל</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("אימייל") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">מספר נייד</span>
                  <input
                    value={form.mobilePhone}
                    onChange={(event) => handleChange("mobilePhone", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("מספר נייד") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">מצב משפחתי</span>
                  <input
                    value={form.maritalStatus}
                    onChange={(event) => handleChange("maritalStatus", event.target.value)}
                    className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    placeholder="רווק/ה / נשוי/אה / גרוש/ה"
                  />
                </label>
                <label className="text-sm text-cream/80">
                  <span className="mb-2 block font-semibold">תאריך תחילת עבודה</span>
                  <input
                    type="date"
                    value={form.employmentStartDate}
                    onChange={(event) => handleChange("employmentStartDate", event.target.value)}
                    className={`w-full rounded-2xl border px-3 py-3 text-cream outline-none ring-0 ${missingFields.includes("תאריך תחילת עבודה") ? "border-amber-300/50 bg-amber-500/5" : "border-brass/20 bg-obsidian"}`}
                  />
                </label>
              </div>

              {showSpouseFields ? (
                <div className="mt-5 grid gap-4 rounded-2xl border border-brass/15 bg-obsidian/40 p-4 md:grid-cols-3">
                  <label className="text-sm text-cream/80">
                    <span className="mb-2 block font-semibold">שם בן/בת זוג</span>
                    <input
                      value={form.spouseName}
                      onChange={(event) => handleChange("spouseName", event.target.value)}
                      className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    />
                  </label>
                  <label className="text-sm text-cream/80">
                    <span className="mb-2 block font-semibold">מספר תעודת זהות של בן/בת זוג</span>
                    <input
                      value={form.spouseId}
                      onChange={(event) => handleChange("spouseId", event.target.value)}
                      className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    />
                  </label>
                  <label className="text-sm text-cream/80">
                    <span className="mb-2 block font-semibold">סטטוס תעסוקה של בן/בת זוג</span>
                    <input
                      value={form.spouseEmploymentStatus}
                      onChange={(event) => handleChange("spouseEmploymentStatus", event.target.value)}
                      className="w-full rounded-2xl border border-brass/20 bg-obsidian px-3 py-3 text-cream outline-none ring-0"
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold text-cream">ג. פרטי מס</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {taxFlagMetadata.map((taxFlag) => (
                  <label key={taxFlag.key} className="flex items-center gap-2 rounded-2xl border border-brass/15 bg-obsidian/40 p-3 text-sm text-cream/80">
                    <input
                      type="checkbox"
                      checked={
                        taxFlag.key === "eligibleChildren"
                          ? isEligibleChildByBirthDate(form.dateOfBirth)
                          : Boolean(form[taxFlag.key])
                      }
                      disabled={taxFlag.key === "eligibleChildren"}
                      onChange={(event) => {
                        if (taxFlag.key === "eligibleChildren") return;
                        handleChange(taxFlag.key, event.target.checked as never);
                      }}
                    />
                    <span>{taxFlag.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {message ? (
            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4" strokeWidth={1.8} />
              <span>{message}</span>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || loading}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-brass px-5 py-3 text-sm font-semibold text-obsidian transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                שומר…
              </>
            ) : (
              <>
                שמור ושתף טופס 101
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </>
            )}
          </button>
        </section>
      </form>
    </div>
  );
}
