import { REGIONS } from "@/lib/areas";
import { EVENT_STATUSES, EVENT_STATUS_LABEL } from "@/lib/events/status";

export type EventFilterValues = { q?: string; region?: string; status?: string; from?: string; to?: string };

export function hasEventFilters(v: EventFilterValues): boolean {
  return Boolean(v.q || v.region || v.status || v.from || v.to);
}

/** Pure predicate shared by the staff event lists (quote item 11). Dates are ISO YYYY-MM-DD strings. */
export function matchesEventFilters(
  e: { location: string; clientName: string; region: string | null; status: string; eventDate: string },
  v: EventFilterValues,
): boolean {
  const q = (v.q ?? "").trim().toLowerCase();
  if (q && !e.location.toLowerCase().includes(q) && !e.clientName.toLowerCase().includes(q)) return false;
  if (v.region && e.region !== v.region) return false;
  if (v.status && e.status !== v.status) return false;
  if (v.from && e.eventDate < v.from) return false;
  if (v.to && e.eventDate > v.to) return false;
  return true;
}

/** GET filter bar: region / status / date range / free text (location or client). */
export function EventFilters({ action, values }: { action: string; values: EventFilterValues }) {
  return (
    <form action={action} method="get" role="search" className="mb-6 flex flex-wrap items-end gap-3 border-s-2 border-ink bg-surface p-4">
      <label className="block min-w-44 flex-1 text-xs text-muted">
        מיקום או לקוח
        <input name="q" defaultValue={values.q ?? ""} className="field mt-1 w-full" />
      </label>
      <label className="block text-xs text-muted">
        אזור
        <select name="region" defaultValue={values.region ?? ""} className="field mt-1">
          <option value="">הכול</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-muted">
        סטטוס
        <select name="status" defaultValue={values.status ?? ""} className="field mt-1">
          <option value="">הכול</option>
          {EVENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {EVENT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-muted">
        מתאריך
        <input type="date" name="from" defaultValue={values.from ?? ""} className="field mt-1" />
      </label>
      <label className="block text-xs text-muted">
        עד תאריך
        <input type="date" name="to" defaultValue={values.to ?? ""} className="field mt-1" />
      </label>
      <button type="submit" className="btn btn-primary btn-sm">
        סינון
      </button>
      {hasEventFilters(values) && (
        <a href={action} className="text-xs font-semibold text-muted hover:underline">
          ניקוי
        </a>
      )}
    </form>
  );
}
