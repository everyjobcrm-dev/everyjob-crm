"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { createEvent } from "@/app/admin/actions";

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:00");
  const [wageRate, setWageRate] = useState("50");
  const [spotsTotal, setSpotsTotal] = useState("10");
  const [dressCode, setDressCode] = useState("");

  function resetAndClose() {
    setOpen(false);
    setError(null);
    setTitle("");
    setLocation("");
    setEventDate("");
    setStartTime("18:00");
    setEndTime("23:00");
    setWageRate("50");
    setSpotsTotal("10");
    setDressCode("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createEvent({
        title,
        location,
        eventDate,
        startTime,
        endTime,
        wageRate: Number(wageRate) || 0,
        spotsTotal: Number(spotsTotal) || 0,
        dressCode,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      resetAndClose();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-sm font-bold text-obsidian transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
        אירוע חדש
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-event-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-brass/20 bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="create-event-title" className="font-display text-xl text-cream">
                יצירת אירוע חדש
              </h2>
              <button
                type="button"
                onClick={resetAndClose}
                aria-label="סגירה"
                className="rounded-full p-1.5 text-cream/50 hover:bg-cream/5 hover:text-cream"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                {error}
              </div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-xs font-medium text-cream/60" htmlFor="ev-title">
                  כותרת האירוע
                </label>
                <input
                  id="ev-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-brass/15 bg-surface2 px-3.5 py-2.5 text-sm text-cream outline-none focus:border-brass"
                  placeholder="חתונה בחוות רונית"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-cream/60" htmlFor="ev-location">
                  מיקום
                </label>
                <input
                  id="ev-location"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-brass/15 bg-surface2 px-3.5 py-2.5 text-sm text-cream outline-none focus:border-brass"
                  placeholder="הרצליה"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-cream/60" htmlFor="ev-date">
                    תאריך
                  </label>
                  <input
                    id="ev-date"
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-xl border border-brass/15 bg-surface2 px-2 py-2.5 text-sm text-cream outline-none focus:border-brass"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-cream/60" htmlFor="ev-start">
                    התחלה
                  </label>
                  <input
                    id="ev-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-brass/15 bg-surface2 px-2 py-2.5 text-sm text-cream outline-none focus:border-brass"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-cream/60" htmlFor="ev-end">
                    סיום
                  </label>
                  <input
                    id="ev-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-brass/15 bg-surface2 px-2 py-2.5 text-sm text-cream outline-none focus:border-brass"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-cream/60" htmlFor="ev-wage">
                    תעריף לשעה (₪)
                  </label>
                  <input
                    id="ev-wage"
                    type="number"
                    min="0"
                    step="0.5"
                    value={wageRate}
                    onChange={(e) => setWageRate(e.target.value)}
                    className="w-full rounded-xl border border-brass/15 bg-surface2 px-3.5 py-2.5 text-sm text-cream outline-none focus:border-brass"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-cream/60" htmlFor="ev-spots">
                    מספר מקומות
                  </label>
                  <input
                    id="ev-spots"
                    type="number"
                    min="1"
                    value={spotsTotal}
                    onChange={(e) => setSpotsTotal(e.target.value)}
                    className="w-full rounded-xl border border-brass/15 bg-surface2 px-3.5 py-2.5 text-sm text-cream outline-none focus:border-brass"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-cream/60" htmlFor="ev-dress">
                  קוד לבוש (אופציונלי)
                </label>
                <input
                  id="ev-dress"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className="w-full rounded-xl border border-brass/15 bg-surface2 px-3.5 py-2.5 text-sm text-cream outline-none focus:border-brass"
                  placeholder="חולצה לבנה, מכנס שחור"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="mt-2 w-full rounded-full bg-brass py-2.5 text-sm font-bold text-obsidian transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "יוצר אירוע..." : "יצירת אירוע"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
