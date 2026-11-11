import Link from "next/link";
import { Plus } from "lucide-react";
import { fetchEvents } from "@/app/admin/actions";
import { EventsTable } from "@/components/admin/events-table";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminEventsPage() {
  const events = await fetchEvents();

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

      <EventsTable events={events} />
    </div>
  );
}