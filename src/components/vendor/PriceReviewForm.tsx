"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { callApi } from "@/lib/client/api";

export function PriceReviewForm({
  productId,
  mrp,
  sellingPrice,
}: {
  productId: string;
  mrp: number;
  sellingPrice: number;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [values, setValues] = useState({ mrp: String(mrp), sellingPrice: String(sellingPrice) });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await callApi(`/api/vendor/products/${productId}`, "PATCH", {
        mrp: Number(values.mrp),
        sellingPrice: Number(values.sellingPrice),
      });
      start(() => router.refresh());
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2">
      <label className="text-xs text-slate">
        MRP
        <input
          className="input mt-1 w-24 py-1.5 text-xs tabular"
          type="number"
          min={1}
          required
          value={values.mrp}
          onChange={(event) => setValues((current) => ({ ...current, mrp: event.target.value }))}
        />
      </label>
      <label className="text-xs text-slate">
        Selling price
        <input
          className="input mt-1 w-28 py-1.5 text-xs tabular"
          type="number"
          min={1}
          required
          value={values.sellingPrice}
          onChange={(event) => setValues((current) => ({ ...current, sellingPrice: event.target.value }))}
        />
      </label>
      <button disabled={busy} className="btn-outline btn-sm">
        {busy ? "Submitting…" : "Submit for review"}
      </button>
      {error && <span role="alert" className="w-full text-xs text-sale">{error}</span>}
      <p className="w-full text-xs text-slate">
        A price change is held for admin approval before the listing is live again.
      </p>
    </form>
  );
}
