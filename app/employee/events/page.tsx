// app/employee/events/page.tsx
import { fetchEligibleEvents } from "./actions";
import { EventCard } from "@/components/employee/EventCard";

export default async function EventsPage() {
  const events = await fetchEligibleEvents();

  return (
    <div className="pb-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-cream">אירועים פתוחים</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {events.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-brass/20 px-4 py-10 text-center text-sm text-cream/50">
            אין אירועים פתוחים כרגע.
          </p>
        )}
      </div>
    </div>
  );
}