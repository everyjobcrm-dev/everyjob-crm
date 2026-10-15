"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal success toast (no library). Owned by a component that stays mounted across router.refresh(),
// so the message survives a row moving between sections. Announced politely to screen readers.
export function useToast(durationMs = 3500) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(text);
      timer.current = setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const toast = (
    <div aria-live="polite" role="status" className="pointer-events-none fixed bottom-24 start-4 z-50 lg:bottom-6">
      {message && (
        <p className="border-s-4 border-[#D4FF00] bg-surface2 px-4 py-2.5 text-sm font-medium text-cream shadow-lg">
          {message}
        </p>
      )}
    </div>
  );

  return { toast, show };
}
