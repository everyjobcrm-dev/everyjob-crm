"use client";

import Image from "next/image";
import { motion } from "framer-motion";
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
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <motion.section
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative hidden overflow-hidden md:flex md:min-h-screen md:w-[44%]"
        >
          <Image
            src="/images/tamarImage.png"
            alt="עבודה מקצועית"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/35 to-slate-100/70" />

          <div className="relative z-10 flex h-full w-full flex-col justify-between p-8 xl:p-10">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur">
                <Image src="/images/everyJob-logo.png" alt="everyJob logo" width={42} height={42} className="h-10 w-10 object-contain" />
              </div>
              <span className="text-sm font-semibold tracking-[0.2em] text-slate-700">everyJob</span>
            </div>

            <div className="max-w-lg">
              <p className="text-sm font-semibold tracking-[0.25em] text-slate-600">everyJob</p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                ברוכים הבאים לאנשים טובים 770
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-700">
                חברת כוח אדם המספקת עבודות מזדמנות ביעילות ובמהירות.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600 shadow-sm backdrop-blur">
              <p className="font-medium text-slate-800">הצטרפו למערכת מהירה, בטוחה ונגישה.</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
          className="relative flex flex-1 items-center justify-center overflow-hidden bg-white px-4 py-6 sm:px-6 lg:px-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.08),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.08),_transparent_30%)]" />

          <div className="relative z-10 w-full max-w-md">
            <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 text-center shadow-sm md:hidden">
              <div className="mb-3 flex justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                  <Image src="/images/everyJob-logo.png" alt="everyJob logo" width={40} height={40} className="h-10 w-10 object-contain" />
                </div>
              </div>
              <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">everyJob</p>
            </div>

            <div className="mb-6 text-center md:text-right">
              <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{subtitle}</p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-7">
              {error ? (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
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
