"use client";

import { useState, useTransition } from "react";
import { REGIONS, ROLE_TAGS, type AreaInput } from "@/lib/areas";
import { updateMyArea } from "@/app/employee/profile/actions";
import { setEmployeeArea } from "@/app/manager/actions";

type Tag = (typeof ROLE_TAGS)[number];

/**
 * City / region / role tags. Without employeeId it edits the signed-in user's own profile; with it, a staff member edits
 * that employee (set_employee_area re-checks Admin/Manager in the DB).
 */
export function AreaForm({
  employeeId,
  initial,
}: {
  employeeId?: string;
  initial: { city: string | null; region: string | null; roleTags: string[] };
}) {
  const [city, setCity] = useState(initial.city ?? "");
  const [region, setRegion] = useState(initial.region ?? "");
  const [tags, setTags] = useState<Tag[]>(initial.roleTags.filter((t): t is Tag => (ROLE_TAGS as readonly string[]).includes(t)));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const idPrefix = employeeId ?? "me";

  function save() {
    setMessage(null);
    const input = { city, region, roleTags: tags } as AreaInput;
    startTransition(async () => {
      const res = employeeId ? await setEmployeeArea(employeeId, input) : await updateMyArea(input);
      setMessage(res.success ? { ok: true, text: "נשמר." } : { ok: false, text: ("error" in res && res.error) || "השמירה נכשלה." });
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink">עיר מגורים</span>
          <input id={`${idPrefix}-city`} className="field w-full" maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink">אזור עבודה</span>
          <select className="field w-full" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">לא נבחר</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">תפקידים</legend>
        <div className="flex flex-wrap gap-2">
          {ROLE_TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setTags(on ? tags.filter((x) => x !== t) : [...tags, t])}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink/80 hover:bg-ink/5"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary btn-sm">
          {pending ? "שומר..." : "שמירה"}
        </button>
        {message && (
          <span role="status" className={`text-xs ${message.ok ? "text-sky-deep" : "text-rose-700"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
