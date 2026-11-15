import { fetchPayroll, normalizeMonth } from "@/app/admin/actions";
import { MonthPicker, money, hours } from "@/components/admin/month-picker";
import { PageHeader } from "@/components/ui/page-header";
import { formatEventDate } from "@/lib/format";

// "שכר": approved hours × wage per employee for a month (B2 RPCs, Admin only - the layout and the action re-check).
export default async function AdminPayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = (await normalizeMonth((await searchParams).month)).slice(0, 7);
  const result = await fetchPayroll(month);
  const emps = result.success ? result.data.employees : [];
  const total = (f: (e: (typeof emps)[number]) => number) => emps.reduce((s, e) => s + f(e), 0);

  return (
    <div className="pb-10">
      <PageHeader
        title="שכר"
        subtitle="שעות מאושרות × תעריף לעובד. 8 השעות הראשונות 100%, 2 הבאות 125%, השאר 150%. אירועים ודיווחים מבוטלים אינם נכללים."
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <MonthPicker month={month} />
        {result.success && (
          <a className="btn btn-secondary mb-6" href={`/admin/payroll/export?month=${month}`} download>
            ייצוא לאקסל
          </a>
        )}
      </div>
      {!result.success ? (
        <p className="text-sm text-rose-700">{result.error}</p>
      ) : emps.length === 0 ? (
        <p className="empty-state">אין שעות מאושרות בחודש זה.</p>
      ) : (
        <>
          {emps.some((e) => e.missingRateShifts > 0) && (
            <p className="mb-4 text-sm text-rose-700">יש משמרות ללא תעריף שכר. הן מופיעות ללא סכום ואינן נכללות בסה״כ.</p>
          )}
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[760px] text-start text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  {["עובד/ת", "משמרות", "שעות", "100%", "125%", "150%", "שכר ברוטו", "נסיעות", "סה״כ"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 text-start font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emps.map((e) => (
                  <tr key={e.employeeId} className="border-b border-line align-top">
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer font-medium">
                          {e.employeeName}
                          {e.missingRateShifts > 0 && (
                            <span className="ms-2 text-rose-700">({e.missingRateShifts} ללא תעריף)</span>
                          )}
                        </summary>
                        <ul className="mt-2 space-y-1 text-muted">
                          {result.data.lines
                            .filter((l) => l.employeeId === e.employeeId)
                            .map((l) => (
                              <li key={l.submissionId}>
                                {formatEventDate(l.eventDate)} · {l.clientName}
                                {l.roleName ? ` · ${l.roleName}` : ""} · {hours(l.hours)} שעות ·{" "}
                                {l.pay == null ? (
                                  <span className="text-rose-700">חסר תעריף</span>
                                ) : (
                                  `${money(l.wageRate ?? 0)} לשעה, ${money(l.pay)}`
                                )}
                              </li>
                            ))}
                        </ul>
                      </details>
                    </td>
                    <td className="px-4 py-3">{e.shifts}</td>
                    <td className="px-4 py-3">{hours(e.hours)}</td>
                    <td className="px-4 py-3">{hours(e.hours100)}</td>
                    <td className="px-4 py-3">{hours(e.hours125)}</td>
                    <td className="px-4 py-3">{hours(e.hours150)}</td>
                    <td className="px-4 py-3">{money(e.grossPay)}</td>
                    <td className="px-4 py-3">{money(e.travel)}</td>
                    <td className="px-4 py-3 font-medium">{money(e.grossPay + e.travel)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-medium">
                  <td className="px-4 py-3">סה״כ</td>
                  <td className="px-4 py-3">{total((e) => e.shifts)}</td>
                  <td className="px-4 py-3">{hours(total((e) => e.hours))}</td>
                  <td colSpan={3} />
                  <td className="px-4 py-3">{money(total((e) => e.grossPay))}</td>
                  <td className="px-4 py-3">{money(total((e) => e.travel))}</td>
                  <td className="px-4 py-3">{money(total((e) => e.grossPay + e.travel))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export const metadata = { title: "שכר" };
