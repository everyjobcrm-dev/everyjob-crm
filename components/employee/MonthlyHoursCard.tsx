import type { MyMonthlyHours } from "@/app/employee/events/actions";

// Monthly summary from v_my_monthly_hours (approved, non-voided hours of non-cancelled events). Derived on read only.
const monthFmt = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" });
const money = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 });

export function MonthlyHoursCard({ months, currentMonth }: { months: MyMonthlyHours[]; currentMonth: string }) {
  const current = months.find((m) => m.month === currentMonth) ?? {
    month: currentMonth,
    approvedHours: 0,
    estimatedPay: 0,
    shiftsWithoutRate: 0,
  };
  const previous = months.filter((m) => m.month !== currentMonth).slice(0, 3);

  return (
    <section className="mb-8 border-s-4 border-sky bg-surface px-5 py-4">
      <p className="text-xs text-muted">{monthFmt.format(new Date(`${current.month}T00:00:00Z`))}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <p className="font-display text-2xl text-ink">
          {current.approvedHours} <span className="text-sm text-muted">שעות שאושרו</span>
        </p>
        <p className="font-display text-2xl text-sky-deep">
          {money.format(current.estimatedPay)} <span className="text-sm text-muted">שכר משוער</span>
        </p>
      </div>
      {current.shiftsWithoutRate > 0 && (
        <p className="mt-2 text-xs text-muted">
          {current.shiftsWithoutRate} משמרות עדיין ללא תעריף שעתי ולכן אינן נכללות בשכר המשוער.
        </p>
      )}
      <p className="mt-2 text-[11px] text-muted">הערכה בלבד, לפני תוספות, נסיעות וניכויים.</p>
      {previous.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-xs text-muted">
          {previous.map((m) => (
            <li key={m.month}>
              {monthFmt.format(new Date(`${m.month}T00:00:00Z`))}: {m.approvedHours} שעות · {money.format(m.estimatedPay)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
