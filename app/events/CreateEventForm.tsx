"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Minus, AlertTriangle, ChevronLeft } from "lucide-react";
import {
  createEventSchema,
  emptyRole,
  WORKER_RANKS,
  WORKER_RANK_LABEL,
  type CreateEventInput,
} from "@/lib/validations/event";
import { createEvent, type ClientOption } from "@/app/admin/events/actions";

const SECTIONS = [
  { id: "client", label: "לקוח ותאריך", eyebrow: "01" },
  { id: "details", label: "פרטי האירוע", eyebrow: "02" },
  { id: "conditions", label: "תנאי קבלה", eyebrow: "03" },
  { id: "roster", label: "מצבת כוח אדם", eyebrow: "04" },
] as const;

export function CreateEventForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      client_id: "",
      event_date: "",
      start_time: "18:00",
      end_time: "23:00",
      location: "",
      notes: "",
      dress_code: "",
      required_rank: "any",
      roles: [emptyRole],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "roles" });
  const roles = watch("roles");
  const missingRateCount = roles?.filter((r) => r.base_rate == null || r.base_rate === undefined).length ?? 0;

  async function onSubmit(values: CreateEventInput) {
    setServerError(null);
    setSubmitting(true);
    const result = await createEvent(values);
    setSubmitting(false);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push("/admin/events");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-28 lg:pb-10">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">אירוע חדש</p>
        <h1 className="font-display text-3xl text-cream">פתיחת דוקט אירוע</h1>
        <p className="mt-1 text-sm text-cream/50">
          כל שדה כאן הופך לשורה בדוקט שהמנהל/ת בשטח יראה/תראה. תעריפים ריקים יסומנו אוטומטית לטיפול.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
        {/* margin rail — reads like handwritten section tabs on a clipped docket */}
        <nav className="hidden lg:block">
          <ol className="sticky top-6 space-y-1 border-e border-brass/10 pe-4">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-cream/50 transition-colors hover:text-cream"
                >
                  <span className="font-mono text-[11px] text-cream/30">{s.eyebrow}</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-6">
          {serverError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {serverError}
            </div>
          )}

          {/* 01 — client + date */}
          <Section id="client" eyebrow="01" title="לקוח ותאריך">
            <FieldGrid>
              <Field label="לקוח" error={errors.client_id?.message} span={2}>
                <select
                  {...register("client_id")}
                  className={inputClass}
                  defaultValue=""
                >
                  <option value="" disabled>
                    בחר/י לקוח מהרשימה
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <p className="mt-1.5 text-xs text-cream/40">
                    לא נמצאו לקוחות. יש להוסיף לקוח בטבלת הלקוחות לפני יצירת אירוע.
                  </p>
                )}
              </Field>
              <Field label="תאריך האירוע" error={errors.event_date?.message}>
                <input type="date" {...register("event_date")} className={inputClass} />
              </Field>
            </FieldGrid>
          </Section>

          {/* 02 — general details */}
          <Section id="details" eyebrow="02" title="פרטי האירוע">
            <FieldGrid>
              <Field label="שעת התחלה כללית" error={errors.start_time?.message}>
                <input type="time" {...register("start_time")} className={inputClass} />
              </Field>
              <Field label="שעת סיום כללית" error={errors.end_time?.message}>
                <input type="time" {...register("end_time")} className={inputClass} />
              </Field>
              <Field label="מיקום" error={errors.location?.message} span={2}>
                <input
                  {...register("location")}
                  placeholder="לדוגמה: אולמי הגן, כפר סבא"
                  className={inputClass}
                />
              </Field>
              <Field label="קוד לבוש" error={errors.dress_code?.message}>
                <input {...register("dress_code")} placeholder="שחור אלגנט" className={inputClass} />
              </Field>
              <Field label="תקציב נסיעות לעובד/ת (₪)" error={errors.travel_budget?.message}>
                <input
                  type="number"
                  step="1"
                  {...register("travel_budget")}
                  placeholder="0"
                  className={inputClass}
                />
              </Field>
              <Field label="הערות" error={errors.notes?.message} span={2}>
                <textarea
                  {...register("notes")}
                  rows={3}
                  placeholder="פרטים שחשוב שהצוות בשטח ידע"
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </FieldGrid>
          </Section>

          {/* 03 — eligibility conditions */}
          <Section id="conditions" eyebrow="03" title="תנאי קבלה">
            <FieldGrid>
              <Field label="גיל מינימלי" error={errors.min_age?.message}>
                <input type="number" {...register("min_age")} placeholder="18" className={inputClass} />
              </Field>
              <Field label="גיל מקסימלי" error={errors.max_age?.message}>
                <input type="number" {...register("max_age")} placeholder="45" className={inputClass} />
              </Field>
              <Field label="דרגה נדרשת" error={errors.required_rank?.message} span={2}>
                <select {...register("required_rank")} className={inputClass}>
                  {WORKER_RANKS.map((rank) => (
                    <option key={rank} value={rank}>
                      {WORKER_RANK_LABEL[rank]}
                    </option>
                  ))}
                </select>
              </Field>
            </FieldGrid>
          </Section>

          {/* 04 — dynamic roster */}
          <Section id="roster" eyebrow="04" title="מצבת כוח אדם">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-cream/45">
                כל שורה = תפקיד. אפשר להשאיר תעריף ריק ולמלא אחר כך — האירוע פשוט ייפתח כ"ממתין לתעריפים".
              </p>
              {missingRateCount > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#D4FF00]/15 px-2.5 py-1 text-[11px] font-semibold text-[#D4FF00]">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {missingRateCount} תפקידים ללא תעריף
                </span>
              )}
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    layout
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    <RoleRow
                      index={index}
                      register={register}
                      control={control}
                      error={errors.roles?.[index]}
                      onRemove={fields.length > 1 ? () => remove(index) : undefined}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => append(emptyRole)}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-400/30 py-3.5 text-sm font-semibold text-indigo-400 transition-colors hover:border-indigo-400/60 hover:bg-indigo-500/5 active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              הוספת תפקיד
            </button>
            {errors.roles?.root?.message && (
              <p className="mt-2 text-xs text-rose-400">{errors.roles.root.message}</p>
            )}
          </Section>
        </div>
      </div>

      {/* sticky, thumb-reachable action bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-brass/10 bg-obsidian/95 px-4 py-3 backdrop-blur lg:sticky lg:mt-6 lg:rounded-2xl lg:border lg:bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="hidden text-xs text-cream/40 sm:block">
            {missingRateCount > 0
              ? `יישמר כ"ממתין לתעריפים" — ${missingRateCount} שורות עדיין ללא תעריף`
              : "כל התעריפים מולאו — האירוע ייפתח מיד לעובדים"}
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="ms-auto flex items-center gap-1.5 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "שומר..." : "יצירת אירוע"}
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  );
}

// ---- presentational helpers -------------------------------------------------

const inputClass =
  "w-full rounded-xl border border-brass/15 bg-surface2 px-3 py-2.5 text-sm text-cream outline-none transition-colors placeholder:text-cream/25 focus:border-indigo-400";

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-brass/10 bg-surface p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg text-cream">
        <span className="font-mono text-xs text-indigo-400 lg:hidden">{eyebrow}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  error,
  span,
  children,
}: {
  label: string;
  error?: string;
  span?: 2;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${span === 2 ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-semibold text-cream/60">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-400">{error}</span>}
    </label>
  );
}

function RoleRow({
  index,
  register,
  control,
  error,
  onRemove,
}: {
  index: number;
  register: ReturnType<typeof useForm<CreateEventInput>>["register"];
  control: ReturnType<typeof useForm<CreateEventInput>>["control"];
  error?: {
    role_name?: { message?: string };
    headcount?: { message?: string };
    start_time?: { message?: string };
    end_time?: { message?: string };
    base_rate?: { message?: string };
  };
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-brass/10 bg-surface2 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex-1">
          <input
            {...register(`roles.${index}.role_name` as const)}
            placeholder="שם התפקיד (למשל: ברמנית)"
            className={`${inputClass} font-semibold`}
          />
          {error?.role_name && <p className="mt-1 text-xs text-rose-400">{error.role_name.message}</p>}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="הסרת תפקיד"
            className="mt-1 rounded-lg p-2 text-cream/30 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <span className="mb-1 block text-[11px] font-semibold text-cream/45">כמות</span>
          <Controller
            control={control}
            name={`roles.${index}.headcount` as const}
            render={({ field }) => (
              <div className="flex items-center gap-1 rounded-xl border border-brass/15 bg-surface px-1 py-1">
                <button
                  type="button"
                  onClick={() => field.onChange(Math.max(1, Number(field.value) - 1))}
                  className="grid h-9 w-9 place-items-center rounded-lg text-cream/60 hover:bg-cream/5"
                  aria-label="הפחתת כמות"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums text-cream">
                  {field.value ?? 1}
                </span>
                <button
                  type="button"
                  onClick={() => field.onChange(Number(field.value) + 1)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-cream/60 hover:bg-cream/5"
                  aria-label="הוספת כמות"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          />
        </div>

        <div>
          <span className="mb-1 block text-[11px] font-semibold text-cream/45">התחלה</span>
          <input type="time" {...register(`roles.${index}.start_time` as const)} className={inputClass} />
          {error?.start_time && <p className="mt-1 text-xs text-rose-400">{error.start_time.message}</p>}
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-cream/45">סיום</span>
          <input type="time" {...register(`roles.${index}.end_time` as const)} className={inputClass} />
          {error?.end_time && <p className="mt-1 text-xs text-rose-400">{error.end_time.message}</p>}
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-cream/45">תעריף לשעה (₪)</span>
          <Controller
            control={control}
            name={`roles.${index}.base_rate` as const}
            render={({ field }) => (
              <input
                type="number"
                step="1"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                placeholder="ריק = לטיפול"
                className={`${inputClass} ${
                  field.value == null ? "border-[#D4FF00]/40 text-[#D4FF00] placeholder:text-[#D4FF00]/50" : ""
                }`}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}