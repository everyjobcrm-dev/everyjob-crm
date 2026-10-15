"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ClipboardList, Trash2, Users, AlertTriangle } from "lucide-react";
import { updateEventStatus, restoreEvent, deleteEvent, type AdminEvent } from "@/app/admin/actions";
export type { AdminEvent };
import { FinancialClosureSummary } from "@/components/admin/financial-closure-summary";
import {
  EVENT_STATUS_LABEL as STATUS_LABEL,
  EVENT_STATUS_STYLE as STATUS_STYLE,
  allowedEventTransitions,
  defaultRestoreStatus,
  type EventStatus,
} from "@/lib/events/status";

type Staffing = { filled: number; total: number; label: string; tone: "ok" | "warn" | "danger" };

function computeStaffing(event: AdminEvent): Staffing {
  const total = event.roles.reduce((sum, r) => sum + r.headcount, 0);
  const filled = event.roles.reduce((sum, r) => sum + Math.min(r.filledCount, r.headcount), 0);

  if (event.status === "pending_rates") {
    return { filled, total, label: "טעון טיפול — תעריפים חסרים", tone: "danger" };
  }
  if (total > 0 && filled >= total) {
    return { filled, total, label: "מאויש במלואו", tone: "ok" };
  }
  return { filled, total, label: `${filled}/${total} שובצו`, tone: "warn" };
}

const STAFFING_TONE: Record<Staffing["tone"], string> = {
  ok: "bg-indigo-500/15 text-indigo-400",
  warn: "bg-cream/10 text-cream/70",
  danger: "bg-[#D4FF00]/15 text-[#D4FF00]",
};

// end_time is null until the event is closed (see closeEvent()) — this is
// the single formatting rule for that, reused by both layouts below so a
// future copy tweak only has to happen once.
function formatTimeRange(startTime: string, endTime: string | null): string {
  return `${startTime}–${endTime ?? "טרם נקבע"}`;
}

export function EventsTable({ events }: { events: AdminEvent[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(id: string, status: EventStatus) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await updateEventStatus(id, status);
      if (!result.success) setError(result.error);
      setPendingId(null);
    });
  }

  function handleRestore(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await restoreEvent(id);
      if (!result.success) setError(result.error);
      setPendingId(null);
    });
  }

  function handleDelete(id: string, label: string) {
    if (!window.confirm(`למחוק את "${label}"? הפעולה אינה הפיכה.`)) return;
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteEvent(id);
      if (!result.success) setError(result.error);
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </div>
      )}

      <div className="space-y-3 sm:hidden">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            expanded={expandedId === event.id}
            busy={isPending && pendingId === event.id}
            onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
            onStatusChange={(s) => handleStatusChange(event.id, s)}
            onRestore={() => handleRestore(event.id)}
            onDelete={() => handleDelete(event.id, `${event.clientName} · ${event.eventDate}`)}
          />
        ))}
        {events.length === 0 && (
          <p className="rounded-2xl border border-brass/10 bg-surface px-4 py-10 text-center text-sm text-cream/65">
            לא נוצרו אירועים עדיין.
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-brass/15 bg-surface sm:block">
        <table className="w-full min-w-[860px] text-start text-sm">
          <thead>
            <tr className="border-b border-brass/10 text-cream/50">
              <th scope="col" className="px-4 py-3 text-start font-medium">לקוח / מיקום</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">תאריך</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">איוש</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">סטטוס</th>
              <th scope="col" className="px-4 py-3 text-start font-medium sr-only">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brass/10">
            {events.map((event) => {
              const expanded = expandedId === event.id;
              const busy = isPending && pendingId === event.id;
              const staffing = computeStaffing(event);
              return (
                <Fragment key={event.id}>
                  <tr className={busy ? "opacity-50" : undefined}>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-cream">{event.clientName}</p>
                      <p className="text-xs text-cream/65">{event.location}</p>
                    </td>
                    <td className="px-4 py-3.5 text-cream/70">
                      {event.eventDate} · {formatTimeRange(event.startTime, event.endTime)}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : event.id)}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${STAFFING_TONE[staffing.tone]}`}
                      >
                        {staffing.tone === "danger" ? (
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {staffing.label}
                        {expanded ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusControl
                        event={event}
                        busy={busy}
                        onChange={(next) => handleStatusChange(event.id, next)}
                        onRestore={() => handleRestore(event.id)}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-end">
                      <RosterLink eventId={event.id} />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDelete(event.id, `${event.clientName} · ${event.eventDate}`)}
                        aria-label="מחיקת אירוע"
                        className="rounded-lg p-2 text-cream/65 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={5} className="bg-surface2 px-4 py-4">
                        <RolesRoster event={event} />
                        {event.status === "completed" && event.closure && (
                          <div className="mt-4">
                            <FinancialClosureSummary closure={event.closure} />
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-cream/65">
                  לא נוצרו אירועים עדיין.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RolesRoster({ event }: { event: AdminEvent }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {event.roles.map((role) => (
        <span
          key={role.id}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
            role.baseRate == null ? "bg-[#D4FF00]/10 text-[#D4FF00]" : "bg-cream/5 text-cream/75"
          }`}
        >
          <Users className="h-3 w-3" aria-hidden="true" />
          {role.filledCount}/{role.headcount} × {role.roleName}
          <span className="font-mono tabular-nums">
            {role.baseRate == null ? "· תעריף?" : `· ₪${role.baseRate}/ש'`}
          </span>
        </span>
      ))}
      {event.roles.length === 0 && <p className="text-sm text-cream/65">אין תפקידים מוגדרים.</p>}
    </div>
  );
}

