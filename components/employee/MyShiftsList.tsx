"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import type { MyShift, RegistrationStatus } from "@/app/employee/events/actions";
import { useToast } from "@/components/ui/toast";
import {
  CancellationRequestForm,
  WithdrawConfirm,
  canSelfWithdraw,
  cancelToastFor,
} from "@/components/employee/RegistrationCancelControls";

// "My shifts" for any worker (employees and staff-as-workers). AGENTS.md 6 (M8v2): a not-yet-approved registration
// (pending/waitlisted) can be withdrawn directly ("ביטול הרשמה"); an approved one only gets a cancellation REQUEST
// that staff approve or dismiss. Both go through request_registration_cancellation.

const ACTIVE = ["approved", "pending", "waitlisted"] as const;

const UPCOMING_GROUPS: { status: (typeof ACTIVE)[number]; label: string; tone: string }[] = [
  { status: "approved", label: "משובץ/ת", tone: "border-[#4F46E5]" },
  { status: "pending", label: "ממתין/ה לאישור", tone: "border-cream/30" },
  { status: "waitlisted", label: "ברשימת המתנה", tone: "border-[#D4FF00]" },
];

const HOURS_LABEL: Record<"pending" | "approved" | "rejected", string> = {
  pending: "הוגש, ממתין לאישור",
  approved: "אושר",
  rejected: "נדחה - המנהל/ת יגיש/תגיש מחדש",
};

const HISTORY_LABEL: Record<string, string> = {
  approved: "שובצת",
  pending: "לא אושר עד מועד האירוע",
  waitlisted: "נשארת ברשימת ההמתנה",
  rejected: "נדחה",
  // self-withdrawn ("ביטלת את ההרשמה") vs staff-approved request ("בוטל לבקשתך") is not distinguishable here:
  // the employee cannot read registration_status_history (M7v). Both show "בוטל" until that is exposed (backlog).
  cancelled: "בוטל",
  no_show: "לא הגעת",
};

export function MyShiftsList({ shifts, today }: { shifts: MyShift[]; today: string }) {
  const router = useRouter();
  const { toast, show } = useToast();
  const onDone = (status: RegistrationStatus) => {
    show(cancelToastFor(status));
    router.refresh();
  };
  const isActive = (s: MyShift) => (ACTIVE as readonly string[]).includes(s.status);
  const upcoming = shifts.filter((s) => s.eventDate >= today && isActive(s));
  const removed = shifts.filter((s) => s.status === "removed");
  const history = shifts
    .filter((s) => !upcoming.includes(s) && s.status !== "removed")
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        {upcoming.length === 0 && (
          <p className="border-s-2 border-brass/20 ps-4 text-sm text-cream/50">אין לך משמרות קרובות.</p>
        )}
        {UPCOMING_GROUPS.map((group) => {
          const list = upcoming.filter((s) => s.status === group.status);
          if (list.length === 0) return null;
          return (
            <div key={group.status}>
              <h2 className="mb-3 text-sm font-semibold text-cream/70">
                {group.label} ({list.length})
              </h2>
              <div className="space-y-3">
                {list.map((shift) => (
                  <ShiftRow key={shift.registrationId} shift={shift} tone={group.tone} canRequest onDone={onDone} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-cream/60">היסטוריה ({history.length})</h2>
          <div className="space-y-2">
            {history.map((shift) => (
              <ShiftRow key={shift.registrationId} shift={shift} tone="border-brass/10" note={HISTORY_LABEL[shift.status]} />
            ))}
          </div>
        </section>
      )}

      {removed.length > 0 && (
        <section className="opacity-60">
          <h2 className="mb-3 text-sm font-semibold text-cream/50">הוסרו ({removed.length})</h2>
          <p className="mb-2 text-xs text-cream/60">הוסרת מהמשמרות האלה על ידי הצוות. לשאלות פנה/י למנהל/ת.</p>
          <div className="space-y-2">
            {removed.map((shift) => (
              <ShiftRow key={shift.registrationId} shift={shift} tone="border-cream/10" />
            ))}
          </div>
        </section>
      )}
      {toast}
    </div>
  );
}

function ShiftRow({
  shift,
  tone,
  canRequest = false,
  note,
  onDone,
}: {
  shift: MyShift;
  tone: string;
  canRequest?: boolean;
  note?: string;
  onDone?: (status: RegistrationStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const withdrawable = canSelfWithdraw(shift.status);
  // a pre-M8v2 open request on a pending/waitlisted row no longer blocks: the RPC withdraws it directly
  const requested = shift.cancellationRequestedAt != null && !withdrawable;
  const done = (status: RegistrationStatus) => {
    setOpen(false);
    onDone?.(status);
  };

  return (
    <article className={`border-s-4 ${tone} bg-surface px-4 py-3`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-indigo-400">{shift.clientName}</p>
          <p className="font-display text-base text-cream">{shift.roleName ?? "תפקיד"}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cream/50">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" aria-hidden="true" /> {shift.eventDate}
            </span>
            {shift.startTime && (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" aria-hidden="true" /> {shift.startTime.slice(0, 5)}
                {shift.endTime ? `–${shift.endTime.slice(0, 5)}` : ""}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" /> {shift.location}
            </span>
          </p>
          {note && <p className="mt-1 text-xs text-cream/60">{note}</p>}
          {shift.hoursStatus && (
            <p className="mt-1 text-xs text-cream/60">
              דוח שעות: {HOURS_LABEL[shift.hoursStatus]}
              {shift.reportedHours != null ? ` (${shift.reportedHours} שעות)` : ""}
            </p>
          )}
          {canRequest && shift.eventStatus === "closed" && (
            <p className="mt-1 text-xs text-cream/60">האירוע סגור להרשמות חדשות.</p>
          )}
        </div>

        {canRequest &&
          (requested ? (
            <span className="rounded-sm bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-300">
              בקשת ביטול נשלחה - ממתינה לטיפול הצוות
            </span>
          ) : (
            !open && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-md border border-rose-500/30 px-3 py-1.5 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/10"
              >
                {withdrawable ? "ביטול הרשמה" : "בקש ביטול"}
              </button>
            )
          ))}
      </div>

      {open &&
        !requested &&
        (withdrawable ? (
          <WithdrawConfirm registrationId={shift.registrationId} onClose={() => setOpen(false)} onDone={done} />
        ) : (
          <CancellationRequestForm registrationId={shift.registrationId} onClose={() => setOpen(false)} onDone={done} />
        ))}
    </article>
  );
}
