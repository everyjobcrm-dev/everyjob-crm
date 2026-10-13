import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Building2, Calendar, MapPin } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guards";
import { canManageEvent, roleAtLeast } from "@/lib/auth/permissions";
import { mapDbError } from "@/lib/events/errors";
import type { RosterRole, RosterRow } from "@/lib/events/roster";
import { RosterBoard } from "@/components/manager/RosterBoard";
import { EventStatusControl } from "@/components/manager/EventStatusControl";

type Props = {
  params: Promise<{ eventId: string }>;
};

// Staff event page: status control + roster. The roster comes from get_event_roster (SECURITY DEFINER, scoped by
// app_can_manage_event, no tz/email/documents, rates for admin/manager only). The canManageEvent check below is a UX
// pre-check; the RPC refuses out-of-scope callers on its own.
export default async function ManagerEventDetailsPage({ params }: Props) {
  const { eventId } = await params;
  const ctx = await getAuthContext();
  if (!ctx.ok) redirect(ctx.reason === "unauthenticated" ? "/login" : "/employee/dashboard");
  if (!roleAtLeast(ctx.role, "recruiter")) redirect("/employee/dashboard");
  const { supabase, profile } = ctx;

  const { data: event } = await supabase
    .from("events")
    .select("id, location, event_date, notes, status, cancelled_from_status, recruiter_id, clients(name)")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) notFound();

  if (!canManageEvent(profile, event)) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="font-display text-xl text-cream">אין לך הרשאה לנהל אירוע זה</h1>
        <p className="mt-2 text-sm text-cream/50">מגייס/ת יכול/ה לנהל רק אירועים שבאחריותו/ה.</p>
        <Link href="/manager/events" className="mt-6 inline-block text-sm font-semibold text-indigo-400">
          חזרה לאירועים
        </Link>
      </div>
    );
  }

  const [{ data: roleRows }, { data: rosterData, error: rosterError }] = await Promise.all([
    supabase
      .from("event_roles")
      .select("id, role_name, headcount, start_time, end_time")
      .eq("event_id", eventId)
      .order("start_time", { ascending: true }),
    supabase.rpc("get_event_roster", { p_event_id: eventId }),
  ]);

  const roles: RosterRole[] = (roleRows ?? []).map((r) => ({
    id: r.id,
    roleName: r.role_name,
    headcount: r.headcount,
    startTime: r.start_time,
    endTime: r.end_time,
  }));
  const rows = (rosterData ?? []) as RosterRow[];


  const client = Array.isArray(event.clients) ? event.clients[0] : event.clients;
  const clientName =
    (client && typeof client === "object" && "name" in client ? (client as { name: string }).name : null) || "לקוח";

  return (
    <div className="space-y-6 pb-12">
      <Link
        href="/manager/events"
        className="inline-flex items-center gap-1.5 text-xs text-cream/50 transition-colors hover:text-cream"
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" /> חזרה לאירועים
      </Link>

      <div className="border-s-4 border-[#4F46E5] bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-indigo-400">
              <Building2 className="h-4 w-4" aria-hidden="true" /> {clientName}
            </p>
            <h1 className="flex items-center gap-2 font-display text-2xl text-cream">
              <MapPin className="h-5 w-5 text-brass" aria-hidden="true" /> {event.location}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-cream/50">
              <Calendar className="h-4 w-4" aria-hidden="true" /> {event.event_date}
            </p>
          </div>
          <EventStatusControl
            eventId={event.id}
            status={event.status}
            cancelledFromStatus={event.cancelled_from_status}
            role={ctx.role}
            isOwner={event.recruiter_id === ctx.userId}
          />
        </div>
        {event.notes && (
          <p className="mt-4 border-t border-brass/10 pt-3 text-xs text-cream/70">{event.notes}</p>
        )}
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl text-cream">צוות האירוע</h2>
        {rosterError ? (
          <p className="text-sm text-rose-400">{mapDbError(rosterError, { fallback: "טעינת רשימת הצוות נכשלה." })}</p>
        ) : (
          <RosterBoard
            eventId={event.id}
            eventDate={event.event_date}
            eventStatus={event.status}
            viewerId={ctx.userId}
            canSeeRates={roleAtLeast(ctx.role, "manager")}
            canEnterAttendance={roleAtLeast(ctx.role, "manager")}
            roles={roles}
            rows={rows}
          />
        )}
      </section>

      {/* Recruitment-credit redemption is hidden until the FIFO redeem RPC (supabase/p6_h6_redeem_credits.sql, PROPOSED) is approved. */}
    </div>
  );
}
