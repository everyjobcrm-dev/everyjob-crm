"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

/**
 * TicketPass — the signature element of the EveryJob visual system.
 * A die-cut boarding-pass / ticket-stub card: perforated seam, torn-edge
 * notches, barcode rule. Used for shift previews (hero), earnings summaries
 * (value props), and as the frame for the login/register card.
 */
export function TicketPass({
  eyebrow,
  title,
  subtitle,
  stub,
  children,
  className = "",
  tilt = -3,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  stub?: ReactNode; // right-hand torn-off stub content (e.g. wage, time)
  children?: ReactNode;
  className?: string;
  tilt?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ rotate: 0, y: -4 }}
      className={`relative flex overflow-hidden rounded-2xl border border-brass/25 bg-surface shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] ${className}`}
      style={{ transformOrigin: "center" }}
    >
      {/* main panel */}
      <div className="flex-1 p-6 sm:p-8">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
            {eyebrow}
          </p>
        )}
        <h3 className="font-display text-2xl leading-tight text-cream sm:text-3xl">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-2 text-sm text-cream/60">{subtitle}</p>
        )}
        {children}
      </div>

      {/* perforated seam */}
      {stub && (
        <>
          <div
            className="ticket-notch relative w-0"
            style={{ ["--notch-bg" as string]: "#16151A" }}
          />
          <div className="perforation w-px shrink-0" />

          {/* torn stub */}
          <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-2 bg-surface2 p-3 sm:w-28">
            {stub}
          </div>
        </>
      )}
    </motion.div>
  );
}
