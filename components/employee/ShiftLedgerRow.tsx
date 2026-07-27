/**
 * A past shift rendered as a torn ticket-stub row: date block on one side,
 * perforated seam, details on the other — the ledger equivalent of TicketPass.
 */
export function ShiftLedgerRow({
  role,
  location,
  date,
  hours,
  wage,
}: {
  role: string;
  location: string;
  date: string;
  hours: number;
  wage: string;
}) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-2xl border border-brass/15 bg-surface">
      <div className="flex w-20 shrink-0 flex-col items-center justify-center gap-0.5 bg-surface2 py-4">
        <span className="text-[10px] uppercase tracking-wide text-cream/40">משמרת</span>
        <span className="font-display text-lg text-cream">{date}</span>
      </div>
      <div className="perforation w-px shrink-0" aria-hidden="true" />
      <div className="flex flex-1 items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-cream">{role}</p>
          <p className="truncate text-xs text-cream/50">{location}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-sm">
          <span className="tabular-nums text-cream/60">{hours} ש׳</span>
          <span className="font-bold tabular-nums text-brass">{wage}</span>
        </div>
      </div>
    </div>
  );
}
