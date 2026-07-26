"use client";

import { motion } from "framer-motion";
import { TicketPass } from "@/components/TicketPass";

export function ClosingCTA() {
  return (
    <section className="relative overflow-hidden bg-obsidian py-32">
      {/* faint radial glow, echoes the hero spotlight without repeating it verbatim */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px circle at 50% 30%, rgba(201,161,91,0.12), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-brass"
        >
          הכרטיס שלכם מחכה
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-4xl leading-tight text-cream sm:text-5xl"
        >
          שתי דקות היום.
          <br />
          <span className="text-cream/50">משמרת ראשונה השבוע.</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 0 }}
          whileInView={{ opacity: 1, y: 0, rotate: -2 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 w-full max-w-sm"
        >
          <TicketPass
            eyebrow="EveryJob · חבר/ה"
            title="הכרטיס האישי שלך"
            subtitle="גישה מיידית ללוח המשמרות המלא"
            tilt={-2}
            stub={
              <>
                <span className="text-[10px] uppercase tracking-widest text-brass">
                  תוקף
                </span>
                <span className="font-display text-sm font-bold text-cream">
                  ללא הגבלה
                </span>
              </>
            }
          />
        </motion.div>

        <motion.a
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          href="/register"
          className="mt-12 rounded-full bg-brass px-10 py-4 text-sm font-bold text-obsidian transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          קבלו את הכרטיס שלכם
        </motion.a>

        <p className="mt-5 text-xs text-cream/40">
          ללא עלות הצטרפות. ללא התחייבות למשמרת קבועה.
        </p>
      </div>
    </section>
  );
}
