// lib/admin/clients-data.ts
//
// Data shapes + demo dataset for the Admin "Clients Management" page.
//
// EXPECTED SCHEMA (for wiring to Supabase later):
//   clients
//     id            uuid pk
//     name          text
//     industry      text
//     contact_name  text
//     contact_phone text
//     address       text
//     hourly_rate   numeric        -- default billing rate for this client
//     bonus_pct     numeric        -- recruiter bonus, as a fraction of payout (e.g. 0.08)
//     status        text           -- 'active' | 'paused'
//     created_at    timestamptz
//
//   client_shifts
//     id            uuid pk
//     client_id     uuid fk -> clients.id
//     employee_id   uuid fk -> profiles.id
//     employee_name text           -- denormalized for fast reads, or join profiles
//     role          text
//     shift_date    date
//     hours         numeric
//     hourly_rate   numeric        -- rate actually paid for this shift (can override client default)
//
// Until those tables exist, AdminClientsPage falls back to DEMO_CLIENTS below so the
// screen always renders a realistic, fully interactive preview.

export type ShiftRecord = {
  id: string;
  employeeName: string;
  role: string;
  date: string; // yyyy-mm-dd
  hours: number;
  hourlyRate: number;
};

export type ClientRecord = {
  id: string;
  name: string;
  industry: string;
  contactName: string;
  contactPhone: string;
  address: string;
  hourlyRate: number;
  bonusPct: number; // recruiter bonus, fraction of payout
  status: "active" | "paused";
  shifts: ShiftRecord[];
};

export type ClientWithMetrics = ClientRecord & {
  totalHours: number;
  totalPayout: number;
  recruiterBonus: number;
  activeEmployeeCount: number;
  lastShiftDate: string | null;
};

export function withMetrics(client: ClientRecord): ClientWithMetrics {
  const totalHours = client.shifts.reduce((sum, s) => sum + s.hours, 0);
  const totalPayout = client.shifts.reduce((sum, s) => sum + s.hours * s.hourlyRate, 0);
  const recruiterBonus = totalPayout * client.bonusPct;
  const activeEmployeeCount = new Set(client.shifts.map((s) => s.employeeName)).size;
  const lastShiftDate =
    client.shifts.length > 0
      ? client.shifts.reduce((latest, s) => (s.date > latest ? s.date : latest), client.shifts[0].date)
      : null;

  return { ...client, totalHours, totalPayout, recruiterBonus, activeEmployeeCount, lastShiftDate };
}

