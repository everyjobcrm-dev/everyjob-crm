"use client";

import { TicketPass } from "@/components/TicketPass";
import { Wallet } from "lucide-react";

type OfferTicketProps = {
  role: string;
  location: string;
  date: string;
  wage: string;
  tilt?: number;
  onRegister?: () => void;
};

/**
 * A single open shift offer, framed as a ticket-in-waiting.
 * Reuses TicketPass's stub slot to surface the wage at a glance —
 * the same way the shift's own ShiftCard surfaces its rate.
 */
export function OfferTicket({ role, location, date, wage, tilt = -1.5, onRegister }: OfferTicketProps) {
  return (
    <TicketPass
      eyebrow="הצעה פתוחה"
      title={role}
      subtitle={`${location} · ${date}`}
      tilt={tilt}
      className="w-full"
      stub={
        <>
          <Wallet className="h-4 w-4 text-brass" aria-hidden="true" />
          <span className="text-center text-xs font-bold leading-tight text-cream">{wage}</span>
        </>
      }
    >
      <button
        type="button"
        onClick={onRegister}
        className="mt-5 w-full rounded-full border border-brass/40 py-2.5 text-xs font-bold text-brass transition-colors hover:bg-brass hover:text-obsidian"
      >
        הרשמה למשמרת
      </button>
    </TicketPass>
  );
}
