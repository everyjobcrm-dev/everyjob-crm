/**
 * Staff roster model (pure, importable from client components). Rows come from the get_event_roster RPC
 * (supabase/p3_m7s_get_event_roster.sql): scoped by app_can_manage_event, never carries tz / email / documents,
 * and wage_rate / rate_set_at are NULL unless the caller is admin or manager.
 *
 * Buckets are a presentation of the stored registration status only - nothing here is persisted.
 */

export type RosterRow = {
  registration_id: string;
  event_role_id: string | null;
  role_name: string | null;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  worker_role: string | null;
  age: number | null;
  average_rating: number | null;
  status: string;
  cancellation_requested_at: string | null;
  registered_at: string;
  waitlist_position: number | null;
  wage_rate: number | null;
  rate_set_at: string | null;
  submission_id: string | null;
  submission_status: string | null;
  reported_hours: number | null;
};

export type RosterRole = {
  id: string;
  roleName: string;
  headcount: number;
  startTime: string | null;
  endTime: string | null;
};

export type RosterBucket = "cancellation" | "approved" | "pending" | "waitlisted" | "inactive";

const ACTIVE = new Set(["pending", "approved", "waitlisted"]);

export function rosterBucket(row: RosterRow): RosterBucket {
  if (ACTIVE.has(row.status) && row.cancellation_requested_at) return "cancellation";
  if (row.status === "approved") return "approved";
  if (row.status === "pending") return "pending";
  if (row.status === "waitlisted") return "waitlisted";
  return "inactive";
}

export const BUCKET_ORDER: readonly RosterBucket[] = ["cancellation", "approved", "pending", "waitlisted", "inactive"];

export const BUCKET_LABEL: Record<RosterBucket, string> = {
  cancellation: "בקשות ביטול",
  approved: "משובצים",
  pending: "ממתינים לאישור",
  waitlisted: "רשימת המתנה",
  inactive: "היסטוריה (נדחו / בוטלו / הוסרו)",
};

export const REGISTRATION_STATUS_LABEL: Record<string, string> = {
  pending: "ממתין/ה לאישור",
  approved: "משובץ/ת",
  waitlisted: "בהמתנה",
  rejected: "נדחה/תה",
  cancelled: "בוטל/ה",
  removed: "הוסר/ה",
  no_show: "לא הגיע/ה",
};

/** Slots in use for a role = pending + approved (the capacity rule; mirrors event_role_fill_counts). */
export function occupiedSlots(rows: RosterRow[], roleId: string): number {
  return rows.filter((r) => r.event_role_id === roleId && (r.status === "pending" || r.status === "approved")).length;
}

export function displayName(row: Pick<RosterRow, "first_name" | "last_name">): string {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || "ללא שם";
}

/** Events in these statuses accept staff registration actions (the RPCs enforce the same rule). */
export function acceptsStaffActions(eventStatus: string): boolean {
  return eventStatus === "open" || eventStatus === "closed";
}
