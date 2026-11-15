import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/guards";
import { fetchMyNotifications, markAllNotificationsRead, type MyNotification } from "@/app/employee/events/actions";
import { PageHeader } from "@/components/ui/page-header";
import { formatEventDate } from "@/lib/format";

// In-app notifications (spec 8, phase one). Rows are written by DB triggers only (supabase C4); the payload is a
// snapshot of the event, so it still reads well after the event is cancelled or hidden.
const TITLE: Record<string, string> = {
  registration_approved: "ההרשמה שלך אושרה",
  registration_rejected: "ההרשמה שלך לא אושרה",
  registration_removed: "הוסרת מהמשמרת",
  event_cancelled: "האירוע בוטל",
  event_time_changed: "מועד המשמרת השתנה",
  hours_approved: "דוח השעות שלך אושר",
};

const stamp = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" });
const hhmm = (v: unknown) => (typeof v === "string" ? v.slice(0, 5) : null);
const date = (v: unknown) => (typeof v === "string" ? formatEventDate(v) : null);

function detail(n: MyNotification): string {
  const p = n.payload;
  const parts = [date(p.event_date), hhmm(p.start_time), p.role_name, p.client_name, p.location].filter(Boolean);
  let extra = "";
  if (n.type === "event_time_changed") {
    if (p.old_event_date && p.old_event_date !== p.event_date) extra = `במקום ${date(p.old_event_date)}`;
    else if (p.old_start_time !== undefined && p.old_start_time !== p.start_time) extra = `במקום ${hhmm(p.old_start_time) ?? "-"}`;
    else if ("role_start_time" in p)
      extra = `שעות התפקיד: ${hhmm(p.role_start_time) ?? "-"}–${hhmm(p.role_end_time) ?? "-"}`;
  }
  if (n.type === "hours_approved" && p.hours != null) extra = `${p.hours} שעות`;
  return [parts.join(" · "), extra].filter(Boolean).join(" · ");
}

export default async function NotificationsPage() {
  const ctx = await getAuthContext();
  if (!ctx.ok) redirect("/login");
  const items = await fetchMyNotifications();
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="pb-10">
      <PageHeader title="התראות" subtitle={unread > 0 ? `${unread} חדשות` : undefined}>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="btn btn-secondary">
              סימון הכל כנקרא
            </button>
          </form>
        )}
      </PageHeader>
      {items.length === 0 ? (
        <p className="empty-state">אין התראות עדיין. עדכונים על ההרשמות, המשמרות ודוחות השעות שלך יופיעו כאן.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id} className={`border-s-4 bg-surface px-5 py-3 ${n.readAt ? "border-line" : "border-pink"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={`text-sm ${n.readAt ? "text-ink/80" : "font-semibold text-ink"}`}>{TITLE[n.type] ?? "עדכון"}</p>
                <time dateTime={n.createdAt} className="text-xs text-muted">
                  {stamp.format(new Date(n.createdAt))}
                </time>
              </div>
              <p className="mt-1 text-sm text-muted">{detail(n)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const metadata = { title: "התראות" };
