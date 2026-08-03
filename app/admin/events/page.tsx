import Link from "next/link";
import { Plus } from "lucide-react";
import { fetchEvents } from "@/app/admin/events/actions";
import { EventsTable } from "@/components/admin/events-table";

export default async function AdminEventsPage() {
  const events = await fetchEvents();

  return (
    <div className="pb-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-cream/50">ממשק מנהל</p>
          <h1 className="font-display text-3xl text-cream">אירועים ומשמרות</h1>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-sm font-bold text-obsidian transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          אירוע חדש
        </Link>
      </header>

      <EventsTable events={events} />
    </div>
  );
}