"use client";

import { useState, useTransition } from "react";
import { setRecruiterBonusRate, setRecruiterCanCreateEvents } from "@/app/admin/actions";

/** Admin-only row controls on /admin/recruiters: credit rate (NIS per approved hour) and the create-events permission. */
export function RecruiterSettings({
  recruiterId,
  rate,
  canCreateEvents,
}: {
  recruiterId: string;
  rate: number | null;
  canCreateEvents: boolean;
}) {
  const [value, setValue] = useState(rate == null ? "" : String(rate));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ success: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      setSaved(false);
      const result = await action();
      if (result.success) setSaved(true);
      else setError(result.error ?? "השמירה נכשלה.");
    });

  return (
    <div className="flex flex-col gap-2">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => setRecruiterBonusRate(recruiterId, Number(value)));
        }}
      >
        <label className="sr-only" htmlFor={`rate-${recruiterId}`}>
          תעריף זיכוי לשעה
        </label>
        <input
          id={`rate-${recruiterId}`}
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="לא הוגדר"
          className="field w-24 tabular-nums"
        />
        <span className="text-xs text-muted">₪ לשעה</span>
        <button type="submit" disabled={isPending || value === ""} className="btn btn-secondary btn-sm">
          שמירה
        </button>
      </form>
      <label className="flex items-center gap-2 text-xs text-ink/80">
        <input
          type="checkbox"
          defaultChecked={canCreateEvents}
          disabled={isPending}
          onChange={(e) => {
            const allowed = e.target.checked;
            run(() => setRecruiterCanCreateEvents(recruiterId, allowed));
          }}
        />
        רשאי/ת ליצור אירועים
      </label>
      {error && <p className="text-xs text-rose-700">{error}</p>}
      {saved && !error && <p className="text-xs text-muted">נשמר.</p>}
    </div>
  );
}
