"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { updateUserRole, approveForm101, setRecruitedBy, softDeleteUser, restoreUser } from "@/app/admin/actions";
import { approveEmployee } from "@/app/manager/actions";

export type AdminEmployee = {
  id: string;
  name: string;
  tz: string;
  role: "admin" | "manager" | "employee" | "recruiter";
  // null = not available from the live schema (profiles has no form_101_status / totals columns); shown as "—"
  form101Status: "missing" | "pending" | "complete" | null;
  totalEarnings: number | null;
  totalHours: number | null;
  recruitedBy: string | null;
  /** profiles.approval_status (p10d); null until the migration is live. */
  approvalStatus: "pending" | "approved" | "rejected" | null;
  /** profiles.deleted_at (p10c); set = soft-deleted. */
  deletedAt: string | null;
};

const ROLE_LABEL: Record<AdminEmployee["role"], string> = {
  admin: "מנהל/ת",
  manager: "מנהל/ת שטח",
  employee: "עובד/ת",
  recruiter: "מגייס/ת",
};

const FORM_LABEL: Record<NonNullable<AdminEmployee["form101Status"]>, string> = {
  missing: "חסר",
  pending: "בבדיקה",
  complete: "אושר",
};

const APPROVAL_LABEL: Record<NonNullable<AdminEmployee["approvalStatus"]>, string> = {
  pending: "ממתין/ה לאישור",
  approved: "מאושר/ת",
  rejected: "נדחה/תה",
};

export function EmployeeDirectoryTable({
  employees,
  recruiters,
}: {
  employees: AdminEmployee[];
  recruiters: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(id: string, action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await action();
      if (!result.success) setError(result.error ?? "הפעולה נכשלה.");
      setPendingId(null);
      setConfirmDeleteId(null);
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-brass/15 bg-surface">
        <table className="w-full min-w-[960px] text-start text-sm">
          <thead>
            <tr className="border-b border-brass/10 text-cream/50">
              <th scope="col" className="px-4 py-3 text-start font-medium">שם</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">ת.ז.</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">הרשאה</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">אישור</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">גויס ע״י</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">טופס 101</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">שעות סה״כ</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">רווח סה״כ</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">
                <span className="sr-only">פעולות</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brass/10">
            {employees.map((emp) => {
              const busy = isPending && pendingId === emp.id;
              const deleted = emp.deletedAt != null;
              return (
                <tr key={emp.id} className={busy ? "opacity-50" : deleted ? "opacity-60" : undefined}>
                  <td className="px-4 py-3.5 font-semibold text-cream">
                    {emp.name}
                    {deleted && (
                      <span className="ms-2 rounded-sm bg-rose-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-rose-300">
                        מחוק/ה
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-cream/70">{emp.tz}</td>
                  <td className="px-4 py-3.5">
                    <select
                      value={emp.role}
                      disabled={busy || deleted}
                      onChange={(e) => run(emp.id, () => updateUserRole(emp.id, e.target.value as AdminEmployee["role"]))}
                      className="rounded-lg border border-brass/15 bg-surface2 px-2.5 py-1.5 text-xs font-semibold text-cream outline-none focus:border-brass disabled:opacity-50"
                    >
                      <option value="employee">{ROLE_LABEL.employee}</option>
                      <option value="recruiter">{ROLE_LABEL.recruiter}</option>
                      <option value="manager">{ROLE_LABEL.manager}</option>
                      <option value="admin">{ROLE_LABEL.admin}</option>
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    {emp.role !== "employee" || emp.approvalStatus == null ? (
                      <span className="text-xs text-cream/65">—</span>
                    ) : emp.approvalStatus === "approved" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brass/10 px-2 py-1 text-[11px] font-semibold text-brass">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        {APPROVAL_LABEL.approved}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                            emp.approvalStatus === "pending" ? "bg-[#D4FF00]/15 text-[#D4FF00]" : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {APPROVAL_LABEL[emp.approvalStatus]}
                        </span>
                        {!deleted && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(emp.id, () => approveEmployee(emp.id))}
                            className="text-xs font-semibold text-brass hover:underline disabled:opacity-50"
                          >
                            אישור
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {emp.role === "employee" ? (
                      <select
                        aria-label={`גויס ע״י - ${emp.name}`}
                        value={emp.recruitedBy ?? ""}
                        disabled={busy || deleted}
                        onChange={(e) => run(emp.id, () => setRecruitedBy(emp.id, e.target.value || null))}
                        className="rounded-md border border-brass/15 bg-surface2 px-2.5 py-1.5 text-xs text-cream outline-none focus:border-brass disabled:opacity-50"
                      >
                        <option value="">ללא</option>
                        {recruiters.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-cream/65">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {emp.form101Status == null ? (
                      <span className="text-xs text-cream/65">—</span>
                    ) : emp.form101Status === "complete" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brass/10 px-2 py-1 text-[11px] font-semibold text-brass">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        {FORM_LABEL.complete}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                            emp.form101Status === "pending"
                              ? "bg-cream/10 text-cream/70"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {FORM_LABEL[emp.form101Status]}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(emp.id, () => approveForm101(emp.id))}
                          className="text-xs font-semibold text-brass hover:underline disabled:opacity-50"
                        >
                          אישור
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-cream/70">{emp.totalHours ?? "—"}</td>
                  <td className="px-4 py-3.5 font-semibold tabular-nums text-brass">
                    {emp.totalEarnings == null ? "—" : `₪${emp.totalEarnings.toLocaleString("he-IL")}`}
                  </td>
                  <td className="px-4 py-3.5 text-end">
                    {deleted ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(emp.id, () => restoreUser(emp.id))}
                        className="text-xs font-semibold text-indigo-300 hover:underline disabled:opacity-50"
                      >
                        שחזור
                      </button>
                    ) : confirmDeleteId === emp.id ? (
                      <span className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(emp.id, () => softDeleteUser(emp.id))}
                          className="rounded-md bg-rose-500/25 px-2 py-1 text-xs font-semibold text-rose-100 disabled:opacity-50"
                        >
                          לאשר מחיקה?
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-xs text-cream/60">
                          חזרה
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmDeleteId(emp.id)}
                        className="text-xs text-rose-300 hover:underline disabled:opacity-50"
                      >
                        מחיקה
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-cream/65">
                  לא נמצאו עובדים.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {confirmDeleteId && (
        <p className="text-xs text-cream/60">
          מחיקה רכה: המשתמש/ת לא יוכל/תוכל להתחבר ולא יופיע/תופיע בשיבוץ. ההיסטוריה, השיבוצים ודוחות השעות נשמרים; ניתן לשחזר.
        </p>
      )}
    </div>
  );
}
