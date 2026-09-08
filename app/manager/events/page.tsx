import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, AlertCircle } from "lucide-react";

export default async function ManagerEventsPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <div>שגיאת תצורה</div>;

  const { data: events } = await supabase
    .from("events")
    .select("id, location, event_date, clients(name)")
    .eq("status", "open")
    .order("event_date", { ascending: true });

  if (!events || events.length === 0) {
    return <div className="text-cream/50 text-center mt-10">אין אירועים פתוחים כרגע.</div>;
  }

  // We should also fetch the count of pending cancellations per event
  const { data: pendingReqs } = await supabase
    .from("event_registrations")
    .select("event_id, id")
    .not("cancellation_requested_at", "is", null)
    .not("status", "in", '("cancelled","no_show")');

  const pendingCountByEvent = new Map<string, number>();
  pendingReqs?.forEach(req => {
    pendingCountByEvent.set(req.event_id, (pendingCountByEvent.get(req.event_id) || 0) + 1);
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display text-cream mb-4">כל האירועים</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          const pending = pendingCountByEvent.get(event.id) || 0;
          return (
            <Link key={event.id} href={/manager/events/}>
              <div className="rounded-xl border border-brass/10 bg-surface p-5 transition-colors hover:bg-surface2 cursor-pointer relative">
                <p className="text-xs font-semibold text-indigo-400">{event.clients?.name}</p>
                <h3 className="font-display text-lg text-cream">{event.location}</h3>
                <p className="mt-0.5 text-xs text-cream/50">{event.event_date}</p>
                
                {pending > 0 && (
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400">
                    <AlertCircle className="h-3 w-3" />
                    {pending} בקשות ביטול
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between text-xs text-cream/45">
                  <span>נהל צוות</span>
                  <Users className="h-4 w-4" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
