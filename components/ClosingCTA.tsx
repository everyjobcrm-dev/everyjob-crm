"use client";

import { motion } from "framer-motion";
import { LampContainer } from "@/components/ui/lamp";
import { HandWrittenTitle } from "@/components/ui/hand-writing-text";
import { ShiftCard } from "@/components/ShiftCard";

export function ClosingCTA() {
  return (
    <LampContainer className="pb-24 pt-0">
      <HandWrittenTitle
        title="המשמרת הבאה שלכם"
        subtitle="מחכה לצ׳ק-אין"
        strokeClassName="text-brass/50"
        titleClassName="text-cream"
        subtitleClassName="text-cream/60"
      />

      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <ShiftCard />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mt-8 h-px w-16 hairline-gold-dark"
        aria-hidden
      />

      <motion.a
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ boxShadow: "0 0 0 8px rgba(201,161,91,0.18)" }}
        transition={{ duration: 0.7, delay: 0.65 }}
        href="/register"
        className="mt-6 rounded-full bg-brass px-10 py-4 text-sm font-bold text-obsidian transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        התחילו את המשמרת הראשונה שלכם!
      </motion.a>

      
    </LampContainer>
  );
} 