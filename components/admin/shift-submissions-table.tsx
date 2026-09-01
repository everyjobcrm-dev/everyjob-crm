"use client";

import { useState } from "react";
import { ShiftSubmission, reviewShiftSubmission } from "@/app/admin/actions";

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
    <div className="w-full font-sans">
      {feedback && (
        <div
          className={`p-4 mb-4 rounded-md text-sm font-medium ${
            feedback.type === "error" ? "bg-red-50 text-red-800 border border-red-200" : "bg-green-50 text-green-800 border border-green-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-right" dir="rtl">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold text-gray-900">עובד</th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-900">אירוע ומיקום</th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-900">שעות</th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-900">דווח ע"י</th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-900">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {pendingSubmissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  אין דיווחי שעות הממתינים לאישור. הכל נקי!
                </td>
              </tr>
            ) : (
              pendingSubmissions.map((sub) => (
                <tr key={sub.submission_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="font-medium">{sub.employee_name}</div>
                    <div className="text-xs text-gray-500">ת"ז: {sub.employee_tz}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>{sub.location}</div>
                    <div className="text-xs">{new Date(sub.event_date).toLocaleDateString('he-IL')}</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-indigo-600">
                    {sub.reported_hours} שעות
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {sub.submitted_by_name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(sub.submission_id, "approved")}
                        disabled={loadingId === sub.submission_id}
                        className="rounded-md bg-[#4F46E5] px-3 py-1.5 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {loadingId === sub.submission_id ? "מאשר..." : "אשר"}
                      </button>
                      <button
                        onClick={() => setRejectingId(sub.submission_id)}
                        disabled={loadingId === sub.submission_id}
                        className="rounded-md bg-white border border-red-200 px-3 py-1.5 text-red-600 text-sm font-medium hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-all cursor-pointer"
                      >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">דחיית דיווח שעות</h3>
            <p className="text-sm text-gray-500 mb-4">
              אנא ציין את סיבת הדחייה. מידע זה יוצג למנהל השטח.
            </p>
            <textarea
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] min-h-[100px]"
              placeholder="לדוגמה: הדיווח לא תואם את שעת הסיום בפועל..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={() => handleAction(rejectingId, "rejected", rejectionReason)}
                disabled={loadingId === rejectingId || rejectionReason.trim() === ""}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 cursor-pointer"
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
