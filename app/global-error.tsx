"use client";

// Last resort when the root layout itself fails: no app CSS is guaranteed here, so styles are inline.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", maxWidth: "36rem", margin: "0 auto" }}>
        <h1>משהו השתבש</h1>
        <p>המערכת אינה זמינה כרגע. נסו לרענן את הדף בעוד מספר דקות.</p>
        <button type="button" onClick={reset} style={{ marginTop: "1.5rem", padding: "0.75rem 1.25rem" }}>
          נסה/י שוב
        </button>
      </body>
    </html>
  );
}
