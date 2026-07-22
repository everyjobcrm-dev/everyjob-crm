"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type SplitAuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  error?: string | null;
  success?: string | null;
};

export function SplitAuthShell({ title, subtitle, children, error, success }: SplitAuthShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_50%,_#111827_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <motion.section
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative hidden overflow-hidden lg:flex lg:min-h-screen lg:w-[46%]"
        >
          <Image
            src="/images/tamarImage.png"
            alt="Elegant professional workspace"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-950/55 to-slate-950/75" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.2),_transparent_35%)]" />

          <div className="relative z-10 flex h-full w-full flex-col justify-between p-10 xl:p-14">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              EveryJob CRM
            </div>

            <div className="max-w-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200/80">Secure access</p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Welcome back to your premium team workspace.
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-200/90">
                Experience a sleek onboarding flow crafted for clarity, confidence, and fast progress.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Protected by modern auth
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                Built for fast-moving teams
              </span>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
          className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.16),_transparent_30%)]" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-8%] top-[-6%] h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute bottom-[-6%] right-[-4%] h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-md">
            <div className="mb-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-slate-300 backdrop-blur-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Secure sign-in experience
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400 sm:text-base">{subtitle}</p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5 shadow-[0_24px_90px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:p-7">
              {error ? (
                <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  {success}
                </div>
              ) : null}
              {children}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
