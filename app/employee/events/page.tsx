// app/employee/events/page.tsx
import { fetchEligibleEvents } from "./actions";
import { EventCard } from "@/components/employee/EventCard";
import { PageHeader } from "@/components/ui/page-header";

export default async function EventsPage() {
  const events = await fetchEligibleEvents();

  return (
    <div className="pb-10">
      <PageHeader title="אירועים פתוחים" subtitle="בחר/י תפקיד והירשם/י. תפקיד מלא מצרף אותך לרשימת ההמתנה." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {events.length === 0 && (
          <p className="empty-state col-span-full">
            אין אירועים פתוחים כרגע.
          </p>
        )}
      </div>
    </div>
  );
}