"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { deleteClient } from "@/app/admin/clients/actions";

export function DeleteClientDialog({
  clientId,
  clientName,
  onClose,
  onDeleted,
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nameMatches = confirmText.trim() === clientName;

  function handleConfirmDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteClient(clientId, confirmText);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-client-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-obsidian/85 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-surface p-6"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
            <AlertTriangle className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-full p-1.5 text-cream/50 hover:bg-cream/5 hover:text-cream"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <h2 id="delete-client-title" className="font-display text-lg text-cream">
          מחיקת הלקוח &quot;{clientName}&quot;
        </h2>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
            {error}
          </div>
        )}

        {step === 1 ? (
          <>
            <p className="mt-2 text-sm text-cream/60">
              פעולה זו אינה הפיכה. אם קיימים אירועים המשויכים ללקוח זה, המחיקה תיחסם.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-cream/15 py-2.5 text-sm font-semibold text-cream/70 hover:bg-cream/5"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-xl bg-rose-500/90 py-2.5 text-sm font-bold text-white hover:bg-rose-500"
              >
                המשך למחיקה
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-cream/60">
              כדי לאשר, הקלד/י את שם הלקוח במדויק: <span className="font-semibold text-cream">{clientName}</span>
            </p>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-3 w-full rounded-xl border border-rose-400/25 bg-surface2 px-3.5 py-2.5 text-sm text-cream outline-none focus:border-rose-400"
              placeholder={clientName}
            />
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-cream/15 py-2.5 text-sm font-semibold text-cream/70 hover:bg-cream/5"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={!nameMatches || isPending}
                onClick={handleConfirmDelete}
                className="flex-1 rounded-xl bg-rose-500/90 py-2.5 text-sm font-bold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending ? "מוחק..." : "מחיקה סופית"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}