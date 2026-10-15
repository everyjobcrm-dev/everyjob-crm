"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, Plus, Trash2 } from "lucide-react";
import {
  deleteEventRole,
  saveEventRole,
  updateEventDetails,
  type ClientOption,
  type EditableEvent,
  type EditableEventRole,
  type RecruiterOption,
} from "@/app/admin/actions";
import {
  editEventDetailsSchema,
  editEventRoleSchema,
  type EditEventDetailsFormValues,
  type EditEventDetailsInput,
  type EditEventRoleFormValues,
  type EditEventRoleInput,
} from "@/lib/validations/event";

type ViewerRole = "admin" | "manager" | "recruiter";

const inputClass =
  "w-full border border-cream/15 bg-surface2 px-3 py-2.5 text-sm text-cream outline-none transition-colors placeholder:text-cream/50 focus:border-[#4F46E5] disabled:opacity-60";

// Edit form for an existing event. Every rule (who may change what, headcount >= occupied, no past dates, locks once
// hours exist) is enforced by the p9 RPCs; the hints here only explain them up front.
export function EditEventForm({
  event,
  viewerRole,
  clients,
  recruiters,
}: {
  event: EditableEvent;
  viewerRole: ViewerRole;
  clients: ClientOption[];
  recruiters: RecruiterOption[];
}) {
  return (
    <div className="space-y-8">
      <DetailsForm event={event} viewerRole={viewerRole} clients={clients} recruiters={recruiters} />
      <section className="border-s-4 border-[#D4FF00]/60 bg-surface p-5">
        <h2 className="mb-1 font-display text-lg text-cream">תפקידים ומצבת כוח אדם</h2>
        <p className="mb-4 text-xs text-cream/65">
          אי אפשר להקטין מתחת למספר התפוסים (משובצים + ממתינים לאישור). הגדלה מעלה ממתינים מרשימת ההמתנה לפי סדר ההרשמה.
          תפקיד עם הרשמות לא ניתן להסרה.
        </p>
        <div className="space-y-3">
          {event.roles.map((role) => (
            <RoleForm key={role.id} eventId={event.id} role={role} viewerRole={viewerRole} canRemove={event.roles.length > 1} />
          ))}
          <NewRole eventId={event.id} viewerRole={viewerRole} />
        </div>
      </section>
    </div>
  );
}