function EventCard({
  event,
  expanded,
  busy,
  onToggle,
  onStatusChange,
  onRestore,
  onDelete,
}: {
  event: AdminEvent;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onStatusChange: (status: EventStatus) => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const staffing = computeStaffing(event);
  return (
    <div className={`rounded-2xl border border-brass/10 bg-surface p-4 ${busy ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-indigo-400">{event.clientName}</p>
          <p className="font-display text-base text-cream">{event.location}</p>
          <p className="mt-0.5 text-xs text-cream/50">
            {event.eventDate} · {formatTimeRange(event.startTime, event.endTime)}
          </p>
        </div>
        <span className={`shrink-0 rounded-sm px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[event.status]}`}>
          {STATUS_LABEL[event.status]}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`mt-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${STAFFING_TONE[staffing.tone]}`}
      >
        {staffing.tone === "danger" ? (
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {staffing.label}
        {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-brass/10 pt-3">
          <RolesRoster event={event} />
          {event.status === "completed" && event.closure && <FinancialClosureSummary closure={event.closure} />}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-brass/10 pt-3">
        <div className="w-full">
          <StatusControl event={event} busy={busy} onChange={onStatusChange} onRestore={onRestore} />
        </div>
        <RosterLink eventId={event.id} />
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          aria-label="מחיקת אירוע"
          className="shrink-0 rounded-xl p-2.5 text-cream/65 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
/**
 * Status control: only the transitions the caller is allowed to make (mirrors the DB trigger).
 * completed / paused are frozen (read-only); a cancelled event offers a one-click restore to the status it was
 * cancelled from (or "closed"). This screen is Admin-only, so the role is "admin"; the server action re-verifies.
 */
function StatusControl({
  event,
  busy,
  onChange,
  onRestore,
}: {
  event: AdminEvent;
  busy: boolean;
  onChange: (status: EventStatus) => void;
  onRestore: () => void;
}) {
  const allowed = allowedEventTransitions("admin", event.status, true);

  if (allowed.length === 0) {
    return (
      <p className={`rounded-lg px-2.5 py-1.5 text-center text-xs font-semibold ${STATUS_STYLE[event.status]}`}>
        {STATUS_LABEL[event.status]} · קפוא
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <select
        value={event.status}
        disabled={busy}
        onChange={(e) => onChange(e.target.value as EventStatus)}
        aria-label="סטטוס האירוע"
        className="w-full rounded-lg border border-brass/15 bg-surface2 px-2.5 py-1.5 text-xs font-semibold text-cream outline-none focus:border-brass disabled:opacity-60"
      >
        <option value={event.status}>{STATUS_LABEL[event.status]}</option>
        {allowed.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      {event.status === "cancelled" && (
        <button
          type="button"
          disabled={busy}
          onClick={onRestore}
          className="w-full rounded-md bg-brass/15 px-2.5 py-1.5 text-xs font-semibold text-brass transition-colors hover:bg-brass/25 disabled:opacity-50"
        >
          שחזור ל{STATUS_LABEL[defaultRestoreStatus(event.cancelledFromStatus)]}
        </button>
      )}
    </div>
  );
}

/** Roster / staffing actions for the event (staff event page, reachable by admin through the staff layout). */
function RosterLink({ eventId }: { eventId: string }) {
  return (
    <Link
      href={`/manager/events/${eventId}`}
      aria-label="רשימת צוות וניהול שיבוצים"
      title="רשימת צוות וניהול שיבוצים"
      className="inline-flex shrink-0 items-center gap-1 rounded-lg p-2 text-xs text-cream/50 transition-colors hover:bg-indigo-500/10 hover:text-indigo-300"
    >
      <ClipboardList className="h-4 w-4" aria-hidden="true" />
      <span>צוות</span>
    </Link>
  );
}
