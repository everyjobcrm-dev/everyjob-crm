"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Star, X, Ban } from "lucide-react";
import { approveShiftHours, rejectShiftHours, voidShiftHours, type PendingHours } from "@/app/admin/actions";
import { hoursReasonSchema, type HoursReasonFormInput, type HoursReasonFormOutput } from "@/lib/validations/hours";

const timeFmt = new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" });

export function HoursApprovalBoard({ rows }: { rows: PendingHours[] }) {
  if (rows.length === 0) {
    return <p className="border-s-2 border-brass/20 ps-4 text-sm text-cream/50">אין דוחות שעות שממתינים לאישור.</p>;
  }
  const byEvent = new Map<string, PendingHours[]>();
  for (const r of rows) byEvent.set(r.eventId, [...(byEvent.get(r.eventId) ?? []), r]);

  return (
    <div className="space-y-8">
      {[...byEvent.values()].map((list) => (
        <section key={list[0].eventId} className="border-s-4 border-[#4F46E5] bg-surface">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-brass/10 px-5 py-3">
            <h2 className="font-display text-lg text-cream">{list[0].location}</h2>
            <p className="text-xs text-cream/50">
              {list[0].eventDate} · {list.length} דוחות · {list.reduce((s, r) => s + r.reportedHours, 0)} שעות
            </p>
          </header>
          <div className="divide-y divide-brass/10">
            {list.map((row) => (
              <HoursRow key={row.submissionId} row={row} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function HoursRow({ row }: { row: PendingHours }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"reject" | "void" | null>(null);

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const res = await approveShiftHours(row.submissionId);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-cream">
            {row.employeeName}
            {row.isOwnHours && <span className="ms-2 rounded-sm bg-cream/10 px-1.5 py-0.5 text-[11px] text-cream/60">השעות שלך</span>}
          </p>
          <p className="text-xs text-cream/50">
            {timeFmt.format(new Date(row.reportedStart))}–{timeFmt.format(new Date(row.reportedEnd))} ·{" "}
            <span className="font-semibold text-cream/80">{row.reportedHours} שעות</span> · הוגש על ידי {row.submittedByName}
            {row.performanceRating != null && (
              <span className="ms-2 inline-flex items-center gap-0.5 text-brass">
                <Star className="h-3 w-3 fill-brass" aria-hidden="true" /> {row.performanceRating}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!row.isOwnHours && (
            <button
              type="button"
              disabled={isPending}
              onClick={approve}
              className="inline-flex items-center gap-1 rounded-md bg-[#4F46E5] px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> אישור
            </button>
          )}
          {!row.isOwnHours && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => setMode(mode === "reject" ? null : "reject")}
              className="inline-flex items-center gap-1 rounded-md border border-brass/20 px-3 py-1.5 text-xs text-cream/75 hover:bg-surface2 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" /> דחייה
            </button>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => setMode(mode === "void" ? null : "void")}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
          >
            <Ban className="h-3.5 w-3.5" aria-hidden="true" /> ביטול דוח
          </button>
        </div>
      </div>
      {row.isOwnHours && <p className="mt-1 text-xs text-cream/60">את השעות שעבדת בעצמך לא ניתן לאשר או לדחות.</p>}
      {mode && <ReasonForm row={row} mode={mode} onDone={() => setMode(null)} />}
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

function ReasonForm({ row, mode, onDone }: { row: PendingHours; mode: "reject" | "void"; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HoursReasonFormInput, unknown, HoursReasonFormOutput>({
    resolver: zodResolver(hoursReasonSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = (values: HoursReasonFormOutput) => {
    setServerError(null);
    startTransition(async () => {
      const res =
        mode === "reject" ? await rejectShiftHours(row.submissionId, values.reason) : await voidShiftHours(row.submissionId, values.reason);
      if (!res.success) {
        setServerError(res.error);
        return;
      }
      onDone();
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-2 border-s-2 border-rose-500/40 ps-3" noValidate>
      <label htmlFor={`reason-${row.submissionId}`} className="block text-xs text-cream/70">
        {mode === "reject" ? "סיבת הדחייה (חובה) - מנהל השטח יוכל להגיש מחדש:" : "סיבת הביטול (חובה):"}
      </label>
      <textarea
        id={`reason-${row.submissionId}`}
        rows={2}
        {...register("reason")}
        className="w-full rounded-md border border-brass/20 bg-surface2 p-2 text-sm text-cream"
      />
      {(errors.reason?.message || serverError) && <p className="text-xs text-rose-400">{errors.reason?.message ?? serverError}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="rounded-md bg-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-100 disabled:opacity-50">
          {isPending ? "שומר..." : mode === "reject" ? "אישור דחייה" : "אישור ביטול"}
        </button>
        <button type="button" onClick={onDone} className="rounded-md px-3 py-1.5 text-xs text-cream/60">
          חזרה
        </button>
      </div>
    </form>
  );
}
