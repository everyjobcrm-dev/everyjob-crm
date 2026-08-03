import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EventsTable, type AdminEvent } from "@/components/admin/events-table";

type EventRow = {
  id: string;
  title: string;
  location: string;
  event_date: string;
  start_time: string;
  end_time: string;
  wage_rate: number;
  spots_total: number;
  status: "open" | "closed" | "completed";
  event_registrations: {
    id: string;
    status: string;
    profiles: { id: string; first_name: string; last_name: string } | null;
  }[];
};

export default async function AdminEventsPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login");
  }

  // NOTE: assumes a foreign-key relationship from event_registrations.employee_id
  // to profiles.id so Supabase can embed it. Adjust the select string if your
  // actual relationship/column names differ.
  const { data: events } = await supabase
    .from("events")
    .select(
      "id, title, location, event_date, start_time, end_time, wage_rate, spots_total, status, event_registrations(id, status, profiles(id, first_name, last_name))"
    )
    .order("event_date", { ascending: true })
    .returns<EventRow[]>();

  const rows: AdminEvent[] = (events ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    location: e.location,
    eventDate: e.event_date,
    startTime: e.start_time,
    endTime: e.end_time,
    wageRate: e.wage_rate,
    spotsTotal: e.spots_total,
    status: e.status,
    registrations: (e.event_registrations ?? [])
      .filter((r) => r.status !== "cancelled")
      .map((r) => ({
        id: r.id,
        name: r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : "עובד/ת שנמחק/ה",
      })),
  }));

  return (
    <div className="pb-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-cream/50">ממשק מנהל</p>
          <h1 className="font-display text-3xl text-cream">אירועים ומשמרות</h1>
        </div>
        <Link
          href="/admin/events/new"
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          אירוע חדש
        </Link>
      </header>

      <EventsTable events={rows} />
    </div>
  );
}