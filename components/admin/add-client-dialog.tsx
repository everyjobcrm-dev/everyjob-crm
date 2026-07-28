"use client";

import { useState, useTransition, type FormEvent } from "react";
import { motion } from "framer-motion";
import { X, Building2 } from "lucide-react";
import { createClient } from "@/app/admin/clients/actions";
import type { ClientRecord } from "@/lib/admin/clients-data";

const inputClass =
  "w-full rounded-xl border border-cream/15 bg-surface2 px-3.5 py-2.5 text-sm text-cream outline-none transition-colors focus:border-[#4F46E5]";
const labelClass = "mb-1 block text-xs font-medium text-cream/60";

export function AddClientDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (client: ClientRecord) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [hourlyRate, setHourlyRate] = useState("55");
  const [bonusPct, setBonusPct] = useState("8");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("יש למלא שם לקוח.");
      return;
    }

    const newClient: ClientRecord = {
      id: `c-${Date.now()}`,
      name: name.trim(),
      industry: industry.trim() || "כללי",
      contactName: contactName.trim() || "—",
      contactPhone: contactPhone.trim() || "—",
      address: address.trim() || "—",
      hourlyRate: Number(hourlyRate) || 0,
      bonusPct: (Number(bonusPct) || 0) / 100,
      status: "active",
      shifts: [],
    };

    startTransition(async () => {
      // Optimistic add so the page stays useful even before the `clients`
      // table exists — the server action persists it when the schema is live.
      onCreated(newClient);
      try {
        const result = await createClient({
          name: newClient.name,
          industry: newClient.industry,
          contactName: newClient.contactName,
          contactPhone: newClient.contactPhone,
          address: newClient.address,
          hourlyRate: newClient.hourlyRate,
          bonusPct: newClient.bonusPct,
        });
        if (!result.success) {
          console.warn("createClient action failed (page already updated locally):", result.error);
        }
      } catch (err) {
        console.warn("createClient action threw (page already updated locally):", err);
      }
      onClose();
    });
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="add-client-title" className="fixed inset-0 z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-y-0 end-0 flex h-full w-full max-w-md flex-col border-s border-cream/10 bg-obsidian shadow-[0_0_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between border-b border-cream/10 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4F46E5]/15 text-[#8b85f5]">
              <Building2 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h2 id="add-client-title" className="font-display text-xl text-cream">
              לקוח חדש
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-full p-2 text-cream/50 hover:bg-cream/5 hover:text-cream"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
          {error && (
            <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label className={labelClass} htmlFor="cl-name">
              שם הלקוח *
            </label>
            <input
              id="cl-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="למשל: מלון הוד הים"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="cl-industry">
              תחום
            </label>
            <input
              id="cl-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className={inputClass}
              placeholder="אירוח, אירועים, קמעונאות..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="cl-contact">
                איש קשר
              </label>
              <input
                id="cl-contact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="cl-phone">
                טלפון
              </label>
              <input
                id="cl-phone"
                dir="ltr"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={inputClass}
                placeholder="050-0000000"
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="cl-address">
              כתובת
            </label>
            <input
              id="cl-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="cl-rate">
                תעריף שעתי בסיסי (₪)
              </label>
              <input
                id="cl-rate"
                type="number"
                min="0"
                step="0.5"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="cl-bonus">
                בונוס מגייסים (%)
              </label>
              <input
                id="cl-bonus"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={bonusPct}
                onChange={(e) => setBonusPct(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-full bg-[#4F46E5] py-3 text-sm font-bold text-white shadow-[0_15px_35px_-12px_rgba(79,70,229,0.7)] transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "שומר..." : "שמירת לקוח"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}