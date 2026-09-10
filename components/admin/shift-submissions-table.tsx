"use client";

import { useState } from "react";
import { ShiftSubmission, reviewShiftSubmission } from "@/app/admin/actions";
import { Check, X, Star } from "lucide-react";

export default function ShiftSubmissionsTable({
  initialSubmissions,
}: {
  initialSubmissions: ShiftSubmission[];
}) {
  const [submissions, setSubmissions] = useState<ShiftSubmission[]>(initialSubmissions);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleAction = async (id: string, status: "approved" | "rejected", reason?: string) => {
    setLoadingId(id);
    setFeedback(null);

    const result = await reviewShiftSubmission(id, status, reason);

    if (result.success) {
      setFeedback({ message: "הדיווח עודכן בהצלחה.", type: "success" });
      setSubmissions((prev) => prev.filter((sub) => sub.submission_id !== id));
      if (status === "rejected") handleCloseModal();
    } else {
      setFeedback({ message: result.error || "אירעה שגיאה.", type: "error" });
    }

    setLoadingId(null);
  };

  const handleCloseModal = () => {
    setRejectingId(null);
    setRejectionReason("");
  };

  const pendingSubmissions = submissions.filter((s) => s.submission_status === "pending");

  return (
    <div className="w-full font-sans" dir="rtl">
      {feedback && (
        <div
          className={`p-4 mb-4 rounded-xl text-xs font-medium border ${
            feedback.type === "error"
              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-brass/15 bg-surface shadow-md">
        <table className="min-w-full divide-y divide-brass/10 text-start" dir="rtl">
          <thead className="bg-surface2">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold text-cream/70 uppercase tracking-wider">עובד</th>
              <th className="px-5 py-3 text-xs font-semibold text-cream/70 uppercase tracking-wider">אירוע ומיקום</th>
              <th className="px-5 py-3 text-xs font-semibold text-cream/70 uppercase tracking-wider">שעות מדווחות</th>
              <th className="px-5 py-3 text-xs font-semibold text-cream/70 uppercase tracking-wider">דירוג ביצוע</th>
              <th className="px-5 py-3 text-xs font-semibold text-cream/70 uppercase tracking-wider">דווח ע"י</th>
              <th className="px-5 py-3 text-xs font-semibold text-cream/70 uppercase tracking-wider">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brass/10 bg-surface">
            {pendingSubmissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-xs text-cream/50">
                  אין דיווחי שעות הממתינים לאישור. הכל נקי!
                </td>
              </tr>
            ) : (
              pendingSubmissions.map((sub) => (
                <tr key={sub.submission_id} className="hover:bg-surface2/50 transition-colors">
                  <td className="px-5 py-4 text-xs text-cream">
                    <div className="font-semibold text-cream">{sub.employee_name}</div>
                    <div className="text-[11px] text-cream/50">ת"ז: {sub.employee_tz}</div>
                  </td>
                  <td className="px-5 py-4 text-xs text-cream/80">
                    <div className="font-medium">{sub.location}</div>
                    <div className="text-[11px] text-cream/50">
                      {new Date(sub.event_date).toLocaleDateString("he-IL")}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-[#D4FF00]">
                    {sub.reported_hours} שעות
                  </td>
                  <td className="px-5 py-4 text-xs text-cream/80">
                    {sub.performance_rating ? (
                      <span className="inline-flex items-center gap-1 text-brass font-medium">
                        <Star className="h-3.5 w-3.5 fill-brass text-brass" />
                        {sub.performance_rating} / 5
                      </span>
                    ) : (
                      <span className="text-cream/40">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-cream/70">
                    {sub.submitted_by_name}
                  </td>
                  <td className="px-5 py-4 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAction(sub.submission_id, "approved")}
                        disabled={loadingId === sub.submission_id}
                        className="flex items-center gap-1 rounded-lg bg-[#4F46E5] hover:bg-indigo-600 px-3 py-1.5 text-white text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {loadingId === sub.submission_id ? "מאשר..." : "אשר"}
                      </button>
                      <button
                        onClick={() => setRejectingId(sub.submission_id)}
                        disabled={loadingId === sub.submission_id}
                        className="flex items-center gap-1 rounded-lg bg-rose-500/15 border border-rose-500/30 px-3 py-1.5 text-rose-300 text-xs font-medium hover:bg-rose-500/25 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        דחה
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-brass/20 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-display text-cream font-bold">דחיית דיווח שעות</h3>
            <p className="text-xs text-cream/60">
              אנא ציין את סיבת הדחייה. מידע זה יוצג למנהל השטח.
            </p>
            <textarea
              className="w-full rounded-xl border border-brass/20 bg-surface2 p-3 text-xs text-cream focus:border-[#4F46E5] focus:outline-none min-h-[100px]"
              placeholder="לדוגמה: הדיווח לא תואם את שעת הסיום בפועל..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs font-medium text-cream/70 hover:text-cream bg-surface2 rounded-lg transition-colors cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={() => handleAction(rejectingId, "rejected", rejectionReason)}
                disabled={loadingId === rejectingId || rejectionReason.trim() === ""}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loadingId === rejectingId ? "שומר..." : "אשר דחייה"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
