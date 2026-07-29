"use client";

import { useState, useTransition, type FormEvent } from "react";
import { motion } from "framer-motion";
import { X, Building2, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/app/admin/clients/actions";
import type { ClientRecord, PreferredRole } from "@/lib/admin/clients-data";

const inputClass =
  "w-full rounded-xl border border-cream/15 bg-surface2 px-3.5 py-2.5 text-sm text-cream outline-none transition-colors focus:border-[#4F46E5]";
const labelClass = "mb-1 block text-xs font-medium text-cream/60";

// פתרון לשגיאת crypto.randomUUID() - פונקציה פשוטה ובטוחה ליצירת מזהה ייחודי
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

type RoleRow = PreferredRole & { key: string };
type ContactRow = { key: string; name: string; phone: string };

function emptyRoleRow(): RoleRow {
  return { key: generateId(), role: "", rate: 0 };
}

function emptyContactRow(): ContactRow {
  return { key: generateId(), name: "", phone: "" };
}

export function AddClientDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (client: ClientRecord) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // שדות טקסט בסיסיים
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  
  // שדות מספריים להגדרות חיוב
  const [overtimeThreshold, setOvertimeThreshold] = useState<number | "">("");
  const [minBillable, setMinBillable] = useState<number | "">("");

  // רשימות דינמיות
  const [contacts, setContacts] = useState<ContactRow[]>([emptyContactRow()]);
  const [roles, setRoles] = useState<RoleRow[]>([emptyRoleRow()]);

  // ניהול אנשי קשר
  function updateContact(key: string, patch: Partial<ContactRow>) {
    setContacts((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }
  function addContactRow() {
    setContacts((prev) => [...prev, emptyContactRow()]);
  }
  function removeContactRow(key: string) {
    setContacts((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev));
  }

  // ניהול תפקידים
  function updateRole(key: string, patch: Partial<RoleRow>) {
    setRoles((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRoleRow() {
    setRoles((prev) => [...prev, emptyRoleRow()]);
  }
  function removeRoleRow(key: string) {
    setRoles((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("יש למלא שם לקוח.");
      return;
    }

    startTransition(async () => {
      // סינון שורות ריקות מאנשי קשר ותפקידים כדי לא לשלוח סתם זבל ל-DB
      const filteredContacts = contacts
        .filter((c) => c.name.trim() || c.phone.trim())
        .map(({ name, phone }) => ({ name, phone }));
        
      const filteredRoles = roles
        .filter((r) => r.role.trim())
        .map(({ role, rate }) => ({ role, rate }));

      const result = await createClient({
        name,
        industry,
        companyId,
        address,
        notes,
        overtimeThresholdHours: overtimeThreshold === "" ? undefined : Number(overtimeThreshold),
        minBillableHours: minBillable === "" ? undefined : Number(minBillable),
        contacts: filteredContacts,
        preferredRoles: filteredRoles,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onCreated(result.client);
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

        <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto p-6">
          {error && (
            <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              {error}
            </div>
          )}

          {/* מידע כללי */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
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
                  תעשייה / תחום
                </label>
                <input
                  id="cl-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className={inputClass}
                  placeholder="למשל: אירועים, מלונאות"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="cl-companyid">
                  ח.פ / ת.ז חברה
                </label>
                <input
                  id="cl-companyid"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className={inputClass}
                  placeholder="מספר תאגיד"
                />
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
                  placeholder="עיר, רחוב"
                />
              </div>
            </div>
          </div>

          <hr className="border-cream/5" />

          {/* אנשי קשר - שורות דינמיות */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className={labelClass + " mb-0"}>אנשי קשר</span>
              <button
                type="button"
                onClick={addContactRow}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#8b85f5] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                הוספת איש קשר
              </button>
            </div>
            <div className="space-y-2">
              {contacts.map((row) => (
                <div key={row.key} className="flex items-center gap-2">
                  <input
                    value={row.name}
                    onChange={(e) => updateContact(row.key, { name: e.target.value })}
                    className={inputClass}
                    placeholder="שם איש קשר"
                  />
                  <input
                    dir="ltr"
                    value={row.phone}
                    onChange={(e) => updateContact(row.key, { phone: e.target.value })}
                    className={inputClass + " w-36 shrink-0"}
                    placeholder="050-0000000"
                  />
                  <button
                    type="button"
                    onClick={() => removeContactRow(row.key)}
                    disabled={contacts.length === 1}
                    aria-label="הסרת איש קשר"
                    className="shrink-0 rounded-lg p-2 text-cream/40 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-cream/5" />

          {/* הגדרות כספים וחיוב */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="cl-overtime">
                סף שעות נוספות
              </label>
              <div className="relative">
                <input
                  id="cl-overtime"
                  type="number"
                  min="0"
                  step="0.5"
                  value={overtimeThreshold}
                  onChange={(e) => setOvertimeThreshold(e.target.value ? Number(e.target.value) : "")}
                  className={inputClass + " pe-8"}
                  placeholder="8.5"
                />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-cream/40">
                 hello
                </span>
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="cl-minbill">
                מינימום לחיוב משמרת
              </label>
              <div className="relative">
                <input
                  id="cl-minbill"
                  type="number"
                  min="0"
                  step="0.5"
                  value={minBillable}
                  onChange={(e) => setMinBillable(e.target.value ? Number(e.target.value) : "")}
                  className={inputClass + " pe-8"}
                  placeholder="4"
                />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-cream/40">
                  hello
                </span>
              </div>
            </div>
          </div>

          <hr className="border-cream/5" />

          {/* תפקידים ותעריפים - שורות דינמיות */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className={labelClass + " mb-0"}>תפקידים מועדפים ותעריף</span>
              <button
                type="button"
                onClick={addRoleRow}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#8b85f5] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                הוספת תפקיד
              </button>
            </div>
            <div className="space-y-2">
              {roles.map((row) => (
                <div key={row.key} className="flex items-center gap-2">
                  <input
                    value={row.role}
                    onChange={(e) => updateRole(row.key, { role: e.target.value })}
                    className={inputClass}
                    placeholder="תפקיד, למשל: ברמן"
                  />
                  <div className="relative w-28 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={row.rate || ""}
                      onChange={(e) => updateRole(row.key, { rate: Number(e.target.value) })}
                      className={inputClass + " pe-8"}
                      placeholder="0"
                    />
                    <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-cream/40">
                      ₪/ש
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRoleRow(row.key)}
                    disabled={roles.length === 1}
                    aria-label="הסרת תפקיד"
                    className="shrink-0 rounded-lg p-2 text-cream/40 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="cl-notes">
              הערות הלקוח / דברים לשים לב אליהם
            </label>
            <textarea
              id="cl-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass + " resize-none"}
              placeholder="למשל: אין להזמין עובדים חדשים ללא ניסיון קודם באירוח"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-4 w-full rounded-full bg-[#4F46E5] py-3 text-sm font-bold text-white shadow-[0_15px_35px_-12px_rgba(79,70,229,0.7)] transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "שומר..." : "שמירת לקוח"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}