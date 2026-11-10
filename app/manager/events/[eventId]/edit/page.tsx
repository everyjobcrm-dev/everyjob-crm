import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guards";
import { roleAtLeast } from "@/lib/auth/permissions";
import { EVENT_STATUS_LABEL } from "@/lib/events/status";
import { fetchEventForEdit } from "@/app/admin/actions";
import { EditEventForm } from "@/components/events/EditEventForm";

type Props = {
  params: Promise<{ eventId: string }>;
};

// "עריכת פרטי אירוע": Admin/Manager on any event, a Recruiter on own events (fetchEventForEdit pre-checks; the p9 RPCs
// enforce it). Cancelled / completed / paused events are read-only.
export default async function EditEventPage({ params }: Props) {
  const { eventId } = await params;
  const ctx = await getAuthContext();
  if (!ctx.ok) redirect(ctx.reason === "unauthenticated" ? "/login" : "/employee/dashboard");
  if (!roleAtLeast(ctx.role, "recruiter")) redirect("/employee/dashboard");

  const data = await fetchEventForEdit(eventId);
  if (!data.ok && data.reason === "not_found") notFound();

  const back = (
    <Link
      href={`/manager/events/${eventId}`}
      className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
    >
      <ArrowRight className="h-4 w-4" aria-hidden="true" /> חזרה לאירוע
    </Link>
  );

  if (!data.ok) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <h1 className="font-display text-xl text-ink">אין לך הרשאה לערוך אירוע זה</h1>
        {back}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {back}
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-primary-soft">עריכת אירוע</p>
        <h1 className="font-display text-2xl text-ink">{data.event.location}</h1>
        <p className="text-xs text-muted">{EVENT_STATUS_LABEL[data.event.status]}</p>
      </header>
      {data.editable ? (
        <EditEventForm
          event={data.event}
          viewerRole={data.viewerRole}
          clients={data.clients}
          recruiters={data.recruiters}
        />
      ) : (
        <p className="border-s-4 border-rose-400/60 bg-surface p-4 text-sm text-ink/80">
          אירוע מבוטל, שהושלם או מושהה אינו ניתן לעריכה. אדמין או מנהל/ת יכולים לשחזר אירוע מבוטל ואז לערוך אותו.
        </p>
      )}
    </div>
  );
}
