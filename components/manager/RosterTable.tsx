"use client";

import { useState, useTransition } from "react";
import {
  approveCancellation,
  rejectCancellation,
  promoteWaitlist,
  submitShiftAttendance,
} from "@/app/manager/actions";
import { Check, X, ArrowUpCircle, Clock, Star, AlertCircle, CheckCircle2 } from "lucide-react";

type Reg = {
  id: string;
  status: string;
  cancellation_requested_at: string | null;
  created_at: string;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    average_rating?: number | null;
  } | null;
  event_roles: {
    id: string;
    role_name: string;
    start_time?: string;
    end_time?: string;
  } | null;
  submission?: {
    id: string;
    status: "pending" | "approved" | "rejected";
    reported_hours: number;
    performance_rating: number | null;
    performance_notes: string | null;
  } | null;
};

export function RosterTable({ registrations }: { registrations: Reg[] }) {
  const [selectedReg, setSelectedReg] = useState<Reg | null>(null);

  const byRole = registrations.reduce((acc, reg) => {
    const roleName = reg.event_roles?.role_name || "תפקיד כללי";
    if (!acc[roleName]) acc[roleName] = [];
    acc[roleName].push(reg);
    return acc;
  }, {} as Record<string, Reg[]>);

  return (
    <div className="space-y-8" dir="rtl">
      {Object.entries(byRole).map(([roleName, regs]) => {
        const confirmed = regs.filter(
          (r) => r.status !== "waitlisted" && !r.cancellation_requested_at && r.status !== "cancelled"
        );
        const cancellations = regs.filter((r) => r.cancellation_requested_at && r.status !== "cancelled");
        const waitlist = regs.filter(
          (r) => r.status === "waitlisted" && !r.cancellation_requested_at
        );

        return (
          <div key={roleName} className="rounded-xl border border-brass/15 bg-surface overflow-hidden">
            <div className="bg-surface2 px-5 py-3 border-b border-brass/10 flex items-center justify-between">
              <h3 className="font-display font-semibold text-cream text-lg">{roleName}</h3>
              <span className="text-xs text-cream/50">
                {confirmed.length} עובדים מבוקשים
              </span>
            </div>

            <div className="p-5 space-y-6">
              {cancellations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-rose-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> בקשות ביטול משמרת
                  </h4>
                  <div className="space-y-2">
                    {cancellations.map((reg) => (
                      <RegRow key={reg.id} reg={reg} type="cancellation" onOpenAttendance={setSelectedReg} />
                    ))}
                  </div>
                </div>
              )}

              {confirmed.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-indigo-300 mb-3 uppercase tracking-wider">
                    עובדים מאושרים במשמרת
                  </h4>
                  <div className="space-y-2">
                    {confirmed.map((reg) => (
                      <RegRow key={reg.id} reg={reg} type="confirmed" onOpenAttendance={setSelectedReg} />
                    ))}
                  </div>
                </div>
              )}

              {waitlist.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[#D4FF00] mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#D4FF00]" /> ברשימת המתנה
                  </h4>
                  <div className="space-y-2">
                    {waitlist.map((reg) => (
                      <RegRow key={reg.id} reg={reg} type="waitlist" onOpenAttendance={setSelectedReg} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {selectedReg && (
        <AttendanceModal reg={selectedReg} onClose={() => setSelectedReg(null)} />
      )}
    </div>
  );
}

function RegRow({
  reg,
  type,
  onOpenAttendance,
}: {
  reg: Reg;
  type: "cancellation" | "confirmed" | "waitlist";
  onOpenAttendance: (reg: Reg) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (action: "approve_cancel" | "reject_cancel" | "promote") => {
    startTransition(async () => {
      if (action === "approve_cancel") await approveCancellation(reg.id);
      if (action === "reject_cancel") await rejectCancellation(reg.id);
      if (action === "promote") await promoteWaitlist(reg.id);
    });
  };

  const firstName = reg.profiles?.first_name || "";
  const lastName = reg.profiles?.last_name || "";
  const name = (firstName + " " + lastName).trim() || "עובד ללא שם";

  return (
    <div
      className={
        "flex flex-wrap items-center justify-between p-3.5 rounded-lg border transition-colors " +
        (type === "cancellation"
          ? "bg-rose-500/10 border-rose-500/20"
          : "bg-surface2 border-brass/10 hover:border-brass/25")
      }
    >
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-cream">{name}</p>
          {reg.profiles?.average_rating != null && Number(reg.profiles.average_rating) > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs text-brass">
              <Star className="h-3 w-3 fill-brass text-brass" />
              {Number(reg.profiles.average_rating).toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-xs text-cream/50">{reg.profiles?.phone || "ללא טלפון"}</p>
      </div>

      <div className="flex items-center gap-2 mt-2 sm:mt-0">
        {type === "cancellation" && (
          <>
            <button
              disabled={isPending}
              onClick={() => handleAction("approve_cancel")}
              className="flex items-center gap-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> אישור ביטול
            </button>
            <button
              disabled={isPending}
              onClick={() => handleAction("reject_cancel")}
              className="flex items-center gap-1 bg-surface border border-brass/20 text-cream/70 hover:bg-surface2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> דחייה
            </button>
          </>
        )}

        {type === "waitlist" && (
          <button
            disabled={isPending}
            onClick={() => handleAction("promote")}
            className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" /> קידום למשמרת
          </button>
        )}

        {type === "confirmed" && (
          <div className="flex items-center gap-2">
            {reg.submission ? (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  reg.submission.status === "approved"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : reg.submission.status === "rejected"
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                    : "bg-[#D4FF00]/15 text-[#D4FF00] border border-[#D4FF00]/20"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {reg.submission.status === "approved"
                  ? "אושר"
                  : reg.submission.status === "rejected"
                  ? "נדחה"
                  : "דיווח הוגש"}
                ({reg.submission.reported_hours} ש')
              </span>
            ) : null}

            <button
              onClick={() => onOpenAttendance(reg)}
              className="flex items-center gap-1.5 bg-[#4F46E5] text-white hover:bg-indigo-600 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              {reg.submission ? "עדכן דיווח" : "דיווח שעות ודירוג"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AttendanceModal({ reg, onClose }: { reg: Reg; onClose: () => void }) {
  const [reportedStart, setReportedStart] = useState(
    reg.event_roles?.start_time || "08:00"
  );
  const [reportedEnd, setReportedEnd] = useState(
    reg.event_roles?.end_time || "16:00"
  );
  const [reportedHours, setReportedHours] = useState(
    reg.submission?.reported_hours ? String(reg.submission.reported_hours) : "8"
  );
  const [rating, setRating] = useState<number>(reg.submission?.performance_rating || 5);
  const [notes, setNotes] = useState(reg.submission?.performance_notes || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

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
        registrationId: reg.id,
        reportedStart,
        reportedEnd,
        reportedHours: hours,
        performanceRating: rating,
        performanceNotes: notes,
      });

      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error);
      }
    });
  };

  const name =
    (reg.profiles?.first_name || "") + " " + (reg.profiles?.last_name || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl border border-brass/20 bg-surface p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-brass/10 pb-4">
          <div>
            <p className="text-xs text-indigo-400 font-semibold">
              {reg.event_roles?.role_name}
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
              סה"כ שעות מדווחות
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
