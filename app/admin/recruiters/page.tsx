import { fetchRecruiterCreditsMonth, getRecruiterPendingCredits, normalizeMonth } from "@/app/admin/actions";
import { MonthPicker, money } from "@/components/admin/month-picker";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminRecruitersPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = (await normalizeMonth((await searchParams).month)).slice(0, 7);
  const [result, monthly] = await Promise.all([getRecruiterPendingCredits(), fetchRecruiterCreditsMonth(month)]);

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

      <section aria-labelledby="monthly-credits" className="mt-10">
        <h2 id="monthly-credits" className="mb-1 text-sm font-semibold text-ink/80">
          זיכויים לפי חודש
        </h2>
        <p className="mb-4 text-xs text-muted">זיכויים שנוצרו בחודש (לפי מועד אישור השעות). זיכויים שבוטלו אינם נכללים.</p>
        <MonthPicker month={month} />
        {!monthly.success ? (
          <p className="text-sm text-rose-700">{monthly.error}</p>
        ) : monthly.data.length === 0 ? (
          <p className="empty-state">אין זיכויים בחודש זה.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-start text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  {["מגייס/ת", "זיכויים", "סכום", "ממתינים", "מומשו", "סכום שמומש"].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3 text-start font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {monthly.data.map((m) => {
                  const r = recruiters.find((x) => x.recruiter_id === m.recruiterId);
                  return (
                    <tr key={m.recruiterId}>
                      <td className="px-5 py-4 font-semibold text-ink">
                        {r ? [r.first_name, r.last_name].filter(Boolean).join(" ") : "מגייס/ת לשעבר"}
                      </td>
                      <td className="px-5 py-4 tabular-nums">{m.earnedCount}</td>
                      <td className="px-5 py-4 tabular-nums">{money(m.earnedAmount)}</td>
                      <td className="px-5 py-4 tabular-nums">{m.pendingCount}</td>
                      <td className="px-5 py-4 tabular-nums">{m.redeemedCount}</td>
                      <td className="px-5 py-4 font-semibold text-primary-soft tabular-nums">{money(m.redeemedAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export const metadata = { title: "מגייסים" };
