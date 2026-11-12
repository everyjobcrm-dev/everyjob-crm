"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { redeemRecruiterCredits } from "@/app/manager/actions";
import { redeemCreditsSchema, type RedeemCreditsFormInput, type RedeemCreditsFormOutput } from "@/lib/validations/hours";

// Manager / Admin only (the page never renders this for recruiters; the action and the RPC re-check the role).
// Redeems the EVENT recruiter's N oldest pending credits (FIFO), recorded with this event as context.
const money = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 });

export function RedeemCreditsControl({
  eventId,
  recruiterName,
  pendingCount,
  pendingAmount,
}: {
  eventId: string;
  recruiterName: string;
  pendingCount: number;
  pendingAmount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<number | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RedeemCreditsFormInput, unknown, RedeemCreditsFormOutput>({
    resolver: zodResolver(redeemCreditsSchema),
    defaultValues: { count: 1 },
  });

  const onSubmit = (values: RedeemCreditsFormOutput) => {
    setMessage(null);
    setConfirming(values.count);
  };

  const confirm = () => {
    if (confirming == null) return;
    startTransition(async () => {
      const res = await redeemRecruiterCredits(eventId, confirming);
      setConfirming(null);
      if (!res.success) setMessage({ tone: "error", text: res.error });
      else {
        setMessage({ tone: "ok", text: `מומשו ${res.redeemedCount} זיכויים.` });
        router.refresh();
      }
    });
  };

  return (
    <section className="border-s-4 border-sky bg-surface px-5 py-4">
      <h2 className="font-display text-lg text-ink">זיכויי גיוס: {recruiterName}</h2>
      <p className="mt-1 text-sm text-ink/80">
        {pendingCount} זיכויים ממתינים · {money.format(pendingAmount)}
      </p>

      {pendingCount > 0 ? (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-3 flex flex-wrap items-start gap-2" noValidate>
          <div>
            <label htmlFor="redeem-count" className="sr-only">
              מספר זיכויים למימוש
            </label>
            <input
              id="redeem-count"
              type="number"
              min={1}
              max={pendingCount}
              step={1}
              {...register("count")}
              className="w-24 rounded-md border border-line-strong bg-surface2 px-2 py-1.5 text-sm text-ink"
            />
            {errors.count?.message && <p className="mt-1 text-xs text-rose-700">{errors.count.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-sky/25 px-3 py-1.5 text-xs font-semibold text-sky-deep disabled:opacity-50"
          >
            מימוש (מהוותיק לחדש)
          </button>
        </form>
      ) : (
        <p className="mt-2 text-xs text-muted">אין זיכויים ממתינים למימוש.</p>
      )}

      {confirming != null && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs text-ink/80">
          <span>לממש {confirming} זיכויים ותיקים של {recruiterName} במסגרת אירוע זה?</span>
          <button
            type="button"
            disabled={isPending}
            onClick={confirm}
            className="btn btn-primary btn-sm"
          >
            {isPending ? "מממש..." : "אישור מימוש"}
          </button>
          <button type="button" onClick={() => setConfirming(null)} className="rounded-md px-2 py-1.5 text-muted">
            ביטול
          </button>
        </div>
      )}
      {message && <p className={`mt-2 text-xs ${message.tone === "ok" ? "text-sky-deep" : "text-rose-700"}`}>{message.text}</p>}
    </section>
  );
}
