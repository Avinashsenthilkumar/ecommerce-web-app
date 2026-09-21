"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { callApi } from "@/lib/client/api";

type Opt = { id: string; name: string };

export function NewProductForm({ categories, warehouses }: { categories: Opt[]; warehouses: Opt[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: "",
    brandName: "",
    categoryId: categories[0]?.id ?? "",
    shortDescription: "",
    description: "",
    mrp: "",
    sellingPrice: "",
    imageUrl: "",
    skuPrefix: "",
    warehouseId: warehouses[0]?.id ?? "",
    variants: "S:10, M:10, L:10",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const variants = f.variants
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const [label, stock] = s.split(":").map((x) => x.trim());
          return { label, stock: Number(stock ?? 0) || 0 };
        });
      const r = await callApi<{ slug: string }>("/api/vendor/products", "POST", {
        ...f,
        mrp: Number(f.mrp),
        sellingPrice: Number(f.sellingPrice),
        variants,
      });
      setDone(r.slug);
      setOpen(false);
      start(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        {done && (
          <a href={`/product/${done}`} className="text-xs font-semibold text-pine underline">View new listing</a>
        )}
        <button type="button" onClick={() => setOpen(true)} className="btn-primary btn-sm">List a new product</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full space-y-4 border-t border-line bg-mist/40 p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="label" htmlFor="np-name">Product name</label>
          <input id="np-name" className="input" value={f.name} onChange={set("name")} required />
        </div>
        <div>
          <label className="label" htmlFor="np-brand">Brand</label>
          <input id="np-brand" className="input" value={f.brandName} onChange={set("brandName")} required />
        </div>
        <div>
          <label className="label" htmlFor="np-cat">Category</label>
          <select id="np-cat" className="input" value={f.categoryId} onChange={set("categoryId")}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="np-mrp">MRP (₹)</label>
          <input id="np-mrp" className="input tabular" inputMode="numeric" value={f.mrp} onChange={set("mrp")} required />
        </div>
        <div>
          <label className="label" htmlFor="np-price">Selling price (₹)</label>
          <input id="np-price" className="input tabular" inputMode="numeric" value={f.sellingPrice} onChange={set("sellingPrice")} required />
        </div>
        <div className="md:col-span-3">
          <label className="label" htmlFor="np-short">One-line description</label>
          <input id="np-short" className="input" value={f.shortDescription} onChange={set("shortDescription")} required maxLength={160} />
        </div>
        <div className="md:col-span-3">
          <label className="label" htmlFor="np-desc">Full description</label>
          <textarea id="np-desc" className="input min-h-[90px]" value={f.description} onChange={set("description")} required />
        </div>
        <div>
          <label className="label" htmlFor="np-sku">SKU prefix</label>
          <input id="np-sku" className="input uppercase tabular" placeholder="ABC-TEE" value={f.skuPrefix} onChange={set("skuPrefix")} required />
        </div>
        <div>
          <label className="label" htmlFor="np-wh">Stock at</label>
          <select id="np-wh" className="input" value={f.warehouseId} onChange={set("warehouseId")}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="np-img">Image URL (optional)</label>
          <input id="np-img" className="input" placeholder="/products/my-item.jpg" value={f.imageUrl} onChange={set("imageUrl")} />
        </div>
        <div className="md:col-span-3">
          <label className="label" htmlFor="np-var">Variants and opening stock</label>
          <input id="np-var" className="input tabular" value={f.variants} onChange={set("variants")} required />
          <p className="mt-1 text-xs text-slate">Format: label:units, separated by commas. Example: UK 8:12, UK 9:15</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={busy} className="btn-primary">{busy ? "Publishing…" : "Publish product"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
      </div>
      {error && <p className="text-sm font-medium text-sale">{error}</p>}
    </form>
  );
}
