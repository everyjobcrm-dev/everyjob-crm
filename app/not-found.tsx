import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "הדף לא נמצא" };

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-20">
      <p className="font-display text-7xl font-black text-pink-deep">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-ink">הדף שחיפשת לא נמצא</h1>
      <p className="mt-3 text-muted">ייתכן שהקישור שגוי או שהדף הועבר.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary">לדף הבית</Link>
        <Link href="/login" className="btn btn-secondary">כניסה למערכת</Link>
      </div>
    </main>
  );
}
