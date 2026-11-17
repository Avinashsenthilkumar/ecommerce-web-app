"use client";

import { useState } from "react";
import { callApi } from "@/lib/client/api";
import { fmtDate, humanize } from "@/lib/format";

type Tracking = {
  orderNumber: string;
  placedAt: string;
  status: string;
  paymentStatus: string;
  items: { productName: string; variantLabel: string; quantity: number }[];
  shipments: {
    trackingNumber: string;
    status: string;
    deliveredAt: string | null;
    legs: { status: string; hub: { name: string; type: string } }[];
    scans: {
      type: string;
      locationLabel: string;
      remarks: string | null;
      createdAt: string;
    }[];
  }[];
};

export function TrackOrderForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<Tracking | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await callApi<Tracking>("/api/track-order", "POST", {
          orderNumber,
          phone,
        }),
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
        <label className="label">
          Order number
          <input
            className="input mt-2"
            autoComplete="off"
            required
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder="ORD-20261117-000123"
          />
        </label>
        <label className="label">
          Phone used at checkout
          <input
            className="input mt-2"
            autoComplete="tel"
            inputMode="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <button disabled={busy} className="btn-primary sm:col-span-2">
          {busy ? "Looking up…" : "Track order"}
        </button>
        {error && <p role="alert" className="text-sm text-sale sm:col-span-2">{error}</p>}
      </form>

      {result && (
        <section className="mt-8 space-y-5">
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="eyebrow">Order {result.orderNumber}</p>
            <p className="mt-2 text-sm text-slate">
              Placed {fmtDate(result.placedAt)} · {humanize(result.status)} · payment {humanize(result.paymentStatus)}
            </p>
            <ul className="mt-4 divide-y divide-line">
              {result.items.map((item, index) => (
                <li key={`${item.productName}-${index}`} className="py-3 text-sm">
                  <span className="font-semibold">{item.productName}</span>
                  <span className="text-slate"> · {item.variantLabel} · Qty {item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
          {result.shipments.map((shipment) => (
            <div key={shipment.trackingNumber} className="rounded-2xl border border-line bg-white p-5">
              <p className="font-semibold">Parcel {shipment.trackingNumber}</p>
              <p className="mt-1 text-sm text-slate">{humanize(shipment.status)}</p>
              {shipment.scans.length > 0 && (
                <ol className="mt-4 space-y-3">
                  {shipment.scans.map((scan, index) => (
                    <li key={`${scan.createdAt}-${index}`} className="border-l-2 border-line pl-3 text-sm">
                      <p className="font-medium">{humanize(scan.type)}</p>
                      <p className="text-slate">{scan.locationLabel} · {fmtDate(scan.createdAt)}</p>
                      {scan.remarks && <p className="text-xs text-slate">{scan.remarks}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
          <p className="text-xs text-slate">
            Delivery OTPs are not shown here. Sign in to the customer account to access private order details.
          </p>
        </section>
      )}
    </div>
  );
}
