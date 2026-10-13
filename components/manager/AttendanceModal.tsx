"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { submitShiftAttendance } from "@/app/manager/actions";

// Attendance / hours entry (Manager and above). The hours flow itself is DEFERRED (AGENTS.md 6) - this modal is the
// pre-existing UI moved out of the old RosterTable unchanged in behavior; it is not extended in Phase 3.

export type AttendanceTarget = {
  registrationId: string;
  name: string;
  roleName: string | null;
  startTime: string | null;
  endTime: string | null;
  reportedHours: number | null;
};

export function AttendanceModal({ target, onClose }: { target: AttendanceTarget; onClose: () => void }) {
  const [reportedStart, setReportedStart] = useState(
    target.startTime?.slice(0, 5) || "08:00"
  );
  const [reportedEnd, setReportedEnd] = useState(
    target.endTime?.slice(0, 5) || "16:00"
  );
  const [reportedHours, setReportedHours] = useState(
    target.reportedHours ? String(target.reportedHours) : "8"
  );
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const hours = parseFloat(reportedHours);
    if (isNaN(hours) || hours <= 0) {
      setErrorMsg("נא להזין מספר שעות חיובי תקין.");
      return;
    }

    startTransition(async () => {
      const res = await submitShiftAttendance({
        registrationId: target.registrationId,
        reportedStart,
        reportedEnd,
        reportedHours: hours,
        performanceRating: rating,
        performanceNotes: notes,
      });

      if (res.success) {
        router.refresh();
        onClose();
      } else {
        setErrorMsg(res.error);
      }
    });
  };

  const name = target.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl border border-brass/20 bg-surface p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-brass/10 pb-4">
          <div>
            <p className="text-xs text-indigo-400 font-semibold">
              {target.roleName}
            </p>
            <h3 className="font-display text-xl text-cream">דיווח נוכחות: {name}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-cream/50 hover:text-cream text-lg p-1 rounded hover:bg-surface2 transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-cream/70 mb-1">
                שעת התחלה בפועל
              </label>
              <input
                type="time"
                value={reportedStart}
                onChange={(e) => setReportedStart(e.target.value)}
                className="w-full rounded-lg border border-brass/20 bg-surface2 px-3 py-2 text-sm text-cream focus:border-[#4F46E5] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cream/70 mb-1">
                שעת סיום בפועל
              </label>
              <input
                type="time"
                value={reportedEnd}
                onChange={(e) => setReportedEnd(e.target.value)}
                className="w-full rounded-lg border border-brass/20 bg-surface2 px-3 py-2 text-sm text-cream focus:border-[#4F46E5] focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/70 mb-1">
              סה״כ שעות מדווחות
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              value={reportedHours}
              onChange={(e) => setReportedHours(e.target.value)}
              className="w-full rounded-lg border border-brass/20 bg-surface2 px-3 py-2 text-sm text-cream focus:border-[#4F46E5] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/70 mb-2">
              דירוג ביצוע עובד/ת (1 עד 5 כוכבים)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110 cursor-pointer"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating
                        ? "fill-brass text-brass"
                        : "text-cream/20 hover:text-cream/40"
                    }`}
                  />
                </button>
              ))}
              <span className="ms-2 text-xs font-semibold text-brass">
                {rating} / 5
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/70 mb-1">
              הערות מנהל שטח (אופציונלי)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="רשום הערות לגבי תפקוד העובד/ת..."
              className="w-full rounded-lg border border-brass/20 bg-surface2 p-3 text-sm text-cream focus:border-[#4F46E5] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-cream/70 hover:text-cream bg-surface2 rounded-lg transition-colors cursor-pointer"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-indigo-600 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isPending ? "שומר..." : "הגש דוח שעות"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
