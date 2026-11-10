"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type SplitAuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  error?: string | null;
  success?: string | null;
};

const ease = [0.16, 1, 0.3, 1] as const;

/** Auth layout: the brand panel (sun disc, cuffs, a real team member pointing at the form) beside the form. */
export function SplitAuthShell({ title, subtitle, children, error, success }: SplitAuthShellProps) {
  return (
    <div className="grid min-h-screen bg-canvas text-ink md:grid-cols-2">
      <aside className="sticky top-3 m-3 hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-[2rem] bg-sun md:block" aria-hidden="true">
        <div className="absolute -start-[18%] top-[16%] aspect-square w-[136%] animate-spin-slow rounded-full border-[3px] border-dotted border-ink/25" />
        <motion.span
          initial={{ x: 60, opacity: 0, rotate: -40 }}
          animate={{ x: 0, opacity: 1, rotate: -14 }}
          transition={{ duration: 0.9, delay: 0.3, ease }}
          className="absolute end-[8%] top-[38%] flex h-14 w-40 items-center rounded-2xl bg-sky ps-3"
        >
          <span className="h-2 w-2 rounded-full bg-ink/70" />
        </motion.span>
        <motion.span
          initial={{ x: -60, opacity: 0, rotate: 40 }}
          animate={{ x: 0, opacity: 1, rotate: 12 }}
          transition={{ duration: 0.9, delay: 0.4, ease }}
          className="absolute bottom-[16%] start-[6%] flex h-14 w-36 items-center rounded-2xl bg-pink ps-3"
        >
          <span className="h-2 w-2 rounded-full bg-ink/70" />
        </motion.span>

        <div className="relative z-10 p-10 xl:p-14">
          <h1 className="max-w-md font-display text-5xl font-black leading-[1.05] xl:text-6xl">
            ברוכים הבאים לאנשים טובים 770
          </h1>
          <p className="mt-4 max-w-sm text-lg leading-8 text-ink/75">
            חברת כוח אדם המספקת עבודות מזדמנות ביעילות ובמהירות.
          </p>
        </div>

        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease }}
          className="absolute inset-x-0 bottom-0 h-[58%]"
        >
          <Image src="/images/tamarImage2.png" alt="" fill priority sizes="50vw" className="object-contain object-bottom" />
        </motion.div>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" aria-label="everyJob - דף הבית" className="self-start">
          <Image
            src="/images/everyJob-logo.png"
            alt="everyJob"
            width={738}
            height={411}
            priority
            className="h-12 w-auto mix-blend-multiply"
          />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="m-auto w-full max-w-md py-10"
        >
          <h2 className="font-display text-4xl font-black sm:text-5xl">{title}</h2>
          <p className="mt-3 leading-7 text-muted">{subtitle}</p>

          <div className="mt-8">
            {error ? (
              <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div role="status" className="mb-5 rounded-lg border border-sky bg-sky/20 px-4 py-3 text-sm text-sky-deep">
                {success}
              </div>
            ) : null}
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
