import { CalendarClock, FileWarning, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CreateEventDialog } from "@/components/admin/create-event-dialog";
import { BroadcastDialog } from "@/components/admin/broadcast-dialog";

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login");
  }

  const today = new Date();
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().slice(0, 10);
  const weekStr = weekFromNow.toISOString().slice(0, 10);

  const [{ count: activeEmployees }, { count: pendingForms }, { count: upcomingEvents }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["employee", "recruiter"]),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("form_101_status", "pending"),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("event_date", todayStr)
      .lte("event_date", weekStr),
  ]);

  const metrics = [
    { label: "עובדים פעילים", value: activeEmployees ?? 0, icon: Users },
    { label: "טפסי 101 ממתינים לאישור", value: pendingForms ?? 0, icon: FileWarning },
    { label: "אירועים השבוע", value: upcomingEvents ?? 0, icon: CalendarClock },
  ];

  return (
    <div className="pb-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-cream/50">ממשק מנהל</p>
          <h1 className="font-display text-3xl text-cream">דף הבית</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <CreateEventDialog />
          <BroadcastDialog />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-brass/15 bg-surface p-6">
            <Icon className="h-5 w-5 text-brass" strokeWidth={1.8} aria-hidden="true" />
            <p className="mt-4 text-sm text-cream/50">{label}</p>
            <p className="mt-1 font-display text-4xl text-cream tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
