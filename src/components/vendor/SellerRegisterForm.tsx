"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { callApi } from "@/lib/client/api";

const FIELDS = [
  { k: "businessName", label: "Business / store name", type: "text", auto: "organization", wide: true },
  { k: "fullName", label: "Your name", type: "text", auto: "name" },
  { k: "phone", label: "Mobile number", type: "tel", auto: "tel" },
  { k: "email", label: "Business email", type: "email", auto: "email" },
  { k: "password", label: "Password (8+ characters)", type: "password", auto: "new-password" },
  { k: "gstin", label: "GSTIN (optional)", type: "text", auto: "off" },
] as const;

export function SellerRegisterForm() {
  const router = useRouter();
  const [f, setF] = useState({ businessName: "", fullName: "", phone: "", email: "", password: "", gstin: "", pickupAddress: "", storeDescription: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await callApi("/api/vendor/register", "POST", { ...f, gstin: f.gstin || undefined });
      router.replace("/vendor");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((x) => (
          <div key={x.k} className={"wide" in x && x.wide ? "sm:col-span-2" : ""}>
            <label className="label" htmlFor={`s-${x.k}`}>{x.label}</label>
            <input
              id={`s-${x.k}`}
              type={x.type}
              autoComplete={x.auto}
              className={`input ${x.k === "gstin" ? "uppercase" : ""}`}
              value={f[x.k]}
              onChange={(e) => setF({ ...f, [x.k]: e.target.value })}
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="s-pickup">Pickup address</label>
          <textarea id="s-pickup" className="input min-h-[76px]" value={f.pickupAddress} onChange={(e) => setF({ ...f, pickupAddress: e.target.value })} placeholder="Where our courier collects stock for the fulfilment centre" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="s-desc">What do you sell?</label>
          <textarea id="s-desc" className="input min-h-[76px]" value={f.storeDescription} onChange={(e) => setF({ ...f, storeDescription: e.target.value })} placeholder="Categories, brands, price range" />
        </div>
      </div>
      {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-sale">{error}</p>}
      <button disabled={busy} className="btn-primary h-12 w-full">{busy ? "Submitting…" : "Submit application"}</button>
      <p className="text-xs leading-relaxed text-slate">Our team reviews every application, usually within one working day. You can sign in any time to check the status.</p>
    </form>
  );
}
