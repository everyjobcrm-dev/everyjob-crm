import { Car, TrendingUp, TrendingDown } from "lucide-react";

export type ClosureFinancials = {
  totalHoursReported: number;
  travelPaidToWorkers: number;
  travelChargedToClient: number;
  actualIncome: number;
  actualExpense: number;
};

/**
 * Settlement slip for a closed event: hours actually reported by field
 * managers, travel paid out vs. charged onward, and the resulting margin.
 * Pure presentation — figures are passed in, not computed here. Shared by
 * EventHistoryCard (employee-facing shift history) and events-table
 * (admin events view) so the two never drift out of sync.
 */
export function FinancialClosureSummary({ closure }: { closure: ClosureFinancials }) {
  const travelMargin = closure.travelChargedToClient - closure.travelPaidToWorkers;
  const netMargin = closure.actualIncome - closure.actualExpense;
  const isPositive = netMargin >= 0;

  return (
    <div className="rounded-xl border border-brass/10 bg-surface2 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-cream/40">סיכום פיננסי</p>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="שעות בפועל" value={`${closure.totalHoursReported}`} suffix="ש'" />
        <Stat
          label="נסיעות לעובדים"
          value={`₪${closure.travelPaidToWorkers}`}
          icon={<Car className="h-3 w-3" aria-hidden="true" />}
        />
        <Stat
          label="נסיעות ללקוח"
          value={`₪${closure.travelChargedToClient}`}
          icon={<Car className="h-3 w-3" aria-hidden="true" />}
        />
        <Stat
          label="מרווח נסיעות"
          value={`${travelMargin >= 0 ? "+" : ""}₪${travelMargin}`}
          tone={travelMargin >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-brass/10 pt-3">
        <div className="flex gap-4 text-sm">
          <span className="text-cream/60">
            הכנסה בפועל <span className="font-mono font-semibold tabular-nums text-cream">₪{closure.actualIncome}</span>
          </span>
          <span className="text-cream/60">
            הוצאה בפועל <span className="font-mono font-semibold tabular-nums text-cream">₪{closure.actualExpense}</span>
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-sm font-bold tabular-nums ${
            isPositive ? "bg-indigo-500/15 text-indigo-400" : "bg-rose-500/15 text-rose-400"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isPositive ? "+" : ""}₪{netMargin}
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  icon,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon?: React.ReactNode;
  tone?: "positive" | "negative";
}) {
  return (
    <div>
      <p className="mb-0.5 flex items-center gap-1 text-[11px] text-cream/40">
        {icon}
        {label}
      </p>
      <p
        className={`font-mono text-base font-bold tabular-nums ${
          tone === "positive" ? "text-indigo-400" : tone === "negative" ? "text-rose-400" : "text-cream"
        }`}
      >
        {value}
        {suffix && <span className="ms-0.5 text-xs font-normal text-cream/40">{suffix}</span>}
      </p>
    </div>
  );
}   