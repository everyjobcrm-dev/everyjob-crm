// lib/admin/clients-data.ts

export type PreferredRole = {
  role: string;
  rate: number;
};

export type ClientContact = {
  name: string;
  phone: string;
};

export type ClientStatus = "active" | "paused";

// Raw shape as it comes back from Supabase (snake_case)
export type ClientRow = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  name: string;
  company_id: string | null;
  address: string | null;
  industry: string | null;
  notes: string | null;
  status: ClientStatus;
  contacts: ClientContact[] | null;
  preferred_roles: PreferredRole[] | null;
  overtime_threshold_hours: number | null;
  min_billable_hours: number | null;
  events: { count: number }[] | null; // from `.select("*, events(count)")`
};

// App-facing shape (camelCase) used by components.
// contactName/contactPhone are the PRIMARY contact (first entry in `contacts`),
// surfaced for the single-contact display components; the full `contacts`
// array is also included for anything that needs all of them.
export type ClientRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  companyId: string;
  address: string;
  industry: string;
  notes: string;
  status: ClientStatus;
  contacts: ClientContact[];
  contactName: string;
  contactPhone: string;
  preferredRoles: PreferredRole[];
  overtimeThresholdHours: number | null;
  minBillableHours: number | null;
  eventsCount: number;
};

export function mapClientRow(row: ClientRow): ClientRecord {
  const contacts = row.contacts ?? [];
  const primary = contacts[0];

  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    companyId: row.company_id ?? "",
    address: row.address ?? "",
    industry: row.industry ?? "",
    notes: row.notes ?? "",
    status: row.status ?? "active",
    contacts,
    contactName: primary?.name ?? "",
    contactPhone: primary?.phone ?? "",
    preferredRoles: row.preferred_roles ?? [],
    overtimeThresholdHours: row.overtime_threshold_hours,
    minBillableHours: row.min_billable_hours,
    eventsCount: row.events?.[0]?.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Small display/export helpers used by clients-overview.tsx
// ---------------------------------------------------------------------------

export function currentMonthLabel(): string {
  return new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(new Date());
}

export function exportClientsCsv(clients: ClientRecord[]): void {
  const headers = ["שם", "תעשייה", "איש קשר", "טלפון", "כתובת", "סטטוס", "אירועים"];

  const rows = clients.map((c) => [
    c.name,
    c.industry,
    c.contactName,
    c.contactPhone,
    c.address,
    c.status === "active" ? "פעיל" : "מושהה",
    String(c.eventsCount),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  // BOM so Excel opens Hebrew UTF-8 correctly
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `לקוחות-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}