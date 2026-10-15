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

const ACTION_LABEL: Partial<Record<EventStatus, string>> = {
  open: "פתיחה להרשמה",
  closed: "סגירה להרשמה",
  cancelled: "ביטול האירוע",
  pending_rates: "החזרה להמתנה לתעריפים",
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
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!isEventStatus(status)) return null;
  const current: EventStatus = status;

  const run = (fn: () => Promise<{ success: true } | { success: false; error: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) setError(res.error);
      else {
        setConfirmCancel(false);
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
                className="rounded-md border border-indigo-500/30 px-2.5 py-1 text-xs text-indigo-200 hover:bg-indigo-500/10 disabled:opacity-50"
              >
                שחזור ל{EVENT_STATUS_LABEL[target]}
                {target === restoreTarget ? " (ברירת מחדל)" : ""}
              </button>
            );
          }
          if (target === "cancelled") {
            return confirmCancel ? (
              <span key={target} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => updateEventStatus(eventId, "cancelled"))}
                  className="rounded-md bg-rose-500/25 px-2.5 py-1 text-xs font-semibold text-rose-100 disabled:opacity-50"
                >
                  לאשר ביטול?
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="rounded-md px-2 py-1 text-xs text-cream/60"
                >
                  חזרה
                </button>
              </span>
            ) : (
              <button
                key={target}
                type="button"
                disabled={isPending}
                onClick={() => setConfirmCancel(true)}
                className="rounded-md px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
              >
                {ACTION_LABEL.cancelled}
              </button>
            );
          }
          return (
            <button
              key={target}
              type="button"
              disabled={isPending}
              onClick={() => run(() => updateEventStatus(eventId, target))}
              className="rounded-md bg-[#4F46E5] px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {ACTION_LABEL[target] ?? EVENT_STATUS_LABEL[target]}
            </button>
          );
        })}
      </div>
      {current === "cancelled" && !canRestoreEvent(role) && (
        <p className="text-xs text-cream/50">רק מנהל/ת או אדמין יכולים לשחזר אירוע שבוטל.</p>
      )}
      {confirmCancel && (
        <p className="text-xs text-cream/60">
          ביטול מסמן את האירוע בלבד: ההרשמות נשמרות, והאירוע לא נספר בחישובי איוש ודוחות.
        </p>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
