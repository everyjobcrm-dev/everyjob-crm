import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Building2 } from "lucide-react";
import { RosterTable } from "@/components/manager/RosterTable";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function ManagerEventDetailsPage({ params }: Props) {
  const { eventId } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <div className="p-6 text-cream/70">שגיאת התחברות למסד הנתונים.</div>;

  const { data: event } = await supabase
    .from("events")
    .select("id, location, event_date, notes, clients(name)")
    .eq("id", eventId)
    .single();

  if (!event) {
    notFound();
  }

  const { data: registrations } = await supabase
    .from("event_registrations")
    .select(`
      id,
      status,
      cancellation_requested_at,
      created_at,
      profiles!event_registrations_user_id_fkey (
        id,
        first_name,
        last_name,
        phone_number,
        average_rating
      ),
      event_roles (
        id,
        role_name,
        start_time,
        end_time
      ),
      shift_hour_submissions (
        id,
        status,
        reported_hours,
        performance_rating,
        performance_notes
      )
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  const formattedRegistrations = (registrations || []).map((reg) => {
    const profile = Array.isArray(reg.profiles) ? reg.profiles[0] : reg.profiles;
    const role = Array.isArray(reg.event_roles) ? reg.event_roles[0] : reg.event_roles;
    const submission = Array.isArray(reg.shift_hour_submissions)
      ? reg.shift_hour_submissions[0]
      : reg.shift_hour_submissions;

    return {
      id: reg.id,
      status: reg.status,
      cancellation_requested_at: reg.cancellation_requested_at,
      created_at: reg.created_at,
      profiles: profile
        ? {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone_number,
            average_rating: profile.average_rating,
          }
        : null,
      event_roles: role
        ? {
            id: role.id,
            role_name: role.role_name,
            start_time: role.start_time,
            end_time: role.end_time,
          }
        : null,
      submission: submission
        ? {
            id: submission.id,
            status: submission.status,
            reported_hours: submission.reported_hours,
            performance_rating: submission.performance_rating,
            performance_notes: submission.performance_notes,
          }
        : null,
    };
  });

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      <div className="flex items-center gap-3">
        <Link
          href="/manager/events"
          className="inline-flex items-center gap-1.5 text-xs text-cream/50 hover:text-cream transition-colors"
        >
          <ArrowRight className="h-4 w-4" /> בחזרה לאירועים
        </Link>
      </div>

      <div className="rounded-2xl border border-brass/15 bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold mb-1">
              <Building2 className="h-4 w-4" />
              <span>
                {(() => {
                  const c = Array.isArray(event.clients) ? event.clients[0] : event.clients;
                  return (c && typeof c === "object" && "name" in c ? (c as { name: string }).name : null) || "לקוח";
                })()}
              </span>
            </div>
            <h1 className="font-display text-2xl text-cream flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brass" /> {event.location}
            </h1>
            <p className="text-sm text-cream/50 flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" /> {event.event_date}
            </p>
          </div>
        </div>
        {event.notes && (
          <div className="mt-4 rounded-xl border border-brass/10 bg-surface2 p-3 text-xs text-cream/70">
            {event.notes}
          </div>
        )}
      </div>

      <section>
        <h2 className="font-display text-xl text-cream mb-4">ניהול צוות ודיווחי נוכחות</h2>
        <RosterTable registrations={formattedRegistrations} />
      </section>
    </div>
  );
}
