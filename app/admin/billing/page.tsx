import { fetchBilling, normalizeMonth, type BillingEvent } from "@/app/admin/actions";
import { MonthPicker, money, hours } from "@/components/admin/month-picker";
import { PageHeader } from "@/components/ui/page-header";
import { formatEventDate } from "@/lib/format";

// "חיוב לקוחות": per client, then per event, for a month (B2 RPC, Admin only - the layout and the action re-check).
export default async function AdminBillingPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = (await normalizeMonth((await searchParams).month)).slice(0, 7);
  const result = await fetchBilling(month);

  const byClient = new Map<string, BillingEvent[]>();
  if (result.success) for (const r of result.data) byClient.set(r.clientId, [...(byClient.get(r.clientId) ?? []), r]);
  const sum = (rows: BillingEvent[], f: (r: BillingEvent) => number) => rows.reduce((s, r) => s + f(r), 0);

  return (
    <div className="pb-10">
      <PageHeader
        title="חיוב לקוחות"
        subtitle="מחיר לשעה לפי תפקיד × שעות לחיוב (לפחות מינימום החיוב של הלקוח), ללא תוספת שעות נוספות. נסיעות מועברות כפי שהן."
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <MonthPicker month={month} />
        {result.success && (
          <a className="btn btn-secondary mb-6" href={`/admin/billing/export?month=${month}`} download>
            ייצוא לאקסל
          </a>
        )}
      </div>
      {!result.success ? (
        <p className="text-sm text-rose-700">{result.error}</p>
      ) : byClient.size === 0 ? (
        <p className="empty-state">אין שעות מאושרות בחודש זה.</p>
      ) : (
        <div className="space-y-6">
          {[...byClient.values()].map((rows) => (
            <section key={rows[0].clientId} className="card overflow-x-auto">
              <h2 className="px-4 pt-4 text-base font-semibold">{rows[0].clientName}</h2>
              {rows.some((r) => r.missingPriceShifts > 0) && (
                <p className="px-4 pt-1 text-sm text-rose-700">יש משמרות ללא מחיר ללקוח. הן אינן נכללות בסכום.</p>
              )}
              <table className="mt-2 w-full min-w-[680px] text-start text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    {["תאריך", "מיקום", "משמרות", "שעות", "שעות לחיוב", "סכום", "נסיעות", "סה״כ"].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-start font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.eventId} className="border-b border-line">
                      <td className="px-4 py-3">{formatEventDate(r.eventDate)}</td>
                      <td className="px-4 py-3">{r.location}</td>
                      <td className="px-4 py-3">
                        {r.shifts}
                        {r.missingPriceShifts > 0 && (
                          <span className="ms-1 text-rose-700">({r.missingPriceShifts} ללא מחיר)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{hours(r.hours)}</td>
                      <td className="px-4 py-3">{hours(r.billableHours)}</td>
                      <td className="px-4 py-3">{money(r.amount)}</td>
                      <td className="px-4 py-3">{money(r.travel)}</td>
                      <td className="px-4 py-3 font-medium">{money(r.amount + r.travel)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-medium">
                    <td className="px-4 py-3" colSpan={2}>
                      סה״כ ללקוח
                    </td>
                    <td className="px-4 py-3">{sum(rows, (r) => r.shifts)}</td>
                    <td className="px-4 py-3">{hours(sum(rows, (r) => r.hours))}</td>
                    <td className="px-4 py-3">{hours(sum(rows, (r) => r.billableHours))}</td>
                    <td className="px-4 py-3">{money(sum(rows, (r) => r.amount))}</td>
                    <td className="px-4 py-3">{money(sum(rows, (r) => r.travel))}</td>
                    <td className="px-4 py-3">{money(sum(rows, (r) => r.amount + r.travel))}</td>
                  </tr>
                </tfoot>
              </table>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
