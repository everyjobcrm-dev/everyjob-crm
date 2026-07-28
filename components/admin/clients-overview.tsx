"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  FileSpreadsheet,
  Users,
  Wallet,
  Clock,
  Award,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import {
  type ClientRecord,
  type ClientWithMetrics,
  withMetrics,
  formatILS,
  currentMonthLabel,
  exportClientsCsv,
} from "@/lib/admin/clients-data";
import { ClientDetailDrawer } from "@/components/admin/client-detail-drawer";
import { AddClientDialog } from "@/components/admin/add-client-dialog";

type SortKey = "payout" | "hours" | "bonus" | "name";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "payout", label: "סה\"כ לתשלום" },
  { value: "hours", label: "שעות עבודה" },
  { value: "bonus", label: "בונוס מגייסים" },
  { value: "name", label: "שם (א-ת)" },
];

const tileVariants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function ClientsOverview({
  clients: initialClients,
  isDemoData,
}: {
  clients: ClientRecord[];
  isDemoData: boolean;
}) {
  const [clients, setClients] = useState<ClientRecord[]>(initialClients);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("payout");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<ClientWithMetrics | null>(null);

  const withAllMetrics = useMemo(() => clients.map(withMetrics), [clients]);

  const filtered = useMemo(() => {
    const q = query.trim();
    const list = q
      ? withAllMetrics.filter(
          (c) => c.name.includes(q) || c.industry.includes(q) || c.contactName.includes(q)
        )
      : withAllMetrics;

    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "hours":
          return b.totalHours - a.totalHours;
        case "bonus":
          return b.recruiterBonus - a.recruiterBonus;
        case "name":
          return a.name.localeCompare(b.name, "he");
        case "payout":
        default:
          return b.totalPayout - a.totalPayout;
      }
    });
    return sorted;
  }, [withAllMetrics, query, sortBy]);

  const globals = useMemo(() => {
    const activeClients = withAllMetrics.filter((c) => c.status === "active");
    return {
      activeCount: activeClients.length,
      totalHours: withAllMetrics.reduce((s, c) => s + c.totalHours, 0),
      totalPayout: withAllMetrics.reduce((s, c) => s + c.totalPayout, 0),
      totalBonus: withAllMetrics.reduce((s, c) => s + c.recruiterBonus, 0),
    };
  }, [withAllMetrics]);

  const topClientId = useMemo(() => {
    const active = withAllMetrics.filter((c) => c.status === "active" && c.totalPayout > 0);
    if (active.length === 0) return null;
    return active.reduce((top, c) => (c.totalPayout > top.totalPayout ? c : top), active[0]).id;
  }, [withAllMetrics]);

  function handleCreateClient(newClient: ClientRecord) {
    setClients((prev) => [newClient, ...prev]);
  }

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-cream/50">ממשק מנהל</p>
          <h1 className="font-display text-3xl text-cream">ניהול לקוחות</h1>
          <p className="mt-1 text-sm text-cream/45">
            מרכז חיוב ותפעול · {currentMonthLabel()}
            {isDemoData && (
              <span className="ms-2 inline-flex items-center gap-1 rounded-md bg-[#4F46E5]/15 px-2 py-0.5 text-[11px] font-semibold text-[#8b85f5]">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                נתוני הדגמה
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => exportClientsCsv(filtered)}
            className="inline-flex items-center gap-2 rounded-full border border-cream/15 px-5 py-2.5 text-sm font-semibold text-cream/80 transition-colors hover:border-[#D4FF00]/40 hover:text-[#D4FF00]"
          >
            <FileSpreadsheet className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            ייצוא לאקסל
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#4F46E5] px-5 py-2.5 text-sm font-bold text-white shadow-[0_15px_35px_-12px_rgba(79,70,229,0.7)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
            לקוח חדש
          </button>
        </div>
      </header>

      {/* Asymmetric bento stat strip */}
      <div className="grid grid-cols-1 gap-4 lg:auto-rows-[minmax(108px,auto)] lg:grid-cols-12">
        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          custom={0}
          className="relative overflow-hidden rounded-3xl border border-[#D4FF00]/25 bg-surface p-6 lg:col-span-5 lg:row-span-2"
        >
          <div
            className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(circle, #D4FF00, transparent 70%)" }}
            aria-hidden="true"
          />
          <Wallet className="h-5 w-5 text-[#D4FF00]" strokeWidth={1.8} aria-hidden="true" />
          <p className="mt-4 text-sm text-cream/50">סה&quot;כ לתשלום ללקוחות · {currentMonthLabel()}</p>
          <p className="relative mt-2 font-display text-5xl text-[#D4FF00] tabular-nums">
            {formatILS(globals.totalPayout)}
          </p>
          <p className="mt-3 text-xs text-cream/40">
            מחושב אוטומטית מסך המשמרות שדווחו החודש, לפי התעריף שהוגדר לכל עובד/ת ולקוח.
          </p>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          custom={1}
          className="rounded-2xl border border-cream/10 bg-surface p-6 lg:col-span-3"
        >
          <Users className="h-5 w-5 text-[#4F46E5]" strokeWidth={1.8} aria-hidden="true" />
          <p className="mt-4 text-sm text-cream/50">לקוחות פעילים</p>
          <p className="mt-1 font-display text-4xl text-cream tabular-nums">{globals.activeCount}</p>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          custom={2}
          className="rounded-2xl border border-cream/10 bg-surface p-6 lg:col-span-4"
        >
          <Award className="h-5 w-5 text-[#4F46E5]" strokeWidth={1.8} aria-hidden="true" />
          <p className="mt-4 text-sm text-cream/50">בונוס מגייסים · סה&quot;כ החודש</p>
          <p className="mt-1 font-display text-4xl text-cream tabular-nums">{formatILS(globals.totalBonus)}</p>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          custom={3}
          className="rounded-2xl border border-cream/10 bg-surface2 p-6 lg:col-span-4"
        >
          <Clock className="h-5 w-5 text-cream/50" strokeWidth={1.8} aria-hidden="true" />
          <p className="mt-4 text-sm text-cream/50">שעות עבודה שדווחו</p>
          <p className="mt-1 font-display text-4xl text-cream tabular-nums">
            {globals.totalHours.toLocaleString("he-IL")}
          </p>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          custom={4}
          className="rounded-2xl border border-cream/10 bg-surface2 p-6 lg:col-span-3"
        >
          <p className="text-sm text-cream/50">ממוצע לקוח פעיל</p>
          <p className="mt-1 font-display text-2xl text-cream tabular-nums">
            {formatILS(globals.activeCount ? globals.totalPayout / globals.activeCount : 0)}
          </p>
          <p className="mt-1 text-xs text-cream/40">לחודש, לפני מע&quot;מ</p>
        </motion.div>
      </div>

      {/* Toolbar */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/35"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם לקוח, תחום או איש קשר..."
            className="w-full rounded-full border border-cream/12 bg-surface py-2.5 ps-10 pe-4 text-sm text-cream outline-none transition-colors focus:border-[#4F46E5]"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-cream/50">
          מיון לפי
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-full border border-cream/12 bg-surface px-3.5 py-2 text-sm font-semibold text-cream outline-none focus:border-[#4F46E5]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Client cards */}
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((client, i) => (
          <motion.button
            key={client.id}
            type="button"
            onClick={() => setSelected(client)}
            variants={tileVariants}
            initial="hidden"
            animate="show"
            custom={i * 0.6}
            className={`group relative overflow-hidden rounded-2xl border p-5 text-start transition-all hover:-translate-y-0.5 ${
              client.id === topClientId
                ? "border-[#D4FF00]/35 bg-surface shadow-[0_25px_50px_-25px_rgba(212,255,0,0.35)]"
                : "border-cream/10 bg-surface hover:border-[#4F46E5]/40 hover:shadow-[0_25px_50px_-25px_rgba(79,70,229,0.55)]"
            } ${client.status === "paused" ? "opacity-60" : ""}`}
          >
            {client.id === topClientId && (
              <span className="absolute end-4 top-4 inline-flex items-center gap-1 rounded-md bg-[#D4FF00]/15 px-2 py-1 text-[10px] font-bold text-[#D4FF00]">
                <Award className="h-3 w-3" aria-hidden="true" />
                החשבון המוביל
              </span>
            )}

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#4F46E5]/15 font-display text-lg text-[#8b85f5]">
                {client.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-cream">{client.name}</p>
                <p className="truncate text-xs text-cream/45">{client.industry}</p>
              </div>
            </div>

            {client.status === "paused" && (
              <span className="mt-3 inline-flex rounded-md bg-cream/10 px-2 py-1 text-[10px] font-semibold text-cream/60">
                מושהה
              </span>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-cream/10 pt-4">
              <div>
                <p className="text-[11px] text-cream/40">שעות</p>
                <p className="mt-0.5 font-semibold tabular-nums text-cream">{client.totalHours}</p>
              </div>
              <div>
                <p className="text-[11px] text-cream/40">לתשלום</p>
                <p className="mt-0.5 font-semibold tabular-nums text-[#D4FF00]">{formatILS(client.totalPayout)}</p>
              </div>
              <div>
                <p className="text-[11px] text-cream/40">בונוס</p>
                <p className="mt-0.5 font-semibold tabular-nums text-cream/80">{formatILS(client.recruiterBonus)}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-cream/40">
              <span>{client.activeEmployeeCount} עובדים החודש</span>
              <span className="inline-flex items-center gap-1 font-semibold text-[#4F46E5] opacity-0 transition-opacity group-hover:opacity-100">
                פירוט משמרות
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
          </motion.button>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-cream/15 px-4 py-14 text-center text-sm text-cream/45">
            לא נמצאו לקוחות התואמים את החיפוש.
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && <ClientDetailDrawer client={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {addOpen && <AddClientDialog onClose={() => setAddOpen(false)} onCreated={handleCreateClient} />}
      </AnimatePresence>
    </div>
  );
}