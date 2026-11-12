"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreEvent, updateEventStatus } from "@/app/admin/actions";
import { canRestoreEvent, type AppRole } from "@/lib/auth/permissions";
import {
  EVENT_STATUS_LABEL,
  EVENT_STATUS_STYLE,
  allowedEventTransitions,
  defaultRestoreStatus,
  isEventStatus,
  isFrozenStatus,
  type EventStatus,
} from "@/lib/events/status";

// Event status control for the staff event page. The offered transitions come from lib/events/status.ts (which mirrors
// the DB trigger enforce_event_status_transition); the trigger stays authoritative and the server actions re-check.
// Two closure levels: 'closed' (level 1, closed for registration) and 'completed' (level 2, final closure, Admin/Manager).

const ACTION_LABEL: Partial<Record<EventStatus, string>> = {
  open: "פתיחה להרשמה",
  closed: "סגירה להרשמה",
  cancelled: "ביטול האירוע",
  pending_rates: "החזרה להמתנה לתעריפים",
  completed: "סגירה סופית",
};

// Destructive-looking transitions get a confirm step with an explanation.
const CONFIRM: Partial<Record<EventStatus, { button: string; hint: string }>> = {
  cancelled: {
    button: "לאשר ביטול?",
    hint: "ביטול מסמן את האירוע בלבד: ההרשמות נשמרות, והאירוע לא נספר בחישובי איוש ודוחות.",
  },
  completed: {
    button: "לאשר סגירה סופית?",
    hint: "סגירה סופית נועלת את האירוע: אין עריכה ואין שיבוצים. מנהל/ת או אדמין יכולים לפתוח אותו מחדש לעריכה. דוחות שעות שממתינים לאישור חוסמים את הסגירה.",
  },
};

export function EventStatusControl({
  eventId,
  status,
  cancelledFromStatus,
  role,
  isOwner,
}: {
  eventId: string;
  status: string;
  cancelledFromStatus: string | null;
  role: AppRole;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<EventStatus | null>(null);

  if (!isEventStatus(status)) return null;
  const current: EventStatus = status;

  const run = (fn: () => Promise<{ success: true } | { success: false; error: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) setError(res.error);
      else {
        setConfirming(null);
        router.refresh();
      }
    });
  };

  const restoreTarget = defaultRestoreStatus(cancelledFromStatus);
  // From 'cancelled' the generic transitions are the restore targets; show the default target first.
  const targets =
    current === "cancelled"
      ? canRestoreEvent(role)
        ? [restoreTarget, ...allowedEventTransitions(role, current, isOwner).filter((s) => s !== restoreTarget)]
        : []
      : allowedEventTransitions(role, current, isOwner);

  const label = (target: EventStatus) =>
    current === "completed" && target === "closed" ? "פתיחה מחדש לעריכה" : (ACTION_LABEL[target] ?? EVENT_STATUS_LABEL[target]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${EVENT_STATUS_STYLE[current]}`}>
          {EVENT_STATUS_LABEL[current]}
          {isFrozenStatus(current) ? " · קפוא" : ""}
        </span>

        {targets.map((target) => {
          if (current === "cancelled") {
            return (
              <button
                key={target}
                type="button"
                disabled={isPending}
                onClick={() => run(() => (target === restoreTarget ? restoreEvent(eventId) : restoreEvent(eventId, target)))}
                className="rounded-md border border-primary/30 px-2.5 py-1 text-xs text-primary-soft hover:bg-pink/15 disabled:opacity-50"
              >
                שחזור ל{EVENT_STATUS_LABEL[target]}
                {target === restoreTarget ? " (ברירת מחדל)" : ""}
              </button>
            );
          }
          const confirm = CONFIRM[target];
          if (confirm) {
            const tone =
              target === "cancelled"
                ? { ask: "text-rose-700 hover:bg-rose-500/10", yes: "bg-rose-500/25 text-rose-700" }
                : { ask: "text-primary hover:bg-primary/10", yes: "bg-primary/15 text-primary" };
            return confirming === target ? (
              <span key={target} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => updateEventStatus(eventId, target))}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${tone.yes}`}
                >
                  {confirm.button}
                </button>
                <button type="button" onClick={() => setConfirming(null)} className="rounded-md px-2 py-1 text-xs text-muted">

                  חזרה
                </button>
              </span>
            ) : (
              <button
                key={target}
                type="button"
                disabled={isPending}
                onClick={() => setConfirming(target)}
                className={`rounded-md px-2.5 py-1 text-xs disabled:opacity-50 ${tone.ask}`}
              >
                {label(target)}
              </button>
            );
          }
          return (
            <button
              key={target}
              type="button"
              disabled={isPending}
              onClick={() => run(() => updateEventStatus(eventId, target))}
              className="btn btn-primary btn-sm"
            >
              {label(target)}
            </button>
          );
        })}
      </div>
      {current === "cancelled" && !canRestoreEvent(role) && (
        <p className="text-xs text-muted">רק מנהל/ת או אדמין יכולים לשחזר אירוע שבוטל.</p>
      )}
      {current === "completed" && (
        <p className="text-xs text-muted">האירוע נסגר סופית: אין עריכה ואין שיבוצים עד לפתיחה מחדש.</p>
      )}
      {confirming && CONFIRM[confirming] && <p className="text-xs text-muted">{CONFIRM[confirming]?.hint}</p>}
      {error && <p className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}
