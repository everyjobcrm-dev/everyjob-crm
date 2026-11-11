import { fetchPendingHours } from "@/app/admin/actions";
import { HoursApprovalBoard } from "@/components/admin/hours-approval-board";
import { PageHeader } from "@/components/ui/page-header";

// "אישור שעות": pending hour reports grouped by event. Admin only (the admin layout and every action re-check the role).
export default async function AdminHoursPage() {
  const result = await fetchPendingHours();

  return (
    <div className="pb-10">
      <PageHeader title="אישור שעות" subtitle="דוחות שעות שהוגשו על ידי מנהלי שטח וממתינים לאישור. לא ניתן לאשר שעות שעבדת בעצמך." />
      {result.success ? (
        <HoursApprovalBoard rows={result.data} />
      ) : (
        <p className="text-sm text-rose-700">{result.error}</p>
      )}
    </div>
  );
}
