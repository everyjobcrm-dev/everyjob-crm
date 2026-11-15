import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/guards";
import { roleAtLeast } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { formatEventDate } from "@/lib/format";
import { EVENT_STATUS_LABEL, isEventStatus } from "@/lib/events/status";

// One search box from the app shell (quote item 11): employees, clients, events. Scope stays where it already is:
// employees through search_employees (directory mode: Admin/Manager only - a recruiter gets none here), clients and
// events through RLS, and a recruiter sees only own events (same rule as /manager/events).
export default async function StaffSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx.ok) redirect(ctx.reason === "unauthenticated" ? "/login" : "/employee/dashboard");
  if (!roleAtLeast(ctx.role, "recruiter")) redirect("/employee/dashboard");
  const { supabase, role } = ctx;
  const isAdmin = role === "admin";

  const raw = ((await searchParams).q ?? "").trim();
  // strip PostgREST filter syntax characters before building ilike / or() filters
  const q = raw.replace(/[,()*%\\]/g, " ").trim().slice(0, 60);
  const enc = encodeURIComponent(raw);

  type Emp = { employee_id: string; first_name: string | null; last_name: string | null; city: string | null; region: string | null; role_tags: string[] | null };
  type Client = { id: string; name: string };
  type Ev = { id: string; location: string; event_date: string; status: string; region: string | null; clients: { name: string } | { name: string }[] | null };

  let employees: Emp[] = [];
  let clients: Client[] = [];
  let events: Ev[] = [];
  if (q.length >= 2) {
    const [empRes, clientRes] = await Promise.all([
      roleAtLeast(role, "manager") ? supabase.rpc("search_employees", { p_query: q }) : Promise.resolve({ data: [] }),
      supabase.from("clients").select("id, name").ilike("name", `%${q}%`).order("name").limit(8),
    ]);
    employees = ((empRes.data ?? []) as Emp[]).slice(0, 8);
    clients = (clientRes.data ?? []) as Client[];

    const clientIds = clients.map((c) => c.id);
    let evQuery = supabase
      .from("events")
      .select("id, location, event_date, status, region, clients(name)")
      .or(clientIds.length ? `location.ilike.%${q}%,client_id.in.(${clientIds.join(",")})` : `location.ilike.%${q}%`)
      .order("event_date", { ascending: false })
      .limit(10);
    if (role === "recruiter") evQuery = evQuery.eq("recruiter_id", ctx.userId);
    events = ((await evQuery).data ?? []) as Ev[];
  }

  const empHref = isAdmin ? `/admin/employees?q=${enc}` : `/manager/employees?q=${enc}`;
  const total = employees.length + clients.length + events.length;

  return (
    <div className="space-y-8 pb-10">
      <PageHeader title="חיפוש" subtitle={raw ? `תוצאות עבור "${raw}"` : "עובדים, לקוחות ואירועים"} />

      {q.length < 2 ? (
        <p className="text-sm text-muted">יש להקליד לפחות 2 תווים בתיבת החיפוש.</p>
      ) : total === 0 ? (
        <p className="empty-state">לא נמצאו תוצאות.</p>
      ) : null}

      {employees.length > 0 && (
        <Section title="עובדים">
          {employees.map((e) => (
            <Row
              key={e.employee_id}
              href={empHref}
              title={[e.first_name, e.last_name].filter(Boolean).join(" ") || "ללא שם"}
              meta={[[e.city, e.region].filter(Boolean).join(", "), (e.role_tags ?? []).join(" · ")].filter(Boolean).join(" | ")}
            />
          ))}
        </Section>
      )}

      {clients.length > 0 && (
        <Section title="לקוחות">
          {clients.map((c) => (
            <Row key={c.id} href={isAdmin ? "/admin/clients" : `/manager/events?q=${encodeURIComponent(c.name)}`} title={c.name} meta="" />
          ))}
        </Section>
      )}

      {events.length > 0 && (
        <Section title="אירועים">
          {events.map((e) => {
            const client = Array.isArray(e.clients) ? e.clients[0] : e.clients;
            return (
              <Row
                key={e.id}
                href={`/manager/events/${e.id}`}
                title={e.location}
                meta={[client?.name, formatEventDate(e.event_date), e.region, isEventStatus(e.status) ? EVENT_STATUS_LABEL[e.status] : null]
                  .filter(Boolean)
                  .join(" | ")}
              />
            );
          })}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold text-muted">{title}</h2>
      <ul className="divide-y divide-line card">{children}</ul>
    </section>
  );
}

function Row({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <li>
      <Link href={href} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface2">
        <span className="font-semibold text-ink">{title}</span>
        {meta && <span className="text-xs text-muted">{meta}</span>}
      </Link>
    </li>
  );
}
