"use client";

import { useActionState } from "react";
import { setBillingCycle, type BillingCycle } from "@/app/admin/actions";
import { formatEventDate } from "@/lib/format";

const monthLabel = (iso: string) =>
  new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));

// "מחזור חיוב": close/reopen the selected month (Admin). Closing a cycle is what later allows the Form 101 purge;
// that purge stays hidden until 2FA exists (Milestone D).
export function BillingCycleControl({ month, cycles }: { month: string; cycles: BillingCycle[] }) {
  const [state, action, pending] = useActionState(setBillingCycle, { error: null });
  const current = cycles.find((c) => c.month.startsWith(month));
  const closed = Boolean(current?.closedAt);
  const history = cycles.filter((c) => c.closedAt || c.reopenedAt);

  return (
    <section className="card mt-8 p-4">
      <h2 className="text-base font-semibold">מחזור חיוב - {monthLabel(`${month}-01`)}</h2>
      <p className="mt-1 text-sm text-muted">
        {closed
          ? `סגור מאז ${formatEventDate(current!.closedAt!)}.`
          : "פתוח. אפשר לסגור אותו רק אחרי שהחודש הסתיים."}
      </p>
      <form action={action} className="mt-3 flex flex-wrap items-center gap-3">
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="op" value={closed ? "reopen" : "close"} />
        <button type="submit" className={closed ? "btn btn-secondary" : "btn btn-primary"} disabled={pending}>
          {pending ? "שומר..." : closed ? "פתיחה מחדש" : "סגירת המחזור"}
        </button>
        {state.error && (
          <p role="alert" className="text-sm text-rose-700">
            {state.error}
          </p>
        )}
      </form>
      {history.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-line pt-3 text-sm text-muted">
          {history.map((c) => (
            <li key={c.month}>
              {monthLabel(c.month)}: {c.closedAt ? `סגור (${formatEventDate(c.closedAt)})` : `נפתח מחדש (${formatEventDate(c.reopenedAt!)})`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
