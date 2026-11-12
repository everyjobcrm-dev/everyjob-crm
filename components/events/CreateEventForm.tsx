"use client";
//components/events/CreateEventForm.tsx
import { useState, useEffect, useRef } from "react";
import {
  useForm,
  useFieldArray,
  useWatch,
  Controller,
  type Control,
  type UseFormRegister,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Minus, AlertTriangle, ChevronLeft } from "lucide-react";
import {
  createEventSchema,
  emptyRole,
  type CreateEventFormValues,
  type CreateEventInput,
  type EventRoleFormValues,
} from "@/lib/validations/event";
import { createEvent, type ClientOption, type RecruiterOption } from "@/app/admin/actions";

const SECTIONS = [
  { id: "client", label: "לקוח ותאריך", eyebrow: "01" },
  { id: "details", label: "פרטי האירוע", eyebrow: "02" },
  { id: "conditions", label: "תנאי קבלה", eyebrow: "03" },
  { id: "roster", label: "מצבת כוח אדם", eyebrow: "04" },
] as const;

export function CreateEventForm({
  clients,
  recruiters,
  afterCreateHref = "/admin/events",
}: {
  clients: ClientOption[];
  /** Admin/Manager only: "מגייס/ת אחראי/ת" options. Omitted for a recruiter creator (they own the event). */
  recruiters?: RecruiterOption[];
  afterCreateHref?: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
    // CreateEventFormValues = the raw, in-progress shape (numbers can be
    // "" while typing). CreateEventInput = what the resolver hands to
    // onSubmit once zod has parsed/coerced it. See lib/validations/event.ts.
  } = useForm<CreateEventFormValues, unknown, CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      client_id: "",
      event_date: "",
      start_time: "18:00",
      location: "",
      notes: "",
      dress_code: "",
      min_rating: undefined,
      recruiter_id: "",
      roles: [emptyRole],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "roles" });
  const roles = useWatch({ control, name: "roles" });
  // Roles prefill: the first time a client is chosen while the roster is still untouched, seed it with the client's
  // preferred role names (rates are not prefilled here - the client's price is applied server-side to bill_to_client).
  const prefilledForClient = useRef<string | null>(null);
  const missingRateCount = roles?.filter((r: EventRoleFormValues) => r.base_rate == null || r.base_rate === "").length ?? 0;

  // --- Address Prefill Logic ---
  const clientId = useWatch({ control, name: "client_id" });
  const currentLocation = useWatch({ control, name: "location" });

  useEffect(() => {
    const client = clients.find((c) => c.id === clientId);
    if (!client?.address || currentLocation) return;

    setValue("location", client.address, {
      shouldDirty: true,
      shouldTouch: true,
    });
  }, [clientId, clients, currentLocation, setValue]);

  useEffect(() => {
    if (!clientId || prefilledForClient.current === clientId) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client || client.preferredRoles.length === 0) return;
    const untouched = (roles ?? []).every((r: EventRoleFormValues) => !r.role_name);
    if (!untouched) return;
    prefilledForClient.current = clientId;
    replace(client.preferredRoles.map((role_name) => ({ ...emptyRole, role_name })));
  }, [clientId, clients, roles, replace]);

  // Receives the parsed/coerced CreateEventInput (numbers, nulls) — not
  // the raw form state — because of the third useForm generic above.
  async function onSubmit(values: CreateEventInput) {
    setServerError(null);
    setSubmitting(true);
    const result = await createEvent(values);
    setSubmitting(false);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push(afterCreateHref);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-ink">פתיחת דוקט אירוע</h1>
        <p className="mt-1 text-sm text-ink/80">
          כל שדה כאן הופך לשורה בדוקט שהמנהל/ת בשטח יראה/תראה. תעריפים ריקים יסומנו אוטומטית לטיפול.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        {/* margin rail — reads like handwritten section tabs on a clipped docket */}
        <nav className="hidden lg:block">
          <ol className="sticky top-6 space-y-1 border-e border-line pe-4">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink/80 transition-colors hover:text-ink"
                >
                  <span className="font-mono text-[11px] text-muted">{s.eyebrow}</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-6">
          {serverError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-700">
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
                  <p className="mt-1.5 text-xs text-muted">
                    לא נמצאו לקוחות. יש להוסיף לקוח בטבלת הלקוחות לפני יצירת אירוע.
                  </p>
                )}
              </Field>
              <Field label="תאריך האירוע" error={errors.event_date?.message}>
                <input type="date" {...register("event_date")} className={inputClass} />
              </Field>
              {recruiters && (
                <Field label="מגייס/ת אחראי/ת" error={errors.recruiter_id?.message}>
                  <select {...register("recruiter_id")} className={inputClass}>
                    <option value="">ללא מגייס/ת (ניהול על ידי מנהלים)</option>
                    {recruiters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-muted">המגייס/ת יוכל/תוכל לנהל את האירוע ואת ההרשמות אליו.</p>
                </Field>
              )}
            </FieldGrid>
          </Section>

          {/* 02 — general details */}
          <Section id="details" eyebrow="02" title="פרטי האירוע">
            <FieldGrid>
              <Field label="שעת התחלה כללית" error={errors.start_time?.message}>
                <input type="time" {...register("start_time")} className={inputClass} />
              </Field>
              <Field label="מיקום" error={errors.location?.message}>
                <input
                  {...register("location")}
                  placeholder="לדוגמה: אולמי הגן, כפר סבא"
                  className={inputClass}
                />
              </Field>
              <Field label="קוד לבוש" error={errors.dress_code?.message}>
                <input {...register("dress_code")} placeholder="שחור אלגנט" className={inputClass} />
              </Field>
              <Field label="תקציב נסיעות לעובד/ת (₪)" error={errors.travel_budget_per_worker?.message}>
                <input 
                  type="number" 
                  step="1" 
                  {...register("travel_budget_per_worker")} 
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
              <Field label="דירוג מינימלי נדרש (0–5)" error={errors.min_rating?.message} span={2}>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={5}
                  {...register("min_rating", {
                     setValueAs: (v) => v === "" ? undefined : parseFloat(v)
                  })}
                  placeholder="לדוגמה: 3.5"
                  className={inputClass}
                />
              </Field>
            </FieldGrid>
          </Section>

          {/* 04 — dynamic roster */}
          <Section id="roster" eyebrow="04" title="מצבת כוח אדם">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted">
                כל שורה = תפקיד. אפשר להשאיר תעריף ריק ולמלא אחר כך — האירוע פשוט ייפתח כ״ממתין לתעריפים״.
              </p>
              {missingRateCount > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-sky/25 px-2.5 py-1 text-[11px] font-semibold text-sky-deep">
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
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/30 py-3.5 text-sm font-semibold text-primary-soft transition-colors hover:border-primary/60 hover:bg-pink/15"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              הוספת תפקיד
            </button>
            {errors.roles?.root?.message && (
              <p className="mt-2 text-xs text-rose-700">{errors.roles.root.message}</p>
            )}
          </Section>
        </div>
      </div>

      {/* sticky, thumb-reachable action bar */}
      <div className="sticky bottom-20 z-10 mt-6 rounded-lg border border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="hidden text-xs text-muted sm:block">
            {missingRateCount > 0
              ? `יישמר כ"ממתין לתעריפים" — ${missingRateCount} שורות עדיין ללא תעריף`
              : "כל התעריפים מולאו — האירוע ייפתח מיד לעובדים"}
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary ms-auto"
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
  "w-full rounded-lg border border-line bg-surface2 px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink/80 focus:border-primary";

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
    <section id={id} className="scroll-mt-6 card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg text-ink">
        <span className="font-mono text-xs text-primary-soft lg:hidden">{eyebrow}</span>
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
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-700">{error}</span>}
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
  register: UseFormRegister<CreateEventFormValues>;
  control: Control<CreateEventFormValues>;
  error?: FieldErrors<EventRoleFormValues>;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface2 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex-1">
          <input
            {...register(`roles.${index}.role_name` as const)}
            placeholder="שם התפקיד (למשל: ברמנית)"
            className={`${inputClass} font-semibold`}
          />
          {error?.role_name && <p className="mt-1 text-xs text-rose-700">{error.role_name.message}</p>}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="הסרת תפקיד"
            className="mt-1 rounded-lg p-2 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <span className="mb-1 block text-[11px] font-semibold text-muted">כמות</span>
          <Controller
            control={control}
            name={`roles.${index}.headcount` as const}
            render={({ field }) => (
              <div className="flex items-center gap-1 card px-1 py-1">
                <button
                  type="button"
                  onClick={() => field.onChange(Math.max(1, Number(field.value) - 1))}
                  className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-ink/5"
                  aria-label="הפחתת כמות"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums text-ink">
                  {field.value ?? 1}
                </span>
                <button
                  type="button"
                  onClick={() => field.onChange(Number(field.value) + 1)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-ink/5"
                  aria-label="הוספת כמות"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          />
        </div>

        <div>
          <span className="mb-1 block text-[11px] font-semibold text-muted">התחלה</span>
          <input type="time" {...register(`roles.${index}.start_time` as const)} className={inputClass} />
          {error?.start_time && <p className="mt-1 text-xs text-rose-700">{error.start_time.message}</p>}
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-muted">תעריף לשעה (₪)</span>
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
                  field.value == null ? "border-sky text-sky-deep placeholder:text-sky-deep/50" : ""
                }`}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}