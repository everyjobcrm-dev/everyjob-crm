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
        className="btn btn-secondary"
      >
        <Megaphone className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        הודעה לכל העובדים
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="broadcast-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-lg border border-line-strong bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="broadcast-title" className="font-display text-xl text-ink">
                שליחת הודעה לכלל העובדים
              </h2>
              <button
                type="button"
                onClick={resetAndClose}
                aria-label="סגירה"
                className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}
            {sent && (
              <div className="mb-4 rounded-lg border border-line-strong bg-pink/15 px-3 py-2 text-sm text-primary-soft">
                ההודעה נשלחה בהצלחה.
              </div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted" htmlFor="bc-title">
                  כותרת
                </label>
                <input
                  id="bc-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface2 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
                  placeholder="עדכון שכר לחודש הבא"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted" htmlFor="bc-body">
                  תוכן ההודעה
                </label>
                <textarea
                  id="bc-body"
                  required
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full resize-none rounded-lg border border-line bg-surface2 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary"
                  placeholder="תשלומים יועברו החל מה-1 לחודש..."
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary mt-2 w-full"
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