function DetailsForm({
  event,
  viewerRole,
  clients,
  recruiters,
}: {
  event: EditableEvent;
  viewerRole: ViewerRole;
  clients: ClientOption[];
  recruiters: RecruiterOption[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<EditEventDetailsFormValues, unknown, EditEventDetailsInput>({
    resolver: zodResolver(editEventDetailsSchema),
    defaultValues: {
      client_id: event.clientId,
      recruiter_id: event.recruiterId ?? "",
      event_date: event.eventDate,
      start_time: event.startTime,
      location: event.location,
      notes: event.notes ?? "",
      dress_code: event.dressCode ?? "",
      min_age: event.minAge ?? "",
      min_rating: event.minRating ?? "",
      travel_budget_per_worker: event.travelBudgetPerWorker ?? "",
    },
  });

  async function onSubmit(values: EditEventDetailsInput) {
    setServerError(null);
    setSaved(false);
    const result = await updateEventDetails(event.id, values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setSaved(true);
    reset(undefined, { keepValues: true });
    router.refresh();
  }

  const isAdmin = viewerRole === "admin";
  const canAssignRecruiter = viewerRole === "admin" || viewerRole === "manager";
  const currentClient = clients.find((c) => c.id === event.clientId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="border-s-4 border-[#4F46E5] bg-surface p-5">
      <h2 className="mb-4 font-display text-lg text-cream">פרטי האירוע</h2>
      {serverError && <ErrorLine text={serverError} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="לקוח" error={errors.client_id?.message} hint={isAdmin ? undefined : "שינוי לקוח - אדמין בלבד"}>
          {isAdmin ? (
            <select {...register("client_id")} className={inputClass}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <input value={currentClient?.name ?? "לקוח"} disabled className={inputClass} readOnly />
          )}
        </Field>
        {canAssignRecruiter && (
          <Field label="מגייס/ת אחראי/ת" error={errors.recruiter_id?.message}>
            <select {...register("recruiter_id")} className={inputClass}>
              <option value="">ללא מגייס/ת</option>
              {recruiters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="תאריך" error={errors.event_date?.message}>
          <input type="date" {...register("event_date")} className={inputClass} />
        </Field>
        <Field label="שעת התחלה כללית" error={errors.start_time?.message}>
          <input type="time" {...register("start_time")} className={inputClass} />
        </Field>
        <Field label="מיקום" error={errors.location?.message}>
          <input {...register("location")} className={inputClass} />
        </Field>
        <Field label="קוד לבוש" error={errors.dress_code?.message}>
          <input {...register("dress_code")} className={inputClass} />
        </Field>
        <Field label="תקציב נסיעות לעובד/ת (₪)" error={errors.travel_budget_per_worker?.message}>
          <input type="number" step="1" min={0} {...register("travel_budget_per_worker")} className={inputClass} />
        </Field>
        <Field label="גיל מינימלי" error={errors.min_age?.message}>
          <input type="number" min={1} {...register("min_age")} className={inputClass} />
        </Field>
        <Field label="דירוג מינימלי (0-5)" error={errors.min_rating?.message}>
          <input type="number" step="0.1" min={0} max={5} {...register("min_rating")} className={inputClass} />
        </Field>
        <Field label="הערות" error={errors.notes?.message} wide>
          <textarea rows={3} {...register("notes")} className={`${inputClass} resize-none`} />
        </Field>
      </div>
      <p className="mt-3 text-xs text-cream/65">
        אחרי שהוזנו שעות לאירוע אי אפשר לשנות תאריך ושעה. אחרי אישור שעות אי אפשר לשנות גם נסיעות ומגייס/ת.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="bg-[#4F46E5] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? "שומר..." : "שמירת פרטים"}
        </button>
        {saved && !isDirty && (
          <span role="status" className="flex items-center gap-1 text-xs text-[#D4FF00]">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> נשמר
          </span>
        )}
      </div>
    </form>
  );
}

function roleDefaults(role: EditableEventRole | null): EditEventRoleFormValues {
  return {
    role_id: role?.id ?? null,
    role_name: role?.roleName ?? "",
    headcount: role?.headcount ?? 1,
    start_time: role?.startTime ?? "18:00",
    end_time: role?.endTime ?? "",
    base_rate: role?.baseRate ?? "",
    bill_to_client: role?.billToClient ?? "",
  };
}

function RoleFields({
  form,
  viewerRole,
  minHeadcount,
}: {
  form: ReturnType<typeof useForm<EditEventRoleFormValues, unknown, EditEventRoleInput>>;
  viewerRole: ViewerRole;
  minHeadcount: number;
}) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
      <Field label="תפקיד" error={errors.role_name?.message} className="col-span-2">
        <input {...register("role_name")} className={inputClass} />
      </Field>
      <Field label="כמות" error={errors.headcount?.message}>
        <input type="number" min={minHeadcount} {...register("headcount")} className={inputClass} />
      </Field>
      <Field label="תעריף בסיס" error={errors.base_rate?.message}>
        <input type="number" step="0.5" min={0} {...register("base_rate")} placeholder="ללא" className={inputClass} />
      </Field>
      <Field label="התחלה" error={errors.start_time?.message}>
        <input type="time" {...register("start_time")} className={inputClass} />
      </Field>
      <Field label="סיום" error={errors.end_time?.message}>
        <input type="time" {...register("end_time")} className={inputClass} />
      </Field>
      {viewerRole === "admin" && (
        <Field label="חיוב ללקוח (₪/שעה)" error={errors.bill_to_client?.message} className="col-span-2">
          <input type="number" step="0.5" min={0} {...register("bill_to_client")} className={inputClass} />
        </Field>
      )}
    </div>
  );
}

function RoleForm({
  eventId,
  role,
  viewerRole,
  canRemove,
}: {
  eventId: string;
  role: EditableEventRole;
  viewerRole: ViewerRole;
  canRemove: boolean;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const form = useForm<EditEventRoleFormValues, unknown, EditEventRoleInput>({
    resolver: zodResolver(editEventRoleSchema),
    defaultValues: roleDefaults(role),
  });
  const {
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = form;

  async function onSubmit(values: EditEventRoleInput) {
    setServerError(null);
    const result = await saveEventRole(eventId, values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    form.reset(values as EditEventRoleFormValues);
    router.refresh();
  }

  async function onRemove() {
    if (!window.confirm(`להסיר את התפקיד "${role.roleName}"?`)) return;
    setServerError(null);
    setRemoving(true);
    const result = await deleteEventRole(eventId, role.id);
    setRemoving(false);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.refresh();
  }

  const removable = canRemove && !role.hasRegistrations;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="border border-cream/10 bg-surface2/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-cream/65">
          תפוסים: {role.occupied}/{role.headcount}
          {role.hasRegistrations ? " · יש הרשמות" : ""}
        </p>
        <button
          type="button"
          onClick={onRemove}
          disabled={!removable || removing}
          title={removable ? "הסרת תפקיד" : role.hasRegistrations ? "יש הרשמות לתפקיד" : "לאירוע חייב להישאר תפקיד אחד"}
          className="flex items-center gap-1 px-2 py-1 text-xs text-rose-300 transition-colors hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> הסרה
        </button>
      </div>
      {serverError && <ErrorLine text={serverError} />}
      <RoleFields form={form} viewerRole={viewerRole} minHeadcount={Math.max(1, role.occupied)} />
      {isDirty && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-3 bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? "שומר..." : "שמירת תפקיד"}
        </button>
      )}
    </form>
  );
}

function NewRole({ eventId, viewerRole }: { eventId: string; viewerRole: ViewerRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<EditEventRoleFormValues, unknown, EditEventRoleInput>({
    resolver: zodResolver(editEventRoleSchema),
    defaultValues: roleDefaults(null),
  });

  async function onSubmit(values: EditEventRoleInput) {
    setServerError(null);
    const result = await saveEventRole(eventId, { ...values, role_id: null });
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    form.reset(roleDefaults(null));
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 border border-dashed border-[#4F46E5]/50 py-3 text-sm font-semibold text-indigo-300 transition-colors hover:border-[#4F46E5] hover:bg-[#4F46E5]/5"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> הוספת תפקיד
      </button>
    );
  }
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="border border-[#4F46E5]/40 p-4">
      <p className="mb-3 text-xs font-semibold text-indigo-300">תפקיד חדש</p>
      {serverError && <ErrorLine text={serverError} />}
      <RoleFields form={form} viewerRole={viewerRole} minHeadcount={1} />
      <div className="mt-3 flex gap-3">
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {form.formState.isSubmitting ? "שומר..." : "הוספה"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-xs text-cream/70 hover:text-cream">
          ביטול
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  wide,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  wide?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""} ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-cream/75">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-cream/55">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-400">{error}</span>}
    </label>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <p className="mb-3 flex items-center gap-2 border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}
