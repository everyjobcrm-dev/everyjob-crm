import type { LucideIcon } from "lucide-react";

export function StatStub({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <div className="card p-5">
      <Icon className="h-4 w-4 text-primary-soft" strokeWidth={1.8} aria-hidden="true" />
      <p className="mt-3 text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl text-ink tabular-nums">{value}</p>
    </div>
  );
}
