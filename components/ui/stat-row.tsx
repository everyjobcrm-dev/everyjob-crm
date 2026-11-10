/** A row of headline numbers between two rules. Stays side by side on phones (labels wrap), so it never
 *  turns into a screen-tall stack of digits. */
export function StatRow({ items, className = "" }: { items: { label: string; value: number | string }[]; className?: string }) {
  return (
    <dl
      className={`grid divide-x divide-x-reverse divide-line-strong border-y border-ink ${className}`}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(({ label, value }) => (
        <div key={label} className="px-3 py-4 first:ps-0 sm:px-6 sm:py-5">
          <dt className="text-xs leading-5 text-muted sm:text-sm">{label}</dt>
          <dd className="mt-1 font-display text-3xl font-bold tabular-nums sm:text-5xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