export function formatILS(value: number): string {
  return value.toLocaleString("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
}

export function currentMonthLabel(): string {
  return new Date().toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

/**
 * Builds a UTF-8 (with BOM, so Hebrew renders correctly in Excel) CSV blob
 * for client billing export. Swap for a real .xlsx writer (e.g. `exceljs`)
 * once server-side export is needed — the onClick contract stays the same.
 */
export function exportClientsCsv(clients: ClientWithMetrics[]): void {
  const headers = ["שם לקוח", "תחום", "שעות עבודה", "סה\"כ לתשלום", "בונוס מגייסים", "עובדים פעילים", "סטטוס"];

  const rows = clients.map((c) => [
    c.name,
    c.industry,
    c.totalHours.toString(),
    Math.round(c.totalPayout).toString(),
    Math.round(c.recruiterBonus).toString(),
    c.activeEmployeeCount.toString(),
    c.status === "active" ? "פעיל" : "מושהה",
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `billing-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---- Demo dataset (used until the real `clients` / `client_shifts` tables exist) ----

export const DEMO_CLIENTS: ClientRecord[] = [
  {
    id: "c-001",
    name: "מלון הוד הים",
    industry: "אירוח ומלונאות",
    contactName: "רונית אלבז",
    contactPhone: "052-1234567",
    address: "שדרות הים 14, תל אביב",
    hourlyRate: 58,
    bonusPct: 0.08,
    status: "active",
    shifts: [
      { id: "s-1", employeeName: "עידן כהן", role: "מלצר", date: "2026-07-03", hours: 8, hourlyRate: 58 },
      { id: "s-2", employeeName: "עידן כהן", role: "מלצר", date: "2026-07-10", hours: 7.5, hourlyRate: 58 },
      { id: "s-3", employeeName: "נועה שרון", role: "ברמנית", date: "2026-07-05", hours: 6, hourlyRate: 62 },
      { id: "s-4", employeeName: "נועה שרון", role: "ברמנית", date: "2026-07-12", hours: 6.5, hourlyRate: 62 },
      { id: "s-5", employeeName: "יובל מזרחי", role: "מנהל משמרת", date: "2026-07-08", hours: 9, hourlyRate: 74 },
      { id: "s-6", employeeName: "תמר לוי", role: "מלצרית", date: "2026-07-14", hours: 8, hourlyRate: 58 },
    ],
  },
  {
    id: "c-002",
    name: "טכנוגן היי-טק פארק",
    industry: "אירועי חברות",
    contactName: "גיא פרידמן",
    contactPhone: "054-9876543",
    address: "רחוב הברזל 3, הרצליה",
    hourlyRate: 65,
    bonusPct: 0.1,
    status: "active",
    shifts: [
      { id: "s-7", employeeName: "מאיה בן דוד", role: "קופאית אירוע", date: "2026-07-02", hours: 5, hourlyRate: 65 },
      { id: "s-8", employeeName: "אורי גת", role: "טכנאי הפקה", date: "2026-07-02", hours: 10, hourlyRate: 80 },
      { id: "s-9", employeeName: "אורי גת", role: "טכנאי הפקה", date: "2026-07-16", hours: 9, hourlyRate: 80 },
      { id: "s-10", employeeName: "שירה אזולאי", role: "קבלת פנים", date: "2026-07-09", hours: 6, hourlyRate: 65 },
    ],
  },
  {
    id: "c-003",
    name: "פסטיבל טעמים בגינה",
    industry: "אירועים ופסטיבלים",
    contactName: "דנה קרמר",
    contactPhone: "050-3456789",
    address: "פארק הירקון, תל אביב",
    hourlyRate: 55,
    bonusPct: 0.07,
    status: "active",
    shifts: [
      { id: "s-11", employeeName: "עידן כהן", role: "דוכן מזון", date: "2026-07-04", hours: 7, hourlyRate: 55 },
      { id: "s-12", employeeName: "רועי בכר", role: "אבטחה", date: "2026-07-04", hours: 8, hourlyRate: 68 },
      { id: "s-13", employeeName: "רועי בכר", role: "אבטחה", date: "2026-07-05", hours: 8, hourlyRate: 68 },
      { id: "s-14", employeeName: "ליאור שדה", role: "דוכן מזון", date: "2026-07-05", hours: 6.5, hourlyRate: 55 },
      { id: "s-15", employeeName: "מאיה בן דוד", role: "קופאית", date: "2026-07-05", hours: 7, hourlyRate: 58 },
    ],
  },
  {
    id: "c-004",
    name: "בנק דיסקונט - סניף ראשי",
    industry: "פיננסים",
    contactName: "אלון נחום",
    contactPhone: "03-6541234",
    address: "רחוב יהודה הלוי 27, תל אביב",
    hourlyRate: 70,
    bonusPct: 0.06,
    status: "active",
    shifts: [
      { id: "s-16", employeeName: "תמר לוי", role: "פקידת דלפק", date: "2026-07-01", hours: 8, hourlyRate: 70 },
      { id: "s-17", employeeName: "תמר לוי", role: "פקידת דלפק", date: "2026-07-08", hours: 8, hourlyRate: 70 },
      { id: "s-18", employeeName: "יובל מזרחי", role: "מאבטח", date: "2026-07-01", hours: 9, hourlyRate: 72 },
    ],
  },
  {
    id: "c-005",
    name: "קניון עזריאלי חולון",
    industry: "קמעונאות",
    contactName: "שרון גבאי",
    contactPhone: "058-7412589",
    address: "דרך קוגל 8, חולון",
    hourlyRate: 52,
    bonusPct: 0.05,
    status: "paused",
    shifts: [{ id: "s-19", employeeName: "נועה שרון", role: "דלפק מידע", date: "2026-06-20", hours: 6, hourlyRate: 52 }],
  },
];