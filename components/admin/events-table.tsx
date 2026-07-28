"use client";

import { Fragment, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Trash2, Users } from "lucide-react";
import { updateEventStatus, deleteEvent } from "@/app/admin/actions";

export type AdminEvent = {
  id: string;
  title: string;
  location: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  wageRate: number;
  spotsTotal: number;
  status: "open" | "closed" | "completed";
  registrations: { id: string; name: string }[];
};

const STATUS_LABEL: Record<AdminEvent["status"], string> = {
  open: "פתוח להרשמה",
  closed: "סגור",
  completed: "הושלם",
};

export function EventsTable({ events }: { events: AdminEvent[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(id: string, status: AdminEvent["status"]) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await updateEventStatus(id, status);
      if (!result.success) setError(result.error);
      setPendingId(null);
    });
  }

  function handleDelete(id: string, title: string) {
    if (!window.confirm(`למחוק את "${title}"? הפעולה אינה הפיכה.`)) return;
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

      <div className="overflow-x-auto rounded-2xl border border-brass/15 bg-surface">
        <table className="w-full min-w-[720px] text-start text-sm">
          <thead>
            <tr className="border-b border-brass/10 text-cream/50">
              <th scope="col" className="px-4 py-3 text-start font-medium">אירוע</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">תאריך</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">נרשמים</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">תעריף</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">סטטוס</th>
              <th scope="col" className="px-4 py-3 text-start font-medium sr-only">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brass/10">
            {events.map((event) => {
              const expanded = expandedId === event.id;
              const busy = isPending && pendingId === event.id;
              return (
                <Fragment key={event.id}>
                  <tr className={busy ? "opacity-50" : undefined}>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-cream">{event.title}</p>
                      <p className="text-xs text-cream/45">{event.location}</p>
                    </td>
                    <td className="px-4 py-3.5 text-cream/70">
                      {event.eventDate} · {event.startTime}–{event.endTime}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : event.id)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-cream/70 hover:bg-cream/5"
                      >
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        {event.registrations.length}/{event.spotsTotal}
                        {expanded ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-brass tabular-nums">₪{event.wageRate}/שעה</td>
                    <td className="px-4 py-3.5">
                      <select
                        value={event.status}
                        disabled={busy}
                        onChange={(e) => handleStatusChange(event.id, e.target.value as AdminEvent["status"])}
                        className="rounded-lg border border-brass/15 bg-surface2 px-2.5 py-1.5 text-xs font-semibold text-cream outline-none focus:border-brass disabled:opacity-50"
                      >
                        <option value="open">{STATUS_LABEL.open}</option>
                        <option value="closed">{STATUS_LABEL.closed}</option>
                        <option value="completed">{STATUS_LABEL.completed}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5 text-end">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDelete(event.id, event.title)}
                        aria-label={`מחיקת ${event.title}`}
                        className="rounded-lg p-2 text-cream/40 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={6} className="bg-surface2 px-4 py-4">
                        {event.registrations.length === 0 ? (
                          <p className="text-sm text-cream/40">אין נרשמים עדיין.</p>
                        ) : (
                          <ul className="flex flex-wrap gap-2">
                            {event.registrations.map((r) => (
                              <li
                                key={r.id}
                                className="rounded-md bg-cream/5 px-2.5 py-1 text-xs font-semibold text-cream/80"
                              >
                                {r.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-cream/40">
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
