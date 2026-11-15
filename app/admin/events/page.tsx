import Link from "next/link";
import { Plus } from "lucide-react";
import { fetchEvents } from "@/app/admin/actions";
import { EventsTable } from "@/components/admin/events-table";
import { PageHeader } from "@/components/ui/page-header";
import { EventFilters, matchesEventFilters, type EventFilterValues } from "@/components/events/EventFilters";

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<EventFilterValues> }) {
  const [all, f] = await Promise.all([fetchEvents(), searchParams]);
  const events = all.filter((e) => matchesEventFilters(e, f));

  return (
    <div className="pb-10">
      <PageHeader title="אירועים ומשמרות">
        <Link
          href="/admin/events/new"
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          אירוע חדש
        </Link>
      </PageHeader>

      <EventFilters action="/admin/events" values={f} />
      <EventsTable events={events} />
    </div>
  );
}

export const metadata = { title: "אירועים" };
