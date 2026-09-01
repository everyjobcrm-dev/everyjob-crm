// components/employee/EventCard.tsx
"use client";

import { useState, useTransition } from "react";
import { MapPin, Users, Check, Clock3 } from "lucide-react";
import { registerForRole, type EmployeeEvent, type RegistrationStatus } from "@/app/employee/events/actions";

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר",
  rejected: "נדחה",
  waitlisted: "ברשימת המתנה",
  cancelled: "בוטל",
};

const STATUS_STYLE: Record<RegistrationStatus, string> = {
  pending: "bg-indigo-500/15 text-indigo-400",
  approved: "bg-indigo-500/20 text-indigo-300",
  rejected: "bg-rose-500/15 text-rose-400",
  waitlisted: "bg-[#D4FF00]/15 text-[#D4FF00]",
  cancelled: "bg-cream/10 text-cream/50",
};

export function EventCard({ event }: { event: EmployeeEvent }) {
  return (
    <div className="rounded-2xl border border-brass/10 bg-surface p-5">
      <p className="text-xs font-semibold text-indigo-400">{event.clientName}</p>
      <h2 className="font-display text-lg text-cream">{event.location}</h2>
      <p className="mt-0.5 text-xs text-cream/50">{event.eventDate}</p>
      {event.notes && <p className="mt-2 text-xs text-cream/45">{event.notes}</p>}

      <div className="mt-4 space-y-2">
        {event.roles.map((role) => (
          <RoleRow key={role.id} role={role} />
        ))}
      </div>
    </div>
  );
}

function RoleRow({ role }: { role: EmployeeEvent["roles"][number] }) {
  const [status, setStatus] = useState<RegistrationStatus | null>(role.myStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    });
  }

  return (
    <div className="rounded-xl border border-brass/10 bg-surface2 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-cream">{role.roleName}</p>
          <p className="flex items-center gap-1 text-xs text-cream/45">
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {role.startTime}–{role.endTime} · ₪{role.baseRate}/ש&apos;
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

      <div className="mt-2.5">
        {status ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
            <Check className="h-3 w-3" aria-hidden="true" />
            {STATUS_LABEL[status]}
          </span>
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
    </div>
  );
}