import { fetchBilling, normalizeMonth, type BillingEvent } from "@/app/admin/actions";
import { buildSheet, xlsxResponse } from "@/lib/admin/xlsx";

// GET /admin/billing/export?month=YYYY-MM -> one .xlsx, one row per client event. fetchBilling re-checks Admin.
export async function GET(req: Request) {
  const month = (await normalizeMonth(new URL(req.url).searchParams.get("month") ?? undefined)).slice(0, 7);
  const result = await fetchBilling(month);
  if (!result.success) return new Response(result.error, { status: 403 });

  const buf = await buildSheet<BillingEvent>(
    `חיוב ${month}`,
    [
      { header: "לקוח", value: (r) => r.clientName },
      { header: "תאריך", value: (r) => r.eventDate },
      { header: "מיקום", value: (r) => r.location },
      { header: "משמרות", value: (r) => r.shifts, total: true },
      { header: "שעות", value: (r) => r.hours, total: true },
      { header: "שעות לחיוב", value: (r) => r.billableHours, total: true },
      { header: "סכום", value: (r) => r.amount, money: true, total: true },
      { header: "נסיעות", value: (r) => r.travel, money: true, total: true },
      { header: "הערה", value: (r) => (r.missingPriceShifts > 0 ? `${r.missingPriceShifts} משמרות ללא מחיר` : null) },
    ],
    result.data,
  );
  return xlsxResponse(buf, `billing-${month}.xlsx`);
}
