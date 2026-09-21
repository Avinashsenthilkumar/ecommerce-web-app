"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { callApi } from "@/lib/client/api";

type Props = {
  url: string;
  body?: unknown;
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "pine" | "outline" | "danger";
  size?: "sm" | "md";
  confirmText?: string;
  className?: string;
};

/** Posts to an API route, then refreshes server data. Errors show inline. */
export function ActionButton({ url, body = {}, label, pendingLabel, variant = "primary", size = "sm", confirmText, className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, start] = useTransition();

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError("");
    try {
      await callApi(url, "POST", body);
      start(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={clsx(`btn-${variant}`, size === "sm" && "btn-sm", className)}
      >
        {busy ? pendingLabel ?? "Working…" : label}
      </button>
      {error && <span className="max-w-xs text-xs font-medium text-sale">{error}</span>}
    </span>
  );
}
