// lib/admin/clients-data.ts
//
// Data shapes + helpers for the Admin "Clients Management" page.
// Backed directly by the `clients` / `events` tables (see sql/001_clients_events_schema.sql).
// No mock data — the page renders an empty state if the query fails or returns nothing.

export type PreferredRole = {
  role: string;
  rate: number; // ₪/hour
};

export type ClientRecord = {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  preferredRoles: PreferredRole[];
  notes: string | null;
  dressCode: string | null;
  status: "active" | "paused";
  eventsCount: number;
  createdAt: string;
};

// Shape returned by Supabase when selecting `*, events(count)`.
export type ClientRow = {
  id: string;
  name: string;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  preferred_roles: PreferredRole[] | null;
  notes: string | null;
  dress_code: string | null;
  status: "active" | "paused" | null;
  created_at: string;
  events: { count: number }[] | null;
};

export function mapClientRow(row: ClientRow): ClientRecord {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    preferredRoles: row.preferred_roles ?? [],
    notes: row.notes,
    dressCode: row.dress_code,
    status: row.status ?? "active",
    eventsCount: row.events?.[0]?.count ?? 0,
    createdAt: row.created_at,
  };
}

export function currentMonthLabel(): string {
  return new Date().toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

/**
 * UTF-8 (with BOM, so Hebrew renders correctly in Excel) CSV export of the
 * client directory currently shown on screen.
 */
export function exportClientsCsv(clients: ClientRecord[]): void {
  const headers = ["שם לקוח", "כתובת", "איש קשר", "טלפון", "קוד לבוש", "מספר אירועים", "סטטוס"];

  const rows = clients.map((c) => [
    c.name,
    c.address ?? "",
    c.contactName ?? "",
    c.contactPhone ?? "",
    c.dressCode ?? "",
    c.eventsCount.toString(),
    c.status === "active" ? "פעיל" : "מושהה",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}