"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { submitShiftAttendance, voidShiftHoursAsManager } from "@/app/manager/actions";
import {
  attendanceSchema,
  hoursReasonSchema,
  type AttendanceFormInput,
  type AttendanceFormOutput,
  type HoursReasonFormInput,
  type HoursReasonFormOutput,
} from "@/lib/validations/hours";

// Hours entry / re-entry for one approved registration (Manager and above) through submit_shift_hours.
// The RPC is authoritative (scope, event status/date, not own hours, already-approved); this form only collects input.

export type AttendanceTarget = {
  registrationId: string;
  eventId: string;
  eventDate: string;
  name: string;
  roleName: string | null;
  startTime: string | null;
  endTime: string | null;
  reportedHours: number | null;
  submissionId: string | null;
  submissionStatus: string | null;
};

const SUBMISSION_LABEL: Record<string, string> = {
  pending: "ממתין לאישור אדמין",
  approved: "אושר",
  rejected: "נדחה - ניתן להגיש מחדש",
};

export function AttendanceModal({ target, onClose }: { target: AttendanceTarget; onClose: () => void }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const approved = target.submissionStatus === "approved";

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<AttendanceFormInput, unknown, AttendanceFormOutput>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      startTime: target.startTime?.slice(0, 5) || "08:00",
      endTime: target.endTime?.slice(0, 5) || "16:00",
      reportedHours: target.reportedHours ?? 8,
      rating: 5,
      notes: "",
    },
  });
  const rating = Number(useWatch({ control, name: "rating" }) ?? 0);

  const onSubmit = (values: AttendanceFormOutput) => {
    setServerError(null);
    startTransition(async () => {
      const res = await submitShiftAttendance({
        registrationId: target.registrationId,
        eventId: target.eventId,
        eventDate: target.eventDate,
        ...values,
      });
      if (!res.success) {
        setServerError(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg space-y-5 border-s-4 border-[#4F46E5] bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brass/10 pb-4">
          <div>
            <p className="text-xs font-semibold text-indigo-400">{target.roleName}</p>
            <h3 className="font-display text-xl text-cream">דיווח שעות: {target.name}</h3>
            <p className="text-xs text-cream/60">
              {target.eventDate}
              {target.submissionStatus ? ` · ${SUBMISSION_LABEL[target.submissionStatus] ?? target.submissionStatus}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-md p-1 text-lg text-cream/50 transition-colors hover:bg-surface2 hover:text-cream"
          >
            ✕
          </button>
        </div>

        {approved ? (
          <p className="border-s-2 border-[#D4FF00] ps-3 text-sm text-cream/75">
            הדוח אושר. תיקון אפשרי רק לאחר ביטול על ידי אדמין.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="att-start" className="mb-1 block text-xs font-medium text-cream/70">
                  שעת התחלה בפועל
                </label>
                <input
                  id="att-start"
                  type="time"
                  {...register("startTime")}
                  className="w-full rounded-md border border-brass/20 bg-surface2 px-3 py-2 text-sm text-cream focus:border-[#4F46E5] focus:outline-none"
                />
                {errors.startTime?.message && <p className="mt-1 text-xs text-rose-400">{errors.startTime.message}</p>}
              </div>
              <div>
                <label htmlFor="att-end" className="mb-1 block text-xs font-medium text-cream/70">
                  שעת סיום בפועל
                </label>
                <input
                  id="att-end"
                  type="time"
                  {...register("endTime")}
                  className="w-full rounded-md border border-brass/20 bg-surface2 px-3 py-2 text-sm text-cream focus:border-[#4F46E5] focus:outline-none"
                />
                {errors.endTime?.message && <p className="mt-1 text-xs text-rose-400">{errors.endTime.message}</p>}
              </div>
            </div>
            <p className="text-[11px] text-cream/60">שעת סיום שקודמת לשעת ההתחלה נחשבת ליום שלמחרת (משמרת לילה).</p>

            <div>
              <label htmlFor="att-hours" className="mb-1 block text-xs font-medium text-cream/70">
                סה״כ שעות מדווחות
              </label>
              <input
                id="att-hours"
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                {...register("reportedHours")}
                className="w-full rounded-md border border-brass/20 bg-surface2 px-3 py-2 text-sm text-cream focus:border-[#4F46E5] focus:outline-none"
              />
              {errors.reportedHours?.message && <p className="mt-1 text-xs text-rose-400">{errors.reportedHours.message}</p>}
            </div>

            <div>
              <p className="mb-2 block text-xs font-medium text-cream/70">דירוג ביצוע (1 עד 5)</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`דירוג ${star}`}
                    onClick={() => setValue("rating", star, { shouldDirty: true })}
                    className="cursor-pointer p-1 transition-transform hover:scale-110"
                  >
                    <Star className={`h-6 w-6 ${star <= rating ? "fill-brass text-brass" : "text-cream/60 hover:text-cream/60"}`} />
                  </button>
                ))}
                <span className="ms-2 text-xs font-semibold text-brass">{rating} / 5</span>
              </div>
            </div>

            <div>
              <label htmlFor="att-notes" className="mb-1 block text-xs font-medium text-cream/70">
                הערות (לא חובה)
              </label>
              <textarea
                id="att-notes"
                rows={3}
                {...register("notes")}
                className="w-full rounded-md border border-brass/20 bg-surface2 p-3 text-sm text-cream focus:border-[#4F46E5] focus:outline-none"
              />
              {errors.notes?.message && <p className="mt-1 text-xs text-rose-400">{errors.notes.message}</p>}
            </div>

            {serverError && <p className="border-s-2 border-rose-500 ps-3 text-xs text-rose-300">{serverError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="rounded-md bg-surface2 px-4 py-2 text-xs font-medium text-cream/70 hover:text-cream">
                ביטול
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-[#4F46E5] px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
              >
                {isPending ? "שומר..." : target.submissionId ? "הגשה מחדש לאישור" : "הגשה לאישור"}
              </button>
            </div>
          </form>
        )}

        {target.submissionId && (target.submissionStatus === "pending" || target.submissionStatus === "rejected") && (
          <VoidForm eventId={target.eventId} submissionId={target.submissionId} onDone={onClose} />
        )}
      </div>
    </div>
  );
}

function VoidForm({ eventId, submissionId, onDone }: { eventId: string; submissionId: string; onDone: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HoursReasonFormInput, unknown, HoursReasonFormOutput>({
    resolver: zodResolver(hoursReasonSchema),
    defaultValues: { reason: "" },
  });

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-rose-300 hover:underline">
        ביטול הדוח (הוזן בטעות)
      </button>
    );
  }

  const onSubmit = (values: HoursReasonFormOutput) => {
    setServerError(null);
    startTransition(async () => {
      const res = await voidShiftHoursAsManager(eventId, submissionId, values.reason);
      if (!res.success) {
        setServerError(res.error);
        return;
      }
      router.refresh();
      onDone();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 border-t border-brass/10 pt-3" noValidate>
      <label htmlFor="void-reason" className="block text-xs text-cream/70">
        סיבת הביטול (חובה)
      </label>
      <textarea id="void-reason" rows={2} {...register("reason")} className="w-full rounded-md border border-brass/20 bg-surface2 p-2 text-sm text-cream" />
      {(errors.reason?.message || serverError) && <p className="text-xs text-rose-400">{errors.reason?.message ?? serverError}</p>}
      <button type="submit" disabled={isPending} className="rounded-md bg-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-100 disabled:opacity-50">
        {isPending ? "מבטל..." : "אישור ביטול הדוח"}
      </button>
    </form>
  );
}
