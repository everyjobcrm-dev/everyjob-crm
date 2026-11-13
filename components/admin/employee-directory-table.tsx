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
  admin: "אדמין",
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
        <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* phones: each row becomes a small block (thead hidden, cells labelled); wider screens: a normal table */}
      <div className="card sm:overflow-x-auto">
        <table className="w-full text-start text-sm max-sm:block sm:min-w-[960px]">
          <thead className="max-sm:hidden">
            <tr className="border-b border-line text-muted">
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
          <tbody className="divide-y divide-line max-sm:block">
            {employees.map((emp) => {
              const busy = isPending && pendingId === emp.id;
              const deleted = emp.deletedAt != null;
              return (
                <tr
                  key={emp.id}
                  className={`max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-3 max-sm:gap-y-3 max-sm:p-4 ${busy ? "opacity-50" : deleted ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3.5 max-sm:p-0 font-semibold text-ink">
                    {emp.name}
                    {deleted && (
                      <span className="ms-2 rounded-sm bg-rose-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                        מחוק/ה
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 max-sm:p-0 tabular-nums text-ink/80 max-sm:text-end">{emp.tz}</td>
                  <td data-label="הרשאה" className="px-4 py-3.5 max-sm:p-0 max-sm:before:mb-1 max-sm:before:block max-sm:before:text-xs max-sm:before:text-muted max-sm:before:content-[attr(data-label)]">
                    <select
                      aria-label={`הרשאה - ${emp.name}`}
                      value={emp.role}
                      disabled={busy || deleted}
                      onChange={(e) => run(emp.id, () => updateUserRole(emp.id, e.target.value as AdminEmployee["role"]))}
                      className="rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-primary disabled:opacity-50 max-sm:w-full max-sm:py-2.5"
                    >
                      <option value="employee">{ROLE_LABEL.employee}</option>
                      <option value="recruiter">{ROLE_LABEL.recruiter}</option>
                      <option value="manager">{ROLE_LABEL.manager}</option>
                      <option value="admin">{ROLE_LABEL.admin}</option>
                    </select>
                  </td>
                  <td data-label="אישור" className={`px-4 py-3.5 max-sm:p-0 max-sm:before:mb-1 max-sm:before:block max-sm:before:text-xs max-sm:before:text-muted max-sm:before:content-[attr(data-label)] ${emp.role !== "employee" || emp.approvalStatus == null ? "max-sm:hidden" : ""}`}>
                    {emp.role !== "employee" || emp.approvalStatus == null ? (
                      <span className="text-xs text-muted">—</span>
                    ) : emp.approvalStatus === "approved" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-sky/30 px-2 py-1 text-[11px] font-semibold text-sky-deep">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        {APPROVAL_LABEL.approved}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                            emp.approvalStatus === "pending" ? "bg-sun/40 text-sun-deep" : "bg-rose-500/10 text-rose-700"
                          }`}
                        >
                          {APPROVAL_LABEL[emp.approvalStatus]}
                        </span>
                        {!deleted && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(emp.id, () => approveEmployee(emp.id))}
                            className="text-xs font-semibold text-primary-soft hover:underline disabled:opacity-50"
                          >
                            אישור
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td data-label="גויס ע״י" className="px-4 py-3.5 max-sm:p-0 max-sm:before:mb-1 max-sm:before:block max-sm:before:text-xs max-sm:before:text-muted max-sm:before:content-[attr(data-label)]">
                    {emp.role === "employee" ? (
                      <select
                        aria-label={`גויס ע״י - ${emp.name}`}
                        value={emp.recruitedBy ?? ""}
                        disabled={busy || deleted}
                        onChange={(e) => run(emp.id, () => setRecruitedBy(emp.id, e.target.value || null))}
                        className="rounded-md border border-line bg-surface2 px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary disabled:opacity-50 max-sm:w-full max-sm:py-2.5"
                      >
                        <option value="">ללא</option>
                        {recruiters.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td data-label="טופס 101" className={`px-4 py-3.5 max-sm:p-0 max-sm:before:mb-1 max-sm:before:block max-sm:before:text-xs max-sm:before:text-muted max-sm:before:content-[attr(data-label)] ${emp.form101Status == null ? "max-sm:hidden" : ""}`}>
                    {emp.form101Status == null ? (
                      <span className="text-xs text-muted">—</span>
                    ) : emp.form101Status === "complete" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-sky/30 px-2 py-1 text-[11px] font-semibold text-sky-deep">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        {FORM_LABEL.complete}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                            emp.form101Status === "pending"
                              ? "bg-sun/40 text-sun-deep"
                              : "bg-rose-500/10 text-rose-700"
                          }`}
                        >
                          {FORM_LABEL[emp.form101Status]}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(emp.id, () => approveForm101(emp.id))}
                          className="text-xs font-semibold text-primary-soft hover:underline disabled:opacity-50"
                        >
                          אישור
                        </button>
                      </div>
                    )}
                  </td>
                  <td data-label="שעות סה״כ" className={`px-4 py-3.5 max-sm:p-0 max-sm:before:mb-1 max-sm:before:block max-sm:before:text-xs max-sm:before:text-muted max-sm:before:content-[attr(data-label)] tabular-nums text-ink/80 ${emp.totalHours == null ? "max-sm:hidden" : ""}`}>
                    {emp.totalHours ?? "—"}
                  </td>
                  <td
                    data-label="רווח סה״כ"
                    className={`px-4 py-3.5 max-sm:p-0 max-sm:before:mb-1 max-sm:before:block max-sm:before:text-xs max-sm:before:text-muted max-sm:before:content-[attr(data-label)] font-semibold tabular-nums text-primary-soft ${emp.totalEarnings == null ? "max-sm:hidden" : ""}`}
                  >
                    {emp.totalEarnings == null ? "—" : `₪${emp.totalEarnings.toLocaleString("he-IL")}`}
                  </td>
                  <td className="px-4 py-3.5 text-end max-sm:col-span-2 max-sm:p-0">
                    {deleted ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(emp.id, () => restoreUser(emp.id))}
                        className="text-xs font-semibold text-primary-soft hover:underline disabled:opacity-50"
                      >
                        שחזור
                      </button>
                    ) : confirmDeleteId === emp.id ? (
                      <span className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(emp.id, () => softDeleteUser(emp.id))}
                          className="rounded-md bg-rose-500/25 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-50"
                        >
                          לאשר מחיקה?
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-xs text-muted">
                          חזרה
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmDeleteId(emp.id)}
                        className="text-xs text-rose-700 hover:underline disabled:opacity-50"
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
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted max-sm:block">
                  לא נמצאו עובדים.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {confirmDeleteId && (
        <p className="text-xs text-muted">
          מחיקה רכה: המשתמש/ת לא יוכל/תוכל להתחבר ולא יופיע/תופיע בשיבוץ. ההיסטוריה, השיבוצים ודוחות השעות נשמרים; ניתן לשחזר.
        </p>
      )}
    </div>
  );
}
