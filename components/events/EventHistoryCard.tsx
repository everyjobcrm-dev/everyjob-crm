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
  // not at creation) — mirrors AdminEvent in app/admin/events/actions.ts.
  endTime: string | null;
  status: "pending_rates" | "open" | "closed" | "cancelled" | "completed";
  roles: HistoryRole[];
  closure?: ClosureFinancials | null;
};

const STATUS_LABEL: Record<HistoryEvent["status"], string> = {
  pending_rates: "ממתין לתעריפים",
  open: "פתוח להרשמה",
  closed: "סגור להרשמה",
  completed: "נסגר פיננסית",
  cancelled: "בוטל",
};

export function EventHistoryCard({ event, tilt = 0 }: { event: HistoryEvent; tilt?: number }) {
  const missingRoles = event.roles.filter((r) => r.baseRate == null);
  const hasMissingRates = missingRoles.length > 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-brass/10 bg-surface p-5"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {hasMissingRates && (
        <div
          className="pointer-events-none absolute -end-9 top-4 w-36 rotate-45 select-none bg-[#D4FF00] py-1 text-center text-[10px] font-bold uppercase tracking-wider text-obsidian shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
          aria-hidden="true"
        >
          תעריפים חסרים
        </div>
      )}

      <div className="flex items-start justify-between gap-3 pe-2">
        <div>
          <p className="text-xs font-semibold text-indigo-400">{event.clientName}</p>
          <h3 className="font-display text-lg text-cream">{event.title}</h3>
        </div>
        <StatusBadge status={event.status} />
      </div>

      <dl className="mt-3 space-y-1.5 text-sm text-cream/60">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0 text-cream/35" aria-hidden="true" />
          <span>
            {event.eventDate} · {event.startTime}–{event.endTime ?? "טרם נקבע"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-cream/35" aria-hidden="true" />
          <span>{event.location}</span>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {event.roles.map((role) => (
          <span
            key={role.id}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
              role.baseRate == null
                ? "bg-[#D4FF00]/10 text-[#D4FF00]"
                : "bg-cream/5 text-cream/75"
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
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#D4FF00]/25 bg-[#D4FF00]/5 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#D4FF00]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {missingRoles.length} מתוך {event.roles.length} תפקידים ללא תעריף — עובדים לא יראו את האירוע
          </p>
          <a
            href={`/admin/events/${event.id}/rates`}
            className="shrink-0 text-xs font-bold text-[#D4FF00] underline underline-offset-2"
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
    pending_rates: "bg-[#D4FF00]/15 text-[#D4FF00]",
    open: "bg-indigo-500/15 text-indigo-400",
    closed: "bg-cream/10 text-cream/60",
    completed: "bg-cream/10 text-cream/60",
    cancelled: "bg-rose-500/15 text-rose-400",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}