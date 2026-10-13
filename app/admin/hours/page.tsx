import { fetchPendingHours } from "@/app/admin/actions";
import { HoursApprovalBoard } from "@/components/admin/hours-approval-board";

// "אישור שעות": pending hour reports grouped by event. Admin only (the admin layout and every action re-check the role).
export default async function AdminHoursPage() {
  const result = await fetchPendingHours();

  return (
    <div className="pb-10">
      <header className="mb-8">
        <p className="text-sm text-cream/50">ממשק מנהל</p>
        <h1 className="font-display text-3xl text-cream">אישור שעות</h1>
        <p className="mt-2 text-sm text-cream/50">
          דוחות שעות שהוגשו על ידי מנהלי שטח וממתינים לאישור. לא ניתן לאשר שעות שעבדת בעצמך.
        </p>
      </header>
      {result.success ? (
        <HoursApprovalBoard rows={result.data} />
      ) : (
        <p className="text-sm text-rose-400">{result.error}</p>
      )}
    </div>
  );
}
