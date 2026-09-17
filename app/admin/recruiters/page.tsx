import { getRecruiterPendingCredits } from "@/app/admin/actions";

export default async function AdminRecruitersPage() {
  const result = await getRecruiterPendingCredits();

  if (!result.success) {
    return <p className="text-sm text-rose-400">{result.error}</p>;
  }

  const recruiters = result.data ?? [];

  return (
    <div className="pb-10" dir="rtl">
      <header className="mb-8">
        <p className="text-sm text-cream/50">ממשק מנהל</p>
        <h1 className="font-display text-3xl text-cream">מגייסים</h1>
        <p className="mt-2 text-sm text-cream/50">סיכום חי של זיכויי הגיוס הממתינים. מימוש מתבצע מתוך מסך ניהול אירוע בלבד.</p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-brass/15 bg-surface">
        <table className="w-full min-w-[560px] text-start text-sm">
          <thead>
            <tr className="border-b border-brass/10 text-cream/50">
              <th className="px-5 py-3 text-start font-medium">מגייס/ת</th>
              <th className="px-5 py-3 text-start font-medium">תעריף זיכוי לשעה</th>
              <th className="px-5 py-3 text-start font-medium">זיכויים ממתינים</th>
              <th className="px-5 py-3 text-start font-medium">סכום ממתין</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brass/10">
            {recruiters.map((recruiter) => (
              <tr key={recruiter.recruiter_id}>
                <td className="px-5 py-4 font-semibold text-cream">
                  {[recruiter.first_name, recruiter.last_name].filter(Boolean).join(" ")}
                </td>
                <td className="px-5 py-4 text-cream/75 tabular-nums">
                  {recruiter.recruiter_bonus_rate == null
                    ? "לא הוגדר"
                    : `₪${Number(recruiter.recruiter_bonus_rate).toLocaleString("he-IL", { maximumFractionDigits: 2 })}`}
                </td>
                <td className="px-5 py-4 text-cream/75 tabular-nums">{recruiter.pending_recruitment_count}</td>
                <td className="px-5 py-4 font-semibold text-brass tabular-nums">
                  ₪{Number(recruiter.pending_recruitment_amount).toLocaleString("he-IL", { maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {recruiters.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-cream/40">אין מגייסים להצגה.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
