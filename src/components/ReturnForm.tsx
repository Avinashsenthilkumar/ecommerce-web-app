"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { callApi } from "@/lib/client/api";

const REASONS = ["Size or fit issue", "Damaged or defective", "Wrong item received", "Not as described", "Changed my mind"];

export function ReturnForm({ orderItemId, maxQty }: { orderItemId: string; maxQty: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState(REASONS[0]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline btn-sm">
        Request return
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await callApi("/api/returns", "POST", { orderItemId, quantity: qty, reason, comment: comment || undefined });
      setOpen(false);
      start(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 w-full space-y-3 rounded-xl bg-mist p-4">
      <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
        <div>
          <label className="label" htmlFor={`q-${orderItemId}`}>Quantity</label>
          <select id={`q-${orderItemId}`} className="input" value={qty} onChange={(e) => setQty(Number(e.target.value))}>
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`r-${orderItemId}`}>Reason</label>
          <select id={`r-${orderItemId}`} className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      <textarea className="input min-h-[70px]" placeholder="Anything the pickup team should know (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="flex gap-2">
        <button disabled={busy} className="btn-primary btn-sm">{busy ? "Sending…" : "Send return request"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">Cancel</button>
      </div>
      {error && <p className="text-xs font-medium text-sale">{error}</p>}
    </form>
  );
}
