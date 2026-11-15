import { REGIONS, ROLE_TAGS } from "@/lib/areas";

export type EmployeeFilterValues = { q?: string; region?: string; city?: string; tag?: string };

/** GET filter bar for the staff employee directories (quote item 11). Plain form: works without client JS. */
export function EmployeeFilters({ action, values }: { action: string; values: EmployeeFilterValues }) {
  const active = Boolean(values.q || values.region || values.city || values.tag);
  return (
    <form action={action} method="get" role="search" className="mb-5 flex flex-wrap items-end gap-3 border-s-2 border-ink bg-surface p-4">
      <label className="block min-w-48 flex-1 text-xs text-muted">
        שם או טלפון
        <input name="q" defaultValue={values.q ?? ""} className="field mt-1 w-full" />
      </label>
      <label className="block text-xs text-muted">
        תפקיד
        <select name="tag" defaultValue={values.tag ?? ""} className="field mt-1">
          <option value="">הכול</option>
          {ROLE_TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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
      <label className="block w-36 text-xs text-muted">
        עיר
        <input name="city" defaultValue={values.city ?? ""} className="field mt-1 w-full" />
      </label>
      <button type="submit" className="btn btn-primary btn-sm">
        סינון
      </button>
      {active && (
        <a href={action} className="text-xs font-semibold text-muted hover:underline">
          ניקוי
        </a>
      )}
    </form>
  );
}
