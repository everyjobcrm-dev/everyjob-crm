import { fetchPayroll, normalizeMonth, type PayrollLine } from "@/app/admin/actions";
import { buildSheet, xlsxResponse } from "@/lib/admin/xlsx";

// GET /admin/payroll/export?month=YYYY-MM -> one .xlsx, one row per approved shift. fetchPayroll re-checks Admin.
export async function GET(req: Request) {
  const month = (await normalizeMonth(new URL(req.url).searchParams.get("month") ?? undefined)).slice(0, 7);
  const result = await fetchPayroll(month);
  if (!result.success) return new Response(result.error, { status: 403 });

  const names = new Map(result.data.employees.map((e) => [e.employeeId, e.employeeName]));
  const buf = await buildSheet<PayrollLine>(
    `שכר ${month}`,
    [
      { header: "עובד/ת", value: (l) => names.get(l.employeeId) ?? "" },
      { header: "תאריך", value: (l) => l.eventDate },
      { header: "לקוח", value: (l) => l.clientName },
      { header: "תפקיד", value: (l) => l.roleName },
      { header: "שעות", value: (l) => l.hours, total: true },
      { header: "100%", value: (l) => l.hours100, total: true },
      { header: "125%", value: (l) => l.hours125, total: true },
      { header: "150%", value: (l) => l.hours150, total: true },
      { header: "תעריף לשעה", value: (l) => l.wageRate, money: true },
      { header: "שכר", value: (l) => l.pay, money: true, total: true },
      { header: "נסיעות", value: (l) => l.travel, money: true, total: true },
      { header: "הערה", value: (l) => (l.pay == null ? "חסר תעריף" : null) },
    ],
    result.data.lines,
  );
  return xlsxResponse(buf, `payroll-${month}.xlsx`);
}
