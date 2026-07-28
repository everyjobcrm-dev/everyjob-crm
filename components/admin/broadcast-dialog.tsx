"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Megaphone, X } from "lucide-react";
import { broadcastMessage } from "@/app/admin/actions";

export function BroadcastDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function resetAndClose() {
    setOpen(false);
    setError(null);
    setSent(false);
    setTitle("");
    setBody("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await broadcastMessage(title, body);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSent(true);
      setTimeout(resetAndClose, 1200);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-brass/30 px-5 py-2.5 text-sm font-bold text-brass transition-colors hover:bg-brass hover:text-obsidian"
      >
        <Megaphone className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        הודעה לכל העובדים
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="broadcast-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-brass/20 bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="broadcast-title" className="font-display text-xl text-cream">
                שליחת הודעה לכלל העובדים
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
            {sent && (
              <div className="mb-4 rounded-xl border border-brass/25 bg-brass/10 px-3 py-2 text-sm text-brass">
                ההודעה נשלחה בהצלחה.
              </div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-xs font-medium text-cream/60" htmlFor="bc-title">
                  כותרת
                </label>
                <input
                  id="bc-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-brass/15 bg-surface2 px-3.5 py-2.5 text-sm text-cream outline-none focus:border-brass"
                  placeholder="עדכון שכר לחודש הבא"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-cream/60" htmlFor="bc-body">
                  תוכן ההודעה
                </label>
                <textarea
                  id="bc-body"
                  required
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full resize-none rounded-xl border border-brass/15 bg-surface2 px-3.5 py-2.5 text-sm text-cream outline-none focus:border-brass"
                  placeholder="תשלומים יועברו החל מה-1 לחודש..."
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="mt-2 w-full rounded-full bg-brass py-2.5 text-sm font-bold text-obsidian transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "שולח..." : "שליחה לכל העובדים"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
