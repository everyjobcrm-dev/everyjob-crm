import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3, MapPin } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guards";
import { fetchEligibleEvents, fetchMyMonthlyHours, fetchMyShifts } from "@/app/employee/events/actions";
import { EventCard } from "@/components/employee/EventCard";
import { MonthlyHoursCard } from "@/components/employee/MonthlyHoursCard";
import { PageHeader } from "@/components/ui/page-header";
import { formatEventDate } from "@/lib/format";
import type { MyShift } from "@/app/employee/events/actions";

// Worker home: the next confirmed shift first, then this month's approved hours, then what can be signed up for.
// Everything is read through the same actions as "אירועים" and "המשמרות שלי" - nothing is computed or stored here.
export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx.ok) redirect("/login");

  const [{ data: me }, { shifts, today }, monthly, events] = await Promise.all([
    ctx.supabase.from("profiles").select("first_name").eq("id", ctx.userId).maybeSingle(),
    fetchMyShifts(),
    fetchMyMonthlyHours(),
    fetchEligibleEvents(),
  ]);

  const upcoming = shifts.filter((s) => s.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const next = upcoming.find((s) => s.status === "approved");
  const later = upcoming.filter((s) => s.status === "approved" && s !== next);
  const waiting = upcoming.filter((s) => s.status === "pending" || s.status === "waitlisted");

  return (
    <div className="pb-10">
      <PageHeader title={me?.first_name ? `שלום, ${me.first_name}` : "שלום"} subtitle={formatEventDate(today)} />

      <section aria-labelledby="next-shift" className="mb-8">
        <h2 id="next-shift" className="mb-3 text-sm font-semibold text-ink/80">
          המשמרת הבאה שלך
        </h2>
        {next ? (
          <Link
            href="/employee/shifts"
            className="block border-s-4 border-primary bg-surface px-5 py-4 transition-colors hover:bg-surface2"
          >
            <p className="text-xs font-semibold text-primary-soft">{next.clientName}</p>
            <p className="mt-0.5 font-display text-2xl text-ink">{formatEventDate(next.eventDate)}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/80">
              <span>{next.roleName ?? "תפקיד"}</span>
              {next.startTime && (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  <bdi>
                    {next.startTime.slice(0, 5)}
                    {next.endTime ? `–${next.endTime.slice(0, 5)}` : ""}
                  </bdi>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {next.location}
              </span>
            </p>
          </Link>
        ) : (
          <p className="empty-state">
            אין לך משמרת מאושרת קרובה.{" "}
            <Link href="/employee/events" className="font-semibold text-primary-soft hover:underline">
              לאירועים הפתוחים
            </Link>
          </p>
        )}
      </section>

      {(later.length > 0 || waiting.length > 0) && (
        <section aria-labelledby="my-upcoming" className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <h2 id="my-upcoming" className="sr-only">
            המשמרות הקרובות שלי
          </h2>
          <UpcomingList title={`משובץ/ת (${later.length + (next ? 1 : 0)})`} tone="border-sky" shifts={later} empty="אין משמרות מאושרות נוספות." />
          <UpcomingList title={`ממתין/ה לאישור או ברשימת המתנה (${waiting.length})`} tone="border-sun" shifts={waiting} empty="אין בקשות פתוחות." />
        </section>
      )}

      <MonthlyHoursCard months={monthly} currentMonth={today.slice(0, 7) + "-01"} />

      <section aria-labelledby="open-events">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="open-events" className="text-sm font-semibold text-ink/80">
            אירועים פתוחים להרשמה
          </h2>
          {events.length > 2 && (
            <Link href="/employee/events" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:underline">
              לכל {events.length} האירועים
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
        {events.length === 0 ? (
          <p className="empty-state">אין כרגע אירועים פתוחים. משמרות חדשות יופיעו כאן.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {events.slice(0, 2).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const STATUS_LABEL: Partial<Record<MyShift["status"], string>> = {
  approved: "משובץ/ת",
  pending: "ממתין/ה לאישור",
  waitlisted: "ברשימת המתנה",
};

function UpcomingList({ title, tone, shifts, empty }: { title: string; tone: string; shifts: MyShift[]; empty: string }) {
  return (
    <div className={`border-s-4 ${tone} bg-surface px-5 py-4`}>
      <h3 className="mb-2 text-sm font-semibold text-ink/80">{title}</h3>
      {shifts.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {shifts.slice(0, 4).map((s) => (
            <li key={s.registrationId} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-ink">
                {formatEventDate(s.eventDate)} · {s.roleName ?? "תפקיד"}
              </span>
              <span className="text-xs text-muted">
                {s.clientName}
                {s.status !== "approved" && ` · ${STATUS_LABEL[s.status]}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {shifts.length > 4 && (
        <Link href="/employee/shifts" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:underline">
          עוד {shifts.length - 4}
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
