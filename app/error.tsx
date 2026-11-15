"use client";

import { useEffect } from "react";
import Link from "next/link";

// Any uncaught render error inside the app: a Hebrew screen, never a stack trace.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-20">
      <h1 className="font-display text-3xl font-bold text-ink">משהו השתבש</h1>
      <p className="mt-3 text-muted">אירעה שגיאה בטעינת הדף. אפשר לנסות שוב, ואם הבעיה חוזרת לפנות לצוות.</p>
      {error.digest && <p className="mt-2 text-xs text-muted" dir="ltr">קוד שגיאה: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">נסה/י שוב</button>
        <Link href="/" className="btn btn-secondary">לדף הבית</Link>
      </div>
    </main>
  );
}
