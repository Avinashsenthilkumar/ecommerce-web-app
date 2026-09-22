"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { callApi } from "@/lib/client/api";

/** A button that asks for a short reason before posting (reject / suspend). */
export function ReasonAction({ url, action, label, placeholder, variant = "danger" }: { url: string; action: string; label: string; placeholder: string; variant?: "danger" | "outline" }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={clsx(`btn-${variant}`, "btn-sm")}>{label}</button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await callApi(url, "POST", { action, reason });
      setOpen(false);
      start(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[20rem]">
      <input autoFocus className="input h-10" placeholder={placeholder} value={reason} onChange={(e) => setReason(e.target.value)} aria-label={placeholder} />
      <div className="flex gap-2">
        <button disabled={busy || reason.trim().length < 5} className={clsx(`btn-${variant}`, "btn-sm")}>{busy ? "Saving…" : `Confirm ${label.toLowerCase()}`}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">Cancel</button>
      </div>
      {error && <p className="text-xs text-sale">{error}</p>}
    </form>
  );
}
