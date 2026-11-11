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
import { formatEventDate } from "@/lib/format";

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
  pending: "bg-sun/40 text-sun-deep",
  approved: "bg-sky/30 text-sky-deep",
  rejected: "bg-rose-500/15 text-rose-700",
  waitlisted: "bg-pink/15 text-primary-soft",
  cancelled: "bg-ink/10 text-muted",
  removed: "bg-ink/10 text-muted",
};

const getStatusStyle = (s: RegistrationStatus) => STATUS_STYLE[s] || "bg-ink/10 text-ink/80";

export function EventCard({ event }: { event: EmployeeEvent }) {
  const { toast, show } = useToast();
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-primary-soft">{event.clientName}</p>
      <h2 className="font-display text-lg text-ink">{event.location}</h2>
      <p className="mt-0.5 text-xs text-muted">{formatEventDate(event.eventDate)}</p>
      {event.notes && <p className="mt-2 text-xs text-muted">{event.notes}</p>}

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
    <div className="rounded-lg border border-line bg-surface2 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{role.roleName}</p>
          <p className="flex items-center gap-1 text-xs text-muted">
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {role.startTime.slice(0, 5)}–{role.endTime?.slice(0, 5) ?? "טרם נקבע"} · ₪{role.baseRate}/ש&apos;
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            isFull ? "bg-ink/10 text-muted" : "bg-ink/5 text-ink/80"
          }`}
        >
          <Users className="h-3 w-3" aria-hidden="true" />
          {role.filledCount}/{role.headcount}
        </span>
      </div>

      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {status && !canRegister ? (
          <>
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusStyle(status)}`}>
              <Check className="h-3 w-3" aria-hidden="true" />
              {getStatusLabel(status)}
            </span>
            {canCancel && (
              showRequested ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-ink/5 px-2 py-1 text-[11px] text-muted">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  בקשת ביטול ממתינה
                </span>
              ) : (
                !cancelOpen && (
                  <button
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    className="rounded-md bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-500/20"
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
            className="btn btn-primary btn-sm w-full"
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