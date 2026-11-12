import { getRecruiterPendingCredits } from "@/app/admin/actions";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminRecruitersPage() {
  const result = await getRecruiterPendingCredits();

  if (!result.success) {
    return <p className="text-sm text-rose-700">{result.error}</p>;
  }

  const recruiters = result.data ?? [];

  return (
    <div className="pb-10" dir="rtl">
      <PageHeader title="מגייסים" subtitle="סיכום חי של זיכויי הגיוס הממתינים. מימוש מתבצע מתוך מסך ניהול אירוע בלבד." />

      <div className="overflow-x-auto card">
        <table className="w-full min-w-[560px] text-start text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-5 py-3 text-start font-medium">מגייס/ת</th>
              <th className="px-5 py-3 text-start font-medium">תעריף זיכוי לשעה</th>
              <th className="px-5 py-3 text-start font-medium">זיכויים ממתינים</th>
              <th className="px-5 py-3 text-start font-medium">סכום ממתין</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {recruiters.map((recruiter) => (
              <tr key={recruiter.recruiter_id}>
                <td className="px-5 py-4 font-semibold text-ink">
                  {[recruiter.first_name, recruiter.last_name].filter(Boolean).join(" ")}
                </td>
                <td className="px-5 py-4 text-ink/80 tabular-nums">
                  {recruiter.recruiter_bonus_rate == null
                    ? "לא הוגדר"
                    : `₪${Number(recruiter.recruiter_bonus_rate).toLocaleString("he-IL", { maximumFractionDigits: 2 })}`}
                </td>
                <td className="px-5 py-4 text-ink/80 tabular-nums">{recruiter.pending_recruitment_count}</td>
                <td className="px-5 py-4 font-semibold text-primary-soft tabular-nums">
                  ₪{Number(recruiter.pending_recruitment_amount).toLocaleString("he-IL", { maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {recruiters.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-muted">אין מגייסים להצגה.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
