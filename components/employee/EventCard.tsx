// components/employee/EventCard.tsx
"use client";

import { useState, useTransition } from "react";
import { Users, Check, Clock3, AlertCircle } from "lucide-react";
import { registerForRole, type EmployeeEvent, type RegistrationStatus } from "@/app/employee/events/actions";
import { useToast } from "@/components/ui/toast";
import {
  CancellationRequestForm,
  WithdrawConfirm,
  canSelfWithdraw,
  cancelToastFor,
} from "@/components/employee/RegistrationCancelControls";

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר",
  rejected: "נדחה",
  waitlisted: "ברשימת המתנה",
  cancelled: "בוטל",
  removed: "הוסרת מהמשמרת",
};

// "registered" and "confirmed" aren't in STATUS_LABEL, let's just make it a partial map
const getStatusLabel = (s: RegistrationStatus) => STATUS_LABEL[s] || s;

const STATUS_STYLE: Record<RegistrationStatus, string> = {
  pending: "bg-indigo-500/15 text-indigo-400",
  approved: "bg-indigo-500/20 text-indigo-300",
  rejected: "bg-rose-500/15 text-rose-400",
  waitlisted: "bg-[#D4FF00]/15 text-[#D4FF00]",
  cancelled: "bg-cream/10 text-cream/50",
  removed: "bg-cream/10 text-cream/50",
};

const getStatusStyle = (s: RegistrationStatus) => STATUS_STYLE[s] || "bg-cream/10 text-cream/70";

export function EventCard({ event }: { event: EmployeeEvent }) {
  const { toast, show } = useToast();
  return (
    <div className="rounded-2xl border border-brass/10 bg-surface p-5">
      <p className="text-xs font-semibold text-indigo-400">{event.clientName}</p>
      <h2 className="font-display text-lg text-cream">{event.location}</h2>
      <p className="mt-0.5 text-xs text-cream/50">{event.eventDate}</p>
      {event.notes && <p className="mt-2 text-xs text-cream/60">{event.notes}</p>}

      <div className="mt-4 space-y-2">
        {event.roles.map((role) => (
          <RoleRow key={role.id} role={role} onToast={show} />
        ))}
      </div>
      {toast}
    </div>
  );
}

function RoleRow({ role, onToast }: { role: EmployeeEvent["roles"][number]; onToast: (message: string) => void }) {
  const [status, setStatus] = useState<RegistrationStatus | null>(role.myStatus);
  const [cancellationRequested, setCancellationRequested] = useState<boolean>(!!role.cancellationRequestedAt);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);

  const spotsLeft = role.headcount - role.filledCount;
  const isFull = spotsLeft <= 0;

  function handleRegister() {
    setError(null);
    startTransition(async () => {
      const result = await registerForRole(role.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus(result.status);
      setCancellationRequested(false); // a revived row starts with no open request
    });
  }

  // M8v2: pending/waitlisted -> withdrawn immediately; approved -> cancellation request (AGENTS.md 6)
  function handleCancelDone(next: RegistrationStatus) {
    setCancelOpen(false);
    setStatus(next);
    if (next !== "cancelled") setCancellationRequested(true);
    onToast(cancelToastFor(next));
  }

  const withdrawable = canSelfWithdraw(status);
  const canCancel = withdrawable || status === "approved";
  // a pre-M8v2 open request on a pending/waitlisted row no longer blocks: the RPC withdraws it directly
  const showRequested = cancellationRequested && !withdrawable;
  // a withdrawn (or staff-approved cancelled) registration may register again - the same row is revived
  const canRegister = status === null || status === "cancelled";

  return (
    <div className="rounded-xl border border-brass/10 bg-surface2 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-cream">{role.roleName}</p>
          <p className="flex items-center gap-1 text-xs text-cream/60">
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {role.startTime}–{role.endTime ?? "טרם נקבע"} · ₪{role.baseRate}/ש&apos;
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            isFull ? "bg-cream/10 text-cream/50" : "bg-cream/5 text-cream/70"
          }`}
        >
          <Users className="h-3 w-3" aria-hidden="true" />
          {role.filledCount}/{role.headcount}
        </span>
      </div>

      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {status && !canRegister ? (
          <>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(status)}`}>
              <Check className="h-3 w-3" aria-hidden="true" />
              {getStatusLabel(status)}
            </span>
            {canCancel && (
              showRequested ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-cream/5 px-2 py-1 text-[11px] text-cream/50">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  בקשת ביטול ממתינה
                </span>
              ) : (
                !cancelOpen && (
                  <button
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    className="rounded-full bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-400 transition-colors hover:bg-rose-500/20"
                  >
                    {withdrawable ? "ביטול הרשמה" : "בקש ביטול"}
                  </button>
                )
              )
            )}
          </>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={handleRegister}
            className="w-full rounded-full bg-indigo-600 py-2 text-xs font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "נרשם/ת..." : isFull ? "הצטרפות לרשימת המתנה" : "הרשמה למשמרת"}
          </button>
        )}
      </div>

      {cancelOpen && role.registrationId && canCancel && !showRequested &&
        (withdrawable ? (
          <WithdrawConfirm registrationId={role.registrationId} onClose={() => setCancelOpen(false)} onDone={handleCancelDone} />
        ) : (
          <CancellationRequestForm
            registrationId={role.registrationId}
            onClose={() => setCancelOpen(false)}
            onDone={handleCancelDone}
          />
        ))}
    </div>
  );
}