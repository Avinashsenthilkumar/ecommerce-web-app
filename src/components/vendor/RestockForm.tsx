"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { callApi } from "@/lib/client/api";

export function RestockForm({ variantId, warehouses, defaultWarehouseId }: { variantId: string; warehouses: { id: string; name: string }[]; defaultWarehouseId?: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [wh, setWh] = useState(defaultWarehouseId ?? warehouses[0]?.id ?? "");
  const [qty, setQty] = useState("10");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await callApi<{ sku: string; added: number }>("/api/vendor/restock", "POST", { variantId, warehouseId: wh, quantity: Number(qty) });
      setMsg({ ok: true, text: `Added ${r.added} to ${r.sku}.` });
      start(() => router.refresh());
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <select className="input w-auto py-1.5 text-xs" value={wh} onChange={(e) => setWh(e.target.value)} aria-label="Warehouse">
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>
      <input className="input w-20 py-1.5 text-xs tabular" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} aria-label="Units" />
      <button disabled={busy || !qty} className="btn-outline btn-sm">{busy ? "Adding…" : "Add stock"}</button>
      {msg && <span className={`text-xs font-medium ${msg.ok ? "text-pine" : "text-sale"}`}>{msg.text}</span>}
    </form>
  );
}
