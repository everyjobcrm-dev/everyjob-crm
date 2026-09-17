"use client";

import { useState, useTransition } from "react";
import { redeemRecruitmentCredits } from "@/app/manager/actions";

export function RecruitmentCreditControls({
  eventId,
  recruiter,
}: {
  eventId: string;
  recruiter: { id: string; name: string };
}) {
  const [count, setCount] = useState("1");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-2xl border border-indigo-400/20 bg-surface p-5" dir="rtl">
      <div>
        <h2 className="font-display text-xl text-cream">מימוש זיכויי גיוס</h2>
        <p className="mt-1 text-sm text-cream/50">מגייס/ת אחראי/ת: {recruiter.name || "ללא שם"}</p>
      </div>
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          startTransition(async () => {
            const result = await redeemRecruitmentCredits(eventId, recruiter.id, Number(count));
            setMessage(result.success ? `מומשו ${result.redeemedCount} זיכויים לפי סדר הצבירה.` : result.error);
          });
        }}
      >
        <label className="text-sm text-cream/70">
          מספר זיכויים
          <input
            type="number"
            min="1"
            step="1"
            value={count}
            onChange={(event) => setCount(event.target.value)}
            className="mt-1 block w-28 rounded-lg border border-brass/15 bg-surface2 px-3 py-2 text-sm text-cream"
          />
        </label>
        <button type="submit" disabled={isPending} className="rounded-lg bg-brass px-4 py-2 text-sm font-bold text-obsidian disabled:opacity-50">
          {isPending ? "מממש..." : "ממש זיכויים"}
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-cream/70">{message}</p>}
    </section>
  );
}
