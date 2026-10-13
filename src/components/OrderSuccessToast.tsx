"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

export function OrderSuccessToast() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-pine/20 bg-white p-4 shadow-lg sm:right-6 sm:top-6"
    >
      <CheckCircle2 size={21} className="mt-0.5 shrink-0 text-pine" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">Order placed successfully</p>
        <p className="mt-0.5 text-sm text-slate">We&apos;ll keep you updated as it moves toward you.</p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="icon-btn h-8 w-8 shrink-0"
        aria-label="Dismiss order confirmation"
      >
        <X size={15} aria-hidden />
      </button>
    </div>
  );
}
