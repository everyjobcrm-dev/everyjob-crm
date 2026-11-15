// app/employee/events/page.tsx
import { fetchEligibleEvents } from "./actions";
import { getAuthContext } from "@/lib/auth/guards";
import { EventCard } from "@/components/employee/EventCard";
import { PageHeader } from "@/components/ui/page-header";

export default async function EventsPage() {
  const [events, ctx] = await Promise.all([fetchEligibleEvents(), getAuthContext()]);
  // O2: an employee whose account is not approved cannot self-register (register_for_event_role refuses it).
  const { data: me } =
    ctx.ok && ctx.role === "employee"
      ? await ctx.supabase.from("profiles").select("approval_status").eq("id", ctx.userId).maybeSingle()
      : { data: null };
  const notApproved = me != null && me.approval_status !== "approved";

  return (
    <div className="pb-10">
      <PageHeader title="אירועים פתוחים" subtitle="בחר/י תפקיד והירשם/י. תפקיד מלא מצרף אותך לרשימת ההמתנה." />

      {notApproved && (
        <p className="mb-6 border-s-4 border-sun bg-surface px-5 py-3 text-sm text-ink">
          החשבון שלך ממתין לאישור הצוות. אפשר לצפות באירועים, וההרשמה תיפתח לאחר האישור.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {events.length === 0 && (
          <p className="empty-state col-span-full">
            אין אירועים פתוחים כרגע.
          </p>
        )}
      </div>
    </div>
  );
}