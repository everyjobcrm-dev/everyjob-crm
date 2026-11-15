// app/employee/events/page.tsx
import Link from "next/link";
import { fetchEligibleEvents } from "./actions";
import { getAuthContext } from "@/lib/auth/guards";
import { EventCard } from "@/components/employee/EventCard";
import { PageHeader } from "@/components/ui/page-header";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const [events, ctx, params] = await Promise.all([fetchEligibleEvents(), getAuthContext(), searchParams]);
  const { data: me } = ctx.ok
    ? await ctx.supabase.from("profiles").select("approval_status, region").eq("id", ctx.userId).maybeSingle()
    : { data: null };
  // O2: an employee whose account is not approved cannot self-register (register_for_event_role refuses it).
  const notApproved = ctx.ok && ctx.role === "employee" && me != null && me.approval_status !== "approved";

  // Quote item 5: default to the worker's own region (plus events with no region set); "all" shows every region,
  // own region first. Without a region on the profile, everything is shown.
  const myRegion = me?.region ?? null;
  const showAll = params.all === "1" || !myRegion;
  const inMyArea = (region: string | null) => region == null || region === myRegion;
  const shown = showAll
    ? [...events].sort((a, b) => Number(b.region === myRegion) - Number(a.region === myRegion))
    : events.filter((e) => inMyArea(e.region));
  const hiddenCount = events.length - shown.length;

  return (
    <div className="pb-10">
      <PageHeader title="אירועים פתוחים" subtitle="בחר/י תפקיד והירשם/י. תפקיד מלא מצרף אותך לרשימת ההמתנה." />

      {notApproved && (
        <p className="mb-6 border-s-4 border-sun bg-surface px-5 py-3 text-sm text-ink">
          החשבון שלך ממתין לאישור הצוות. אפשר לצפות באירועים, וההרשמה תיפתח לאחר האישור.
        </p>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        {myRegion ? (
          <>
            <Link
              href="/employee/events"
              aria-current={!showAll ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 font-semibold ${!showAll ? "bg-ink text-white" : "text-ink/80 hover:bg-ink/5"}`}
            >
              האזור שלי: {myRegion}
            </Link>
            <Link
              href="/employee/events?all=1"
              aria-current={showAll ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 font-semibold ${showAll ? "bg-ink text-white" : "text-ink/80 hover:bg-ink/5"}`}
            >
              כל האזורים{hiddenCount > 0 ? ` (+${hiddenCount})` : ""}
            </Link>
          </>
        ) : (
          <p className="text-muted">
            <Link href="/employee/profile" className="font-semibold text-primary-soft hover:underline">
              בחר/י אזור בפרופיל
            </Link>{" "}
            כדי לראות קודם משמרות קרובות אליך.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shown.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {shown.length === 0 && (
          <p className="empty-state col-span-full">
            {hiddenCount > 0 ? "אין כרגע אירועים פתוחים באזור שלך. אפשר לעבור לכל האזורים." : "אין אירועים פתוחים כרגע."}
          </p>
        )}
      </div>
    </div>
  );
}
