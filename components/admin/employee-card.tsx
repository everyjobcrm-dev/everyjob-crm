import { AreaForm } from "@/components/employee/AreaForm";

export type EmployeeCardData = {
  id: string;
  name: string;
  /** Admin only (search_employees never returns tz). */
  tz?: string | null;
  phone: string | null;
  age: number | null;
  city: string | null;
  region: string | null;
  roleTags: string[];
  joinedAt: string | null;
};

const dateFmt = new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric", year: "numeric" });

/** Staff employee card (quote item 2). No Form 101 / bank data here: blocked for everyone until Admin 2FA (AGENTS §8, §11). */
export function EmployeeCard({ employee, editable }: { employee: EmployeeCardData; editable: boolean }) {
  const rows: [string, string][] = [
    ...(employee.tz !== undefined ? ([["ת.ז.", employee.tz ?? "—"]] as [string, string][]) : []),
    ["טלפון", employee.phone ?? "—"],
    ["גיל", employee.age != null ? String(employee.age) : "—"],
    ["עיר", employee.city ?? "—"],
    ["אזור", employee.region ?? "—"],
    ["הצטרף/ה", employee.joinedAt ? dateFmt.format(new Date(employee.joinedAt)) : "—"],
  ];
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="font-medium text-ink tabular-nums">{v}</dd>
          </div>
        ))}
        <div className="col-span-2">
          <dt className="text-xs text-muted">תפקידים</dt>
          <dd className="text-ink">{employee.roleTags.length ? employee.roleTags.join(" · ") : "—"}</dd>
        </div>
      </dl>
      {editable && (
        <AreaForm
          key={`${employee.city}|${employee.region}|${employee.roleTags.join(",")}`}
          employeeId={employee.id}
          initial={{ city: employee.city, region: employee.region, roleTags: employee.roleTags }}
        />
      )}
    </div>
  );
}
