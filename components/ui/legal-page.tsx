import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_UPDATED_LABEL } from "@/lib/legal";

/** Shared frame for /privacy, /terms and /accessibility: readable measure, real headings, back link. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/" className="text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink">
        חזרה לדף הבית
      </Link>
      <h1 className="mt-6 font-display text-4xl font-black text-ink">{title}</h1>
      <p className="mt-2 text-sm text-muted">עדכון אחרון: {LEGAL_UPDATED_LABEL}</p>
      <div className="mt-10 space-y-8 leading-relaxed text-ink [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:ps-5">
        {children}
      </div>
      <LegalLinks className="mt-16 border-t border-line pt-6" />
    </main>
  );
}

/** Footer links to the legal pages; reused on the landing, login and register screens. */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="מידע משפטי" className={`flex flex-wrap gap-x-5 gap-y-2 text-sm ${className}`}>
      <Link href="/terms" className="underline underline-offset-4 hover:no-underline">תנאי שימוש</Link>
      <Link href="/privacy" className="underline underline-offset-4 hover:no-underline">מדיניות פרטיות</Link>
      <Link href="/accessibility" className="underline underline-offset-4 hover:no-underline">הצהרת נגישות</Link>
    </nav>
  );
}
