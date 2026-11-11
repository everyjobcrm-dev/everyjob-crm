"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { updateUserRole, approveForm101, setRecruitedBy } from "@/app/admin/actions";

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

export function EmployeeDirectoryTable({
  employees,
  recruiters,
}: {
  employees: AdminEmployee[];
  recruiters: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRoleChange(id: string, role: AdminEmployee["role"]) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await updateUserRole(id, role);
      if (!result.success) setError(result.error);
      setPendingId(null);
    });
  }

  function handleRecruitedBy(id: string, recruiterId: string | null) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await setRecruitedBy(id, recruiterId);
      if (!result.success) setError(result.error);
      setPendingId(null);
    });
  }

  function handleApprove(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await approveForm101(id);
      if (!result.success) setError(result.error);
      setPendingId(null);
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
        <table className="w-full text-start text-sm max-sm:block sm:min-w-[760px]">
          <thead className="max-sm:hidden">
            <tr className="border-b border-line text-muted">
              <th scope="col" className="px-4 py-3 text-start font-medium">שם</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">ת.ז.</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">הרשאה</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">גויס ע״י</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">טופס 101</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">שעות סה״כ</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">רווח סה״כ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line max-sm:block">
            {employees.map((emp) => {
              const busy = isPending && pendingId === emp.id;
              return (
                <tr
                  key={emp.id}
                  className={`max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-3 max-sm:gap-y-3 max-sm:p-4 ${busy ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3.5 max-sm:p-0 font-semibold text-ink">{emp.name}</td>
                  <td className="px-4 py-3.5 max-sm:p-0 tabular-nums text-ink/80 max-sm:text-end">{emp.tz}</td>
                  <td data-label="הרשאה" className="px-4 py-3.5 max-sm:p-0 max-sm:before:mb-1 max-sm:before:block max-sm:before:text-xs max-sm:before:text-muted max-sm:before:content-[attr(data-label)]">
                    <select
                      aria-label={`הרשאה - ${emp.name}`}
                      value={emp.role}
                      disabled={busy}
                      onChange={(e) => handleRoleChange(emp.id, e.target.value as AdminEmployee["role"])}
                      className="rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-primary disabled:opacity-50 max-sm:w-full max-sm:py-2.5"
                    >
                      <option value="employee">{ROLE_LABEL.employee}</option>
                      <option value="recruiter">{ROLE_LABEL.recruiter}</option>
                      <option value="manager">{ROLE_LABEL.manager}</option>
                      <option value="admin">{ROLE_LABEL.admin}</option>
                    </select>
                  </td>
                  <td data-label="גויס ע״י" className="px-4 py-3.5 max-sm:p-0 max-sm:before:mb-1 max-sm:before:block max-sm:before:text-xs max-sm:before:text-muted max-sm:before:content-[attr(data-label)]">
                    {emp.role === "employee" ? (
                      <select
                        aria-label={`גויס ע״י - ${emp.name}`}
                        value={emp.recruitedBy ?? ""}
                        disabled={busy}
                        onChange={(e) => handleRecruitedBy(emp.id, e.target.value || null)}
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
                          onClick={() => handleApprove(emp.id)}
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
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted max-sm:block">
                  לא נמצאו עובדים.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
