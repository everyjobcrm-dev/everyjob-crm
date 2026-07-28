"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { updateUserRole, approveForm101 } from "@/app/admin/actions";

export type AdminEmployee = {
  id: string;
  name: string;
  tz: string;
  role: "admin" | "employee" | "recruiter";
  form101Status: "missing" | "pending" | "complete";
  totalEarnings: number;
  totalHours: number;
};

const ROLE_LABEL: Record<AdminEmployee["role"], string> = {
  admin: "מנהל/ת",
  employee: "עובד/ת",
  recruiter: "מגייס/ת",
};

const FORM_LABEL: Record<AdminEmployee["form101Status"], string> = {
  missing: "חסר",
  pending: "בבדיקה",
  complete: "אושר",
};

export function EmployeeDirectoryTable({ employees }: { employees: AdminEmployee[] }) {
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
        <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-brass/15 bg-surface">
        <table className="w-full min-w-[760px] text-start text-sm">
          <thead>
            <tr className="border-b border-brass/10 text-cream/50">
              <th scope="col" className="px-4 py-3 text-start font-medium">שם</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">ת.ז.</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">הרשאה</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">טופס 101</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">שעות סה״כ</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">רווח סה״כ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brass/10">
            {employees.map((emp) => {
              const busy = isPending && pendingId === emp.id;
              return (
                <tr key={emp.id} className={busy ? "opacity-50" : undefined}>
                  <td className="px-4 py-3.5 font-semibold text-cream">{emp.name}</td>
                  <td className="px-4 py-3.5 tabular-nums text-cream/70">{emp.tz}</td>
                  <td className="px-4 py-3.5">
                    <select
                      value={emp.role}
                      disabled={busy}
                      onChange={(e) => handleRoleChange(emp.id, e.target.value as AdminEmployee["role"])}
                      className="rounded-lg border border-brass/15 bg-surface2 px-2.5 py-1.5 text-xs font-semibold text-cream outline-none focus:border-brass disabled:opacity-50"
                    >
                      <option value="employee">{ROLE_LABEL.employee}</option>
                      <option value="recruiter">{ROLE_LABEL.recruiter}</option>
                      <option value="admin">{ROLE_LABEL.admin}</option>
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    {emp.form101Status === "complete" ? (
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
                          onClick={() => handleApprove(emp.id)}
                          className="text-xs font-semibold text-brass hover:underline disabled:opacity-50"
                        >
                          אישור
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-cream/70">{emp.totalHours}</td>
                  <td className="px-4 py-3.5 font-semibold tabular-nums text-brass">
                    ₪{emp.totalEarnings.toLocaleString("he-IL")}
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-cream/40">
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
