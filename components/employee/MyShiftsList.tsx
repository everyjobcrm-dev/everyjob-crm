"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { requestCancellation, type MyShift } from "@/app/employee/events/actions";
import {
  cancellationRequestSchema,
  type CancellationRequestFormInput,
  type CancellationRequestFormOutput,
} from "@/lib/validations/registration";

// "My shifts" for any worker (employees and staff-as-workers). There is NO direct cancel anywhere (AGENTS.md 6):
// the only action is a cancellation REQUEST through request_registration_cancellation; staff approve or dismiss it.

const ACTIVE = ["approved", "pending", "waitlisted"] as const;

const UPCOMING_GROUPS: { status: (typeof ACTIVE)[number]; label: string; tone: string }[] = [
  { status: "approved", label: "משובץ/ת", tone: "border-[#4F46E5]" },
  { status: "pending", label: "ממתין/ה לאישור", tone: "border-cream/30" },
  { status: "waitlisted", label: "ברשימת המתנה", tone: "border-[#D4FF00]" },
];

const HOURS_LABEL: Record<"pending" | "approved" | "rejected", string> = {
  pending: "הוגש, ממתין לאישור",
  approved: "אושר",
  rejected: "נדחה - המנהל/ת יגיש/תגיש מחדש",
};

const HISTORY_LABEL: Record<string, string> = {
  approved: "שובצת",
  pending: "לא אושר עד מועד האירוע",
  waitlisted: "נשארת ברשימת ההמתנה",
  rejected: "נדחה",
  cancelled: "בוטל לבקשתך",
  no_show: "לא הגעת",
};

export function MyShiftsList({ shifts, today }: { shifts: MyShift[]; today: string }) {
  const isActive = (s: MyShift) => (ACTIVE as readonly string[]).includes(s.status);
  const upcoming = shifts.filter((s) => s.eventDate >= today && isActive(s));
  const removed = shifts.filter((s) => s.status === "removed");
  const history = shifts
    .filter((s) => !upcoming.includes(s) && s.status !== "removed")
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        {upcoming.length === 0 && (
          <p className="border-s-2 border-brass/20 ps-4 text-sm text-cream/50">אין לך משמרות קרובות.</p>
        )}
        {UPCOMING_GROUPS.map((group) => {
          const list = upcoming.filter((s) => s.status === group.status);
          if (list.length === 0) return null;
          return (
            <div key={group.status}>
              <h2 className="mb-3 text-sm font-semibold text-cream/70">
                {group.label} ({list.length})
              </h2>
              <div className="space-y-3">
                {list.map((shift) => (
                  <ShiftRow key={shift.registrationId} shift={shift} tone={group.tone} canRequest />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-cream/60">היסטוריה ({history.length})</h2>
          <div className="space-y-2">
            {history.map((shift) => (
              <ShiftRow key={shift.registrationId} shift={shift} tone="border-brass/10" note={HISTORY_LABEL[shift.status]} />
            ))}
          </div>
        </section>
      )}

      {removed.length > 0 && (
        <section className="opacity-60">
          <h2 className="mb-3 text-sm font-semibold text-cream/50">הוסרו ({removed.length})</h2>
          <p className="mb-2 text-xs text-cream/40">הוסרת מהמשמרות האלה על ידי הצוות. לשאלות פנה/י למנהל/ת.</p>
          <div className="space-y-2">
            {removed.map((shift) => (
              <ShiftRow key={shift.registrationId} shift={shift} tone="border-cream/10" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ShiftRow({
  shift,
  tone,
  canRequest = false,
  note,
}: {
  shift: MyShift;
  tone: string;
  canRequest?: boolean;
  note?: string;
}) {
  const [open, setOpen] = useState(false);
  const requested = shift.cancellationRequestedAt != null;

  return (
    <article className={`border-s-4 ${tone} bg-surface px-4 py-3`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-indigo-400">{shift.clientName}</p>
          <p className="font-display text-base text-cream">{shift.roleName ?? "תפקיד"}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cream/50">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" aria-hidden="true" /> {shift.eventDate}
            </span>
            {shift.startTime && (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" aria-hidden="true" /> {shift.startTime.slice(0, 5)}
                {shift.endTime ? `–${shift.endTime.slice(0, 5)}` : ""}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" /> {shift.location}
            </span>
          </p>
          {note && <p className="mt-1 text-xs text-cream/45">{note}</p>}
          {shift.hoursStatus && (
            <p className="mt-1 text-xs text-cream/60">
              דוח שעות: {HOURS_LABEL[shift.hoursStatus]}
              {shift.reportedHours != null ? ` (${shift.reportedHours} שעות)` : ""}
            </p>
          )}
          {canRequest && shift.eventStatus === "closed" && (
            <p className="mt-1 text-xs text-cream/40">האירוע סגור להרשמות חדשות.</p>
          )}
        </div>

        {canRequest &&
          (requested ? (
            <span className="rounded-sm bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-300">
              בקשת ביטול נשלחה - ממתינה לטיפול הצוות
            </span>
          ) : (
            !open && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-md border border-rose-500/30 px-3 py-1.5 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/10"
              >
                בקש ביטול
              </button>
            )
          ))}
      </div>

      {open && !requested && <CancellationRequestForm registrationId={shift.registrationId} onClose={() => setOpen(false)} />}
    </article>
  );
}

function CancellationRequestForm({ registrationId, onClose }: { registrationId: string; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CancellationRequestFormInput, unknown, CancellationRequestFormOutput>({
    resolver: zodResolver(cancellationRequestSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = (values: CancellationRequestFormOutput) => {
    setServerError(null);
    startTransition(async () => {
      const res = await requestCancellation(registrationId, values.reason);
      if (!res.success) {
        setServerError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-2 border-t border-brass/10 pt-3" noValidate>
      <p className="text-xs text-cream/70">
        הבקשה תישלח לצוות לאישור. עד שהבקשה תאושר את/ה עדיין רשום/ה למשמרת. לאחר אישור ניתן יהיה להירשם שוב אם יש מקום.
      </p>
      <label htmlFor={`cancel-reason-${registrationId}`} className="block text-xs text-cream/60">
        סיבה (לא חובה)
      </label>
      <textarea
        id={`cancel-reason-${registrationId}`}
        rows={2}
        {...register("reason")}
        className="w-full rounded-md border border-brass/20 bg-surface2 p-2 text-sm text-cream"
      />
      {(errors.reason?.message || serverError) && (
        <p className="text-xs text-rose-400">{errors.reason?.message ?? serverError}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-100 disabled:opacity-50"
        >
          {isPending ? "שולח..." : "אישור ושליחת בקשת ביטול"}
        </button>
        <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-xs text-cream/60">
          חזרה
        </button>
      </div>
    </form>
  );
}
