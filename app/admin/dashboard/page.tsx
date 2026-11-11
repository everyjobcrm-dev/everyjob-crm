import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getShiftSubmissions } from "@/app/admin/actions";
import { BroadcastDialog } from "@/components/admin/broadcast-dialog";
import ShiftSubmissionsTable from "@/components/admin/shift-submissions-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatRow } from "@/components/ui/stat-row";

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
      .neq("status", "cancelled") // cancelled events are excluded from every dashboard count
      .gte("event_date", todayStr)
      .lte("event_date", weekStr),
  ]);

  const { data: submissions } = await getShiftSubmissions();

  const metrics = [
    { label: "עובדים פעילים", value: activeEmployees ?? 0 },
    { label: "טפסי 101 ממתינים לאישור", value: pendingForms ?? 0 },
    { label: "אירועים השבוע", value: upcomingEvents ?? 0 },
  ];

  return (
    <div className="pb-10">
      <PageHeader title="דף הבית">
        <BroadcastDialog />
      </PageHeader>

      <StatRow items={metrics} />

      <section className="mt-10">
        <h2 className="font-display text-2xl text-ink mb-4">דיווחי שעות ממתינים לאישור</h2>
        <ShiftSubmissionsTable initialSubmissions={submissions || []} />
      </section>
    </div>
  );
}
