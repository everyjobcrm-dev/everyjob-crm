"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  FileSpreadsheet,
  Building2,
  CalendarRange,
  ChevronLeft,
  Shirt,
  Phone,
  AlertTriangle,
  StickyNote,
} from "lucide-react";
import { type ClientRecord, currentMonthLabel, exportClientsCsv } from "@/lib/admin/clients-data";
import { ClientDetailDrawer } from "@/components/admin/client-detail-drawer";
import { AddClientDialog } from "@/components/admin/add-client-dialog";

type SortKey = "events" | "name" | "recent";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "events", label: "מספר אירועים" },
  { value: "name", label: "שם (א-ת)" },
  { value: "recent", label: "נוספו לאחרונה" },
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
  loadError,
}: {
  clients: ClientRecord[];
  loadError: boolean;
}) {
  const [clients, setClients] = useState<ClientRecord[]>(initialClients);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("events");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<ClientRecord | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    const list = q
      ? clients.filter(
          (c) =>
            c.name.includes(q) ||
            (c.contactName ?? "").includes(q) ||
            (c.address ?? "").includes(q)
        )
      : clients;

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name, "he");
        case "recent":
          return b.createdAt.localeCompare(a.createdAt);
        case "events":
        default:
          return b.eventsCount - a.eventsCount;
      }
    });
  }, [clients, query, sortBy]);

  const globals = useMemo(() => {
    const active = clients.filter((c) => c.status === "active");
    const totalEvents = clients.reduce((s, c) => s + c.eventsCount, 0);
    return {
      total: clients.length,
      activeCount: active.length,
      totalEvents,
      avgEvents: active.length ? totalEvents / active.length : 0,
    };
  }, [clients]);

  const topClientId = useMemo(() => {
    const withEvents = clients.filter((c) => c.eventsCount > 0);
    if (withEvents.length === 0) return null;
    return withEvents.reduce((top, c) => (c.eventsCount > top.eventsCount ? c : top), withEvents[0]).id;
  }, [clients]);

  function handleCreateClient(newClient: ClientRecord) {
    setClients((prev) => [newClient, ...prev]);
  }

  function handleDeleteClient(clientId: string) {
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    setSelected(null);
  }

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-cream/50">ממשק מנהל</p>
          <h1 className="font-display text-3xl text-cream">ניהול לקוחות</h1>
          <p className="mt-1 text-sm text-cream/45">מרכז לקוחות ותפעול · {currentMonthLabel()}</p>
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

      {loadError && (
        <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          שגיאה בטעינת רשימת הלקוחות מהשרת. רענן/י את הדף או פנה/י לתמיכה.
        </div>
      )}

      {/* Bento stat strip */}
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
          <CalendarRange className="h-5 w-5 text-[#D4FF00]" strokeWidth={1.8} aria-hidden="true" />
          <p className="mt-4 text-sm text-cream/50">סה&quot;כ אירועים עם לקוחות</p>
          <p className="relative mt-2 font-display text-5xl text-[#D4FF00] tabular-nums">
            {globals.totalEvents.toLocaleString("he-IL")}
          </p>
          <p className="mt-3 text-xs text-cream/40">נספר על פני כל הלקוחות, פעילים ומושהים כאחד.</p>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          custom={1}
          className="rounded-2xl border border-cream/10 bg-surface p-6 lg:col-span-3"
        >
          <Building2 className="h-5 w-5 text-[#4F46E5]" strokeWidth={1.8} aria-hidden="true" />
          <p className="mt-4 text-sm text-cream/50">לקוחות פעילים</p>
          <p className="mt-1 font-display text-4xl text-cream tabular-nums">{globals.activeCount}</p>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          custom={2}
          className="rounded-2xl border border-cream/10 bg-surface2 p-6 lg:col-span-4"
        >
          <p className="text-sm text-cream/50">סה&quot;כ לקוחות במערכת</p>
          <p className="mt-1 font-display text-4xl text-cream tabular-nums">{globals.total}</p>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          custom={3}
          className="rounded-2xl border border-cream/10 bg-surface2 p-6 lg:col-span-4"
        >
          <p className="text-sm text-cream/50">ממוצע אירועים ללקוח פעיל</p>
          <p className="mt-1 font-display text-4xl text-cream tabular-nums">
            {globals.avgEvents.toFixed(1)}
          </p>
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
            placeholder="חיפוש לפי שם לקוח, איש קשר או כתובת..."
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
                <CalendarRange className="h-3 w-3" aria-hidden="true" />
                הכי הרבה אירועים
              </span>
            )}

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#4F46E5]/15 font-display text-lg text-[#8b85f5]">
                {client.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-cream">{client.name}</p>
                {client.contactName && (
                  <p className="truncate text-xs text-cream/45">{client.contactName}</p>
                )}
              </div>
            </div>

            {client.status === "paused" && (
              <span className="mt-3 inline-flex rounded-md bg-cream/10 px-2 py-1 text-[10px] font-semibold text-cream/60">
                מושהה
              </span>
            )}

            {client.preferredRoles.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {client.preferredRoles.slice(0, 3).map((r, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-cream/5 px-2 py-1 text-[11px] font-medium text-cream/70"
                  >
                    {r.role} · ₪{r.rate}
                  </span>
                ))}
                {client.preferredRoles.length > 3 && (
                  <span className="rounded-md bg-cream/5 px-2 py-1 text-[11px] font-medium text-cream/50">
                    +{client.preferredRoles.length - 3}
                  </span>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-cream/10 pt-4 text-xs">
              {client.contactPhone && (
                <div className="flex items-center gap-1.5 text-cream/60">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-cream/35" aria-hidden="true" />
                  <span dir="ltr" className="truncate">
                    {client.contactPhone}
                  </span>
                </div>
              )}
              {client.dressCode && (
                <div className="flex items-center gap-1.5 text-cream/60">
                  <Shirt className="h-3.5 w-3.5 shrink-0 text-cream/35" aria-hidden="true" />
                  <span className="truncate">{client.dressCode}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-cream/40">
              <span className="inline-flex items-center gap-1">
                <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                {client.eventsCount} אירועים
                {client.notes && <StickyNote className="ms-1.5 h-3.5 w-3.5 text-cream/30" aria-hidden="true" />}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-[#4F46E5] opacity-0 transition-opacity group-hover:opacity-100">
                פרטי לקוח
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
          </motion.button>
        ))}

        {filtered.length === 0 && !loadError && (
          <div className="col-span-full rounded-2xl border border-dashed border-cream/15 px-4 py-14 text-center text-sm text-cream/45">
            {clients.length === 0 ? "עדיין לא נוספו לקוחות. לחצ/י על \"לקוח חדש\" כדי להתחיל." : "לא נמצאו לקוחות התואמים את החיפוש."}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <ClientDetailDrawer client={selected} onClose={() => setSelected(null)} onDeleted={handleDeleteClient} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {addOpen && <AddClientDialog onClose={() => setAddOpen(false)} onCreated={handleCreateClient} />}
      </AnimatePresence>
    </div>
  );
}