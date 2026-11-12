import { AlertTriangle, MapPin, Users, Clock } from "lucide-react";
import { FinancialClosureSummary, type ClosureFinancials } from "@/components/admin/financial-closure-summary";

export type HistoryRole = {
  id: string;
  roleName: string;
  headcount: number;
  baseRate: number | null;
};

export type HistoryEvent = {
  id: string;
  title: string;
  clientName: string;
  location: string;
  eventDate: string;
  startTime: string;
  // null until the event is closed (end_time is now set at closeEvent(),
  // not at creation) — mirrors AdminEvent in app/admin/actions.ts.
  endTime: string | null;
  status: "pending_rates" | "open" | "closed" | "cancelled" | "completed";
  roles: HistoryRole[];
  closure?: ClosureFinancials | null;
};

const STATUS_LABEL: Record<HistoryEvent["status"], string> = {
  pending_rates: "ממתין לתעריפים",
  open: "פתוח להרשמה",
  closed: "סגור להרשמה",
  completed: "נסגר סופית",
  cancelled: "בוטל",
};

export function EventHistoryCard({ event, tilt = 0 }: { event: HistoryEvent; tilt?: number }) {
  const missingRoles = event.roles.filter((r) => r.baseRate == null);
  const hasMissingRates = missingRoles.length > 0;

  return (
    <div
      className="relative overflow-hidden card p-5"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {hasMissingRates && (
        <div
          className="pointer-events-none absolute -end-9 top-4 w-36 rotate-45 select-none bg-sky py-1 text-center text-[10px] font-bold uppercase tracking-wider text-ink shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
          aria-hidden="true"
        >
          תעריפים חסרים
        </div>
      )}

      <div className="flex items-start justify-between gap-3 pe-2">
        <div>
          <p className="text-xs font-semibold text-primary-soft">{event.clientName}</p>
          <h3 className="font-display text-lg text-ink">{event.title}</h3>
        </div>
        <StatusBadge status={event.status} />
      </div>

      <dl className="mt-3 space-y-1.5 text-sm text-muted">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span>
            {event.eventDate} · {event.startTime}–{event.endTime ?? "טרם נקבע"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span>{event.location}</span>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {event.roles.map((role) => (
          <span
            key={role.id}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
              role.baseRate == null
                ? "bg-sky/25 text-sky-deep"
                : "bg-ink/5 text-ink/80"
            }`}
          >
            <Users className="h-3 w-3" aria-hidden="true" />
            {role.headcount}× {role.roleName}
            <span className="font-mono tabular-nums">
              {role.baseRate == null ? "· תעריף?" : `· ₪${role.baseRate}/ש'`}
            </span>
          </span>
        ))}
      </div>

      {hasMissingRates && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-sky bg-sky/25 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-deep">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {missingRoles.length} מתוך {event.roles.length} תפקידים ללא תעריף — עובדים לא יראו את האירוע
          </p>
          <a
            href={`/admin/events/${event.id}/rates`}
            className="shrink-0 text-xs font-bold text-sky-deep underline underline-offset-2"
          >
            השלמת תעריפים
          </a>
        </div>
      )}

      {event.status === "completed" && event.closure && (
        <div className="mt-4">
          <FinancialClosureSummary closure={event.closure} />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: HistoryEvent["status"] }) {
  const styles: Record<HistoryEvent["status"], string> = {
    pending_rates: "bg-sky/25 text-sky-deep",
    open: "bg-pink/15 text-primary-soft",
    closed: "bg-ink/10 text-muted",
    completed: "bg-ink/10 text-muted",
    cancelled: "bg-rose-500/15 text-rose-700",
  };
  return (
    <span className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}