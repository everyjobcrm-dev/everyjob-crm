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

  function handleUpdateClient(updated: ClientRecord) {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelected(updated);
  }

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">ניהול לקוחות</h1>
          <p className="mt-1 text-sm text-muted">מרכז לקוחות ותפעול · {currentMonthLabel()}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => exportClientsCsv(filtered)}
            className="btn btn-secondary"
          >
            <FileSpreadsheet className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            ייצוא לאקסל
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
            לקוח חדש
          </button>
        </div>
      </header>

      {loadError && (
        <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
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
          className="relative overflow-hidden rounded-lg border border-sky bg-surface p-6 lg:col-span-5 lg:row-span-2"
        >
          <CalendarRange className="h-5 w-5 text-sky-deep" strokeWidth={1.8} aria-hidden="true" />
          <p className="mt-4 text-sm text-muted">סה&quot;כ אירועים עם לקוחות</p>
          <p className="relative mt-2 font-display text-5xl text-sky-deep tabular-nums">
            {globals.totalEvents.toLocaleString("he-IL")}
          </p>
          <p className="mt-3 text-xs text-muted">נספר על פני כל הלקוחות, פעילים ומושהים כאחד.</p>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          custom={1}
          className="card p-6 lg:col-span-3"
        >
          <Building2 className="h-5 w-5 text-primary-soft" strokeWidth={1.8} aria-hidden="true" />
          <p className="mt-4 text-sm text-muted">לקוחות פעילים</p>
          <p className="mt-1 font-display text-4xl text-ink tabular-nums">{globals.activeCount}</p>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          custom={2}
          className="rounded-lg border border-line bg-surface2 p-6 lg:col-span-4"
        >
          <p className="text-sm text-muted">סה&quot;כ לקוחות במערכת</p>
          <p className="mt-1 font-display text-4xl text-ink tabular-nums">{globals.total}</p>
        </motion.div>

        <motion.div
          variants={tileVariants}
          initial="hidden"
          animate="show"
          custom={3}
          className="rounded-lg border border-line bg-surface2 p-6 lg:col-span-4"
        >
          <p className="text-sm text-muted">ממוצע אירועים ללקוח פעיל</p>
          <p className="mt-1 font-display text-4xl text-ink tabular-nums">
            {globals.avgEvents.toFixed(1)}
          </p>
        </motion.div>
      </div>

      {/* Toolbar */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם לקוח, איש קשר או כתובת..."
            className="w-full rounded-md border border-ink/12 bg-surface py-2.5 ps-10 pe-4 text-sm text-ink outline-none transition-colors focus:border-primary"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          מיון לפי
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-md border border-ink/12 bg-surface px-3.5 py-2 text-sm font-semibold text-ink outline-none focus:border-primary"
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
            className={`group relative overflow-hidden rounded-lg border p-5 text-start transition-all hover:-translate-y-0.5 ${
              client.id === topClientId
                ? "border-sky bg-surface shadow-pop"
                : "border-line bg-surface hover:border-primary/40 hover:shadow-pop"
            } ${client.status === "paused" ? "opacity-60" : ""}`}
          >
            {client.id === topClientId && (
              <span className="absolute end-4 top-4 inline-flex items-center gap-1 rounded-md bg-sky/25 px-2 py-1 text-[10px] font-bold text-sky-deep">
                <CalendarRange className="h-3 w-3" aria-hidden="true" />
                הכי הרבה אירועים
              </span>
            )}

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink/15 font-display text-lg text-primary-soft">
                {client.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{client.name}</p>
                {client.contactName && (
                  <p className="truncate text-xs text-muted">{client.contactName}</p>
                )}
              </div>
            </div>

            {client.status === "paused" && (
              <span className="mt-3 inline-flex rounded-md bg-ink/10 px-2 py-1 text-[10px] font-semibold text-muted">
                מושהה
              </span>
            )}

            {client.preferredRoles.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {client.preferredRoles.slice(0, 3).map((r, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-ink/5 px-2 py-1 text-[11px] font-medium text-ink/80"
                  >
                    {r.role} · ₪{r.rate}
                  </span>
                ))}
                {client.preferredRoles.length > 3 && (
                  <span className="rounded-md bg-ink/5 px-2 py-1 text-[11px] font-medium text-muted">
                    +{client.preferredRoles.length - 3}
                  </span>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 text-xs">
              {client.contactPhone && (
                <div className="flex items-center gap-1.5 text-muted">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                  <span dir="ltr" className="truncate">
                    {client.contactPhone}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                {client.eventsCount} אירועים
                {client.notes && <StickyNote className="ms-1.5 h-3.5 w-3.5 text-muted" aria-hidden="true" />}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-primary-soft opacity-0 transition-opacity group-hover:opacity-100">
                פרטי לקוח
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
          </motion.button>
        ))}

        {filtered.length === 0 && !loadError && (
          <div className="col-span-full rounded-lg border border-dashed border-line px-4 py-14 text-center text-sm text-muted">
            {clients.length === 0 ? "עדיין לא נוספו לקוחות. לחצ/י על \"לקוח חדש\" כדי להתחיל." : "לא נמצאו לקוחות התואמים את החיפוש."}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <ClientDetailDrawer
            client={selected}
            onClose={() => setSelected(null)}
            onDeleted={handleDeleteClient}
            onUpdated={handleUpdateClient}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {addOpen && <AddClientDialog onClose={() => setAddOpen(false)} onCreated={handleCreateClient} />}
      </AnimatePresence>
    </div>
  );
}