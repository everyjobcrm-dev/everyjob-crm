import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guards";
import { canCreateEvents, roleAtLeast } from "@/lib/auth/permissions";
import { fetchRecruiterOptions } from "@/app/admin/actions";
import { EVENT_STATUS_LABEL, EVENT_STATUS_STYLE, isEventStatus } from "@/lib/events/status";

type EventItem = {
  id: string;
  location: string;
  event_date: string;
  status: string;
  clientName: string;
  filled: number;
  headcount: number;
  pending: number;
  waitlisted: number;
  requests: number;
  recruiterName: string | null; // Admin/Manager view only
};

const ACTIVE_STATUSES = ["open", "closed", "pending_rates"];

function jerusalemToday(): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

// Staff events list. Admin / Manager: every event. Recruiter: only events they own (events.recruiter_id).
// Staffing numbers are derived from the event_role_fill_counts view (pending + approved), never stored.
export default async function ManagerEventsPage() {
  const ctx = await getAuthContext();
  if (!ctx.ok) redirect(ctx.reason === "unauthenticated" ? "/login" : "/employee/dashboard");
  if (!roleAtLeast(ctx.role, "recruiter")) redirect("/employee/dashboard");
  const { supabase } = ctx;
  const isRecruiter = ctx.role === "recruiter";

  let query = supabase
    .from("events")
    .select("id, location, event_date, status, recruiter_id, clients(name)")
    .order("event_date", { ascending: true });
  if (isRecruiter) query = query.eq("recruiter_id", ctx.userId);
  const { data: events, error } = await query;

  const ids = (events ?? []).map((e) => e.id);
  const { data: fills } = ids.length
    ? await supabase.from("event_role_fill_counts").select("event_id, headcount, filled_count").in("event_id", ids)
    : { data: [] as { event_id: string; headcount: number; filled_count: number }[] };

  // "מגייס/ת אחראי/ת" labels (list_staff_recruiters returns rows for Admin/Manager only)
  const recruiters = isRecruiter ? [] : await fetchRecruiterOptions();
  const recruiterNameById = new Map(recruiters.map((r) => [r.id, r.name]));

  // per-event pending / waitlisted / open cancellation requests (get_staff_event_request_counts: scoped, cancelled excluded)
  const { data: requestCounts } = await supabase.rpc("get_staff_event_request_counts");
  const countsByEvent = new Map<string, { pending: number; waitlisted: number; requests: number }>();
  for (const c of (requestCounts ?? []) as {
    event_id: string;
    pending_count: number;
    waitlisted_count: number;
    cancellation_request_count: number;
  }[]) {
    countsByEvent.set(c.event_id, {
      pending: Number(c.pending_count ?? 0),
      waitlisted: Number(c.waitlisted_count ?? 0),
      requests: Number(c.cancellation_request_count ?? 0),
    });
  }

  const totals = new Map<string, { filled: number; headcount: number }>();
  for (const f of fills ?? []) {
    const t = totals.get(f.event_id) ?? { filled: 0, headcount: 0 };
    t.filled += Number(f.filled_count ?? 0);
    t.headcount += Number(f.headcount ?? 0);
    totals.set(f.event_id, t);
  }

  const items: EventItem[] = (events ?? []).map((e) => {
    const c = Array.isArray(e.clients) ? e.clients[0] : e.clients;
    const clientName = (c && typeof c === "object" && "name" in c ? (c as { name: string }).name : null) || "לקוח";
    const t = totals.get(e.id) ?? { filled: 0, headcount: 0 };
    const counts = countsByEvent.get(e.id) ?? { pending: 0, waitlisted: 0, requests: 0 };
    const recruiterName = isRecruiter ? null : e.recruiter_id ? (recruiterNameById.get(e.recruiter_id) ?? "מגייס/ת") : "ללא מגייס/ת";
    return { id: e.id, location: e.location, event_date: e.event_date, status: e.status, clientName, recruiterName, ...t, ...counts };
  });

  const today = jerusalemToday();
  const upcoming = items.filter((e) => ACTIVE_STATUSES.includes(e.status) && e.event_date >= today);
  const past = items.filter((e) => ACTIVE_STATUSES.includes(e.status) && e.event_date < today).reverse();
  const archived = items.filter((e) => !ACTIVE_STATUSES.includes(e.status)).reverse();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-cream">{isRecruiter ? "האירועים שלי" : "כל האירועים"}</h2>
          <p className="text-xs text-cream/65">
            {isRecruiter ? "אירועים שבאחריותך בלבד." : "אירועים פתוחים, סגורים להרשמה וממתינים לתעריפים."}
          </p>
        </div>
        {canCreateEvents(ctx.profile) && (
          <Link
            href="/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> אירוע חדש
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-rose-400">טעינת האירועים נכשלה.</p>}

      <EventGrid items={upcoming} empty="אין אירועים קרובים." />

      {past.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-cream/60">אירועים שתאריכם עבר ({past.length})</summary>
          <div className="mt-4">
            <EventGrid items={past} empty="" />
          </div>
        </details>
      )}

      {archived.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-cream/60">
            בוטלו / נסגרו פיננסית / מושהים ({archived.length})
          </summary>
          <div className="mt-4">
            <EventGrid items={archived} empty="" />
          </div>
        </details>
      )}
    </div>
  );
}

function EventGrid({ items, empty }: { items: EventItem[]; empty: string }) {
  if (items.length === 0) return empty ? <p className="text-sm text-cream/65">{empty}</p> : null;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((event) => {
        const status = isEventStatus(event.status) ? event.status : null;
        const full = event.headcount > 0 && event.filled >= event.headcount;
        return (
          <Link
            key={event.id}
            href={`/manager/events/${event.id}`}
            className="group block border-s-2 border-brass/15 bg-surface p-5 transition-colors hover:border-[#4F46E5] hover:bg-surface2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-indigo-400">{event.clientName}</p>
              {status && (
                <span className={`shrink-0 rounded-sm px-2 py-0.5 text-[11px] font-semibold ${EVENT_STATUS_STYLE[status]}`}>
                  {EVENT_STATUS_LABEL[status]}
                </span>
              )}
            </div>
            <h3 className="mt-1 font-display text-lg text-cream">{event.location}</h3>
            <p className="text-xs text-cream/65">{event.event_date}</p>
            {event.recruiterName && <p className="mt-1 text-xs text-cream/65">מגייס/ת: {event.recruiterName}</p>}
            {(event.requests > 0 || event.pending > 0 || event.waitlisted > 0) && (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                {event.requests > 0 && (
                  <span className="rounded-sm bg-rose-500/15 px-2 py-0.5 text-rose-300">{event.requests} בקשות ביטול</span>
                )}
                {event.pending > 0 && (
                  <span className="rounded-sm bg-cream/10 px-2 py-0.5 text-cream/75">{event.pending} ממתינים לאישור</span>
                )}
                {event.waitlisted > 0 && (
                  <span className="rounded-sm bg-[#D4FF00]/10 px-2 py-0.5 text-[#D4FF00]">{event.waitlisted} בהמתנה</span>
                )}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className={full ? "font-semibold text-[#D4FF00]" : "text-cream/55"}>
                {event.status === "cancelled" ? "—" : `${event.filled}/${event.headcount} מקומות תפוסים`}
              </span>
              <Users className="h-4 w-4 text-cream/65" aria-hidden="true" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
