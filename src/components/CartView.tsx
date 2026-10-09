"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Trash2 } from "lucide-react";
import { callApi } from "@/lib/client/api";
import { inr } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { AddressFields, emptyAddress, type AddressValue } from "./account/AddressFields";

export type CartLineView = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  label: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  mrp: number;
  quantity: number;
  stock: number;
};

type Totals = { subtotal: number; discountTotal: number; taxTotal: number; shippingFee: number; grandTotal: number; units: number };
type SavedAddress = AddressValue & { id: string; isDefault: boolean };

const PAYMENT_LABEL: Record<string, string> = { UPI: "UPI", CARD: "Card", NETBANKING: "Netbanking", COD: "Cash on delivery" };
type PaymentKey = "UPI" | "CARD" | "NETBANKING" | "COD";
type Rules = { discountPercent: number; gstPercent: number; paymentMethods: PaymentKey[] };

const pick = (a: SavedAddress): AddressValue => ({ name: a.name, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, state: a.state, pincode: a.pincode });

export function CartView({ lines, totals, addresses, userName, userPhone, rules }: { lines: CartLineView[]; totals: Totals; addresses: SavedAddress[]; userName: string; userPhone: string; rules: Rules }) {
  const router = useRouter();
  const [, start] = useTransition();
  const initial = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);
  const [addr, setAddr] = useState<AddressValue>(initial ? pick(initial) : emptyAddress(userName, userPhone));
  const [payment, setPayment] = useState<PaymentKey>(rules.paymentMethods[0] ?? "UPI");
  const [lineError, setLineError] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  async function lineAction(id: string, run: () => Promise<unknown>) {
    setLineError((e) => ({ ...e, [id]: "" }));
    try {
      await run();
      start(() => router.refresh());
    } catch (e) {
      setLineError((x) => ({ ...x, [id]: (e as Error).message }));
    }
  }
  const setQty = (id: string, quantity: number) => lineAction(id, () => callApi("/api/cart", "PATCH", { itemId: id, quantity }));
  const saveLater = (id: string) => lineAction(id, () => callApi("/api/cart/save", "POST", { itemId: id }));

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setPlacing(true);
    setError("");
    try {
      const res = await callApi<{ orderNumber: string }>("/api/orders", "POST", { address: addr, paymentMethod: payment });
      router.push(`/orders/${res.orderNumber}?placed=1`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPlacing(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center sm:py-24">
        <h1 className="h-display text-[2rem] sm:text-[3rem]">Your bag is empty</h1>
        <p className="mt-3 text-[15px] text-slate">Add something from any department and it will wait here.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/shop?category=all" className="btn-primary justify-center">Shop Now</Link>
          <Link href="/wishlist" className="btn-outline justify-center">View wishlist</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={placeOrder}>
      <h1 className="h-display text-[2.2rem] leading-none sm:text-[3rem]">Your bag</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          {/* Items */}
          <section className="panel overflow-hidden">
            <header className="border-b border-line px-5 py-5">
              <h2 className="text-sm font-medium">Items</h2>
              <p className="text-xs text-slate">{totals.units} in bag</p>
            </header>
            <ul className="divide-y divide-line">
              {lines.map((l) => (
                <li key={l.id} className="flex gap-4 px-5 py-5">
                  <Link href={`/product/${l.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-[18px] border border-line bg-mist">
                    <ProductImage src={l.image} alt={l.name} className="h-full w-full" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-4">
                      <div className="min-w-0">
                        <p className="eyebrow">{l.brand}</p>
                        <Link href={`/product/${l.slug}`} className="mt-1 block text-[15px] hover:underline">{l.name}</Link>
                        <p className="mt-0.5 text-xs text-slate">{l.label} · {l.sku}</p>
                      </div>
                      <p className="shrink-0 text-[15px] tabular">{inr(l.unitPrice * l.quantity)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <div className="inline-flex h-9 items-center rounded-full border border-line bg-white px-1">
                        <button type="button" onClick={() => setQty(l.id, l.quantity - 1)} className="h-7 w-7 rounded-full leading-none hover:bg-mist" aria-label="Decrease">−</button>
                        <span className="w-6 text-center text-sm tabular">{l.quantity}</span>
                        <button type="button" onClick={() => setQty(l.id, l.quantity + 1)} disabled={l.quantity >= l.stock} className="h-7 w-7 rounded-full leading-none hover:bg-mist disabled:opacity-40" aria-label="Increase">+</button>
                      </div>
                      <button type="button" onClick={() => saveLater(l.id)} className="text-xs text-slate hover:text-ink">Save for later</button>
                      <button type="button" onClick={() => setQty(l.id, 0)} className="text-slate hover:text-sale" aria-label={`Remove ${l.name}`}>
                        <Trash2 size={15} />
                      </button>
                      {l.stock <= 8 && <span className="text-xs text-amber">Only {l.stock} left</span>}
                    </div>
                    {lineError[l.id] && <p className="mt-2 text-xs text-sale">{lineError[l.id]}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Delivery address */}
          <section className="panel overflow-hidden">
            <header className="border-b border-line px-5 py-5">
              <h2 className="text-sm font-medium">Delivery address</h2>
            </header>
            <div className="space-y-6 px-5 py-6">
              {addresses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {addresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSavedId(a.id);
                        setAddr(pick(a));
                      }}
                      aria-pressed={savedId === a.id}
                      className={clsx(
                        "rounded-full border px-4 py-2 text-left text-xs transition-colors",
                        savedId === a.id ? "border-ink bg-mist" : "border-line bg-white hover:border-ink/40",
                      )}
                    >
                      <span className="font-medium">{a.name}</span>, {a.line1.slice(0, 22)}{a.line1.length > 22 ? "…" : ""}, {a.pincode}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSavedId(null);
                      setAddr(emptyAddress(userName, userPhone));
                    }}
                    aria-pressed={savedId === null}
                    className={clsx("rounded-full border px-4 py-2 text-xs", savedId === null ? "border-ink bg-mist" : "border-line bg-white hover:border-ink/40")}
                  >
                    New address
                  </button>
                </div>
              )}
              <AddressFields
                value={addr}
                onChange={(v) => {
                  setAddr(v);
                  setSavedId(null);
                }}
                idPrefix="checkout"
              />
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Payment method */}
          <section className="panel overflow-hidden">
            <header className="border-b border-line px-5 py-5">
              <h2 className="text-sm font-medium">Payment method</h2>
            </header>
            <div className="space-y-2.5 px-5 py-5" role="radiogroup" aria-label="Payment method">
              {rules.paymentMethods.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={payment === key}
                  onClick={() => setPayment(key)}
                  className={clsx(
                    "flex h-12 w-full items-center rounded-full border px-5 text-left text-sm transition-colors",
                    payment === key ? "border-ink/30 bg-mist" : "border-line bg-white hover:border-ink/30",
                  )}
                >
                  {PAYMENT_LABEL[key]}
                </button>
              ))}
            </div>
          </section>

          {/* Summary */}
          <section className="panel overflow-hidden">
            <header className="border-b border-line px-5 py-5">
              <h2 className="text-sm font-medium">Summary</h2>
            </header>
            <div className="px-5 py-5">
              <dl className="space-y-4 text-sm tabular">
                <div className="flex justify-between"><dt className="text-slate">Subtotal</dt><dd>{inr(totals.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate">Discount ({rules.discountPercent}%)</dt><dd>− {inr(totals.discountTotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate">Shipping</dt><dd>{totals.shippingFee === 0 ? "Free" : inr(totals.shippingFee)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate">GST ({rules.gstPercent}%)</dt><dd>{inr(totals.taxTotal)}</dd></div>
                <div className="flex justify-between border-t border-line pt-5"><dt className="text-slate">Total payable</dt><dd className="font-medium">{inr(totals.grandTotal)}</dd></div>
              </dl>
              {/* Phones get the pinned bar below instead, so the action is always
                  in reach while the address form is being filled in. */}
              <button type="submit" disabled={placing} className="btn-primary mt-6 hidden h-12 w-full lg:inline-flex">
                {placing ? "Placing order…" : payment === "COD" ? `Place order ${inr(totals.grandTotal)}` : `Pay ${inr(totals.grandTotal)}`}
              </button>
              {error && <p className="mt-3 text-sm text-sale" role="alert">{error}</p>}
              <p className="mt-3 text-center text-xs text-slate">
                {payment === "COD" ? "Pay the courier in cash when your parcel arrives." : "Demo gateway — no real charge is made."}
              </p>
            </div>
          </section>
        </aside>
      </div>

      {/* Pinned checkout bar on phones */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-paper/95 px-5 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate">Total payable</p>
            <p className="text-lg font-semibold leading-tight tabular">{inr(totals.grandTotal)}</p>
          </div>
          <button type="submit" disabled={placing} className="btn-primary h-12 min-w-0 flex-1 px-4">
            {placing ? "Placing…" : payment === "COD" ? "Place order" : "Pay now"}
          </button>
        </div>
      </div>
      {/* Room so the bar never covers the last field */}
      <div aria-hidden className="h-24 lg:hidden" />
    </form>
  );
}
