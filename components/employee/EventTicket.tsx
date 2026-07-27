"use client";

import { TicketPass } from "@/components/TicketPass";
import { MapPin, Users } from "lucide-react";

type EventTicketProps = {
  title: string;
  manager: string;
  location: string;
  distanceKm: number;
  date: string;
  spotsLeft: number;
  tilt?: number;
};

/**
 * Events are literally tickets to something happening — TicketPass is the
 * most on-brand possible container for this content, no reinvention needed.
 */
export function EventTicket({ title, manager, location, distanceKm, date, spotsLeft, tilt = 2 }: EventTicketProps) {
  const low = spotsLeft <= 3;

  return (
    <TicketPass
      eyebrow={date}
      title={title}
      subtitle={`${location} · ${distanceKm} ק״מ`}
      tilt={tilt}
      className="w-full"
      stub={
        <>
          <Users className={`h-4 w-4 ${low ? "text-rose-400" : "text-brass"}`} aria-hidden="true" />
          <span className={`text-center text-xs font-bold leading-tight ${low ? "text-rose-400" : "text-cream"}`}>
            {spotsLeft} מקומות
          </span>
        </>
      }
    >
      <div className="mt-3 flex items-center gap-1.5 text-xs text-cream/50">
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        <span>מארגן/ת: {manager}</span>
      </div>
      <button
        type="button"
        className="mt-5 w-full rounded-full bg-brass py-2.5 text-xs font-bold text-obsidian transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        הרשמה לאירוע
      </button>
    </TicketPass>
  );
}
