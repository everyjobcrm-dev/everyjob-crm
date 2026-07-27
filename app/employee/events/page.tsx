"use client";

import { useMemo, useState } from "react";
import { EventTicket } from "@/components/employee/EventTicket";

type EventListing = {
  id: string;
  title: string;
  manager: string;
  location: string;
  distanceKm: number;
  date: string;
  spotsLeft: number;
};

// TODO: replace with a Supabase query (events table, joined on manager profile)
const EVENTS: EventListing[] = [
  { id: "1", title: "כנס טכנולוגיה — EXPO 2026", manager: "דנה כהן", location: "פארק הירקון, תל אביב", distanceKm: 3, date: "3.8, 08:00", spotsLeft: 6 },
  { id: "2", title: "פסטיבל אוכל רחוב", manager: "יובל מזרחי", location: "נמל תל אביב", distanceKm: 4.2, date: "6.8, 16:00", spotsLeft: 2 },
  { id: "3", title: "חתונה — אולמי הגן", manager: "רועי לוי", location: "כפר סבא", distanceKm: 18, date: "9.8, 18:00", spotsLeft: 4 },
  { id: "4", title: "כנס משפיעני רשת", manager: "שירה אבן", location: "ראשון לציון", distanceKm: 22, date: "14.8, 09:30", spotsLeft: 9 },
];

const NEAR_THRESHOLD_KM = 10;

export default function EventsPage() {
  const [filter, setFilter] = useState<"near" | "all">("near");

  const visibleEvents = useMemo(
    () => (filter === "near" ? EVENTS.filter((e) => e.distanceKm <= NEAR_THRESHOLD_KM) : EVENTS),
    [filter]
  );

  return (
    <div className="pb-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-cream">אירועים</h1>
        <div
          role="group"
          aria-label="סינון אירועים"
          className="inline-flex rounded-full border border-brass/20 bg-surface p-1"
        >
          <button
            onClick={() => setFilter("near")}
            aria-pressed={filter === "near"}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === "near" ? "bg-brass text-obsidian" : "text-cream/50"
            }`}
          >
            בקרבתי
          </button>
          <button
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === "all" ? "bg-brass text-obsidian" : "text-cream/50"
            }`}
          >
            הכל
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visibleEvents.map((event, i) => (
          <EventTicket key={event.id} {...event} tilt={i % 2 === 0 ? 1.5 : -1.5} />
        ))}
        {visibleEvents.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-brass/20 px-4 py-10 text-center text-sm text-cream/50">
            אין אירועים בקרבתך כרגע. נסה/י להציג את כל האירועים.
          </p>
        )}
      </div>
    </div>
  );
}
