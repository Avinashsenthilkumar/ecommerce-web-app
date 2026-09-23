import Link from "next/link";
import type { OrderDetail } from "@/lib/services/orders";
import { fmtDate, fmtDateTime, humanize, inr } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import { ProductImage } from "./ProductImage";
import { ScanTrail } from "./ScanTrail";
import { ReturnForm } from "./ReturnForm";
import { ActionButton } from "./ActionButton";

type Addr = { name: string; line1: string; line2?: string; city: string; state: string; pincode: string; phone: string };

export function OrderCard({ order, expanded = false, returnWindowDays = 7 }: { order: OrderDetail; expanded?: boolean; returnWindowDays?: number }) {
  const addr = order.shippingAddress as unknown as Addr;
  const unallocated = order.items.filter((i) => !i.shipmentId);

  return (
    <article className="panel overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-mist/40 px-5 py-4">
        <div>
          <Link href={`/orders/${order.orderNumber}`} className="text-sm font-bold hover:underline tabular">{order.orderNumber}</Link>
          <p className="text-xs text-slate">
            Placed {fmtDateTime(order.placedAt)}, {humanize(order.paymentMethod === "COD" ? "cash_on_delivery" : order.paymentMethod)}, {inr(order.grandTotal)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} />
          {(order.status === "PLACED" || order.status === "CONFIRMED") && (
            <ActionButton
              url={`/api/orders/${order.orderNumber}/cancel`}
              label="Cancel order"
              pendingLabel="Cancelling…"
              variant="danger"
              confirmText={`Cancel ${order.orderNumber}?${order.paymentStatus === "PAID" ? " Your refund will be started automatically." : ""}`}
            />
          )}
        </div>
      </header>

      <div className="space-y-6 p-5">
        {unallocated.length > 0 && order.status !== "CANCELLED" && (
          <div className="rounded-xl bg-amberSoft/60 p-4 text-sm">
            <p className="font-semibold text-amber">
              {order.status === "PLACED" ? "Waiting for confirmation" : "Confirmed, reserving stock at the nearest warehouse"}
            </p>
            <ul className="mt-2 space-y-1 text-ink">
              {unallocated.map((i) => (
                <li key={i.id}>{i.quantity} × {i.productName} ({i.variantLabel})</li>
              ))}
            </ul>
          </div>
        )}

        {order.shipments.map((s, idx) => {
          const items = order.items.filter((i) => i.shipmentId === s.id);
          const deliveredDaysAgo = s.deliveredAt ? (Date.now() - new Date(s.deliveredAt).getTime()) / 86_400_000 : null;
          const canReturn = s.status === "DELIVERED" && deliveredDaysAgo !== null && deliveredDaysAgo <= returnWindowDays;
          return (
            <section key={s.id} className="rounded-xl border border-line">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div>
                  <p className="text-sm font-bold">
                    Parcel {idx + 1} of {order.shipments.length}
                    <span className="ml-2 font-medium text-slate tabular">{s.trackingNumber}</span>
                  </p>
                  <p className="text-xs text-slate">
                    From {s.warehouse.name}
                    {s.legs.length > 0 && <> via {s.legs.map((l) => l.hub.name).join(", ")}</>}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </div>

              {s.status === "OUT_FOR_DELIVERY" && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-pineSoft/60 px-4 py-3">
                  <p className="text-sm">
                    <b>{s.courier?.user.fullName ?? "Your courier"}</b> is on the way.
                    {s.paymentType === "COD" && <> Keep {inr(s.codAmount)} in cash ready.</>}
                  </p>
                  <p className="text-sm">
                    Delivery OTP <span className="ml-1 rounded-md bg-white px-2 py-1 font-bold tracking-[0.3em] tabular">{s.deliveryOtp}</span>
                  </p>
                </div>
              )}

              <div className={expanded ? "grid gap-6 p-4 md:grid-cols-[1.2fr_1fr]" : "p-4"}>
                <ul className="space-y-4">
                  {items.map((i) => {
                    const openReturn = i.returns.find((r) => !["REJECTED", "QC_FAILED"].includes(r.status));
                    const returnable = i.quantity - i.returns.filter((r) => !["REJECTED", "QC_FAILED"].includes(r.status)).reduce((a, r) => a + r.quantity, 0);
                    return (
                      <li key={i.id} className="flex flex-wrap gap-3">
                        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-mist">
                          <ProductImage src={i.imageUrl} alt={i.productName} className="h-full w-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{i.productName}</p>
                          <p className="text-xs text-slate">{i.variantLabel}, qty {i.quantity}, {inr(i.lineTotal)}</p>
                          {openReturn && (
                            <p className="mt-1 flex items-center gap-2 text-xs">
                              Return {openReturn.returnNumber} <StatusBadge status={openReturn.status} />
                            </p>
                          )}
                          {canReturn && returnable > 0 && expanded && (
                            <div className="mt-2">
                              <ReturnForm orderItemId={i.id} maxQty={returnable} />
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {expanded && (
                  <div>
                    <p className="mb-3 text-xs font-semibold text-slate">Scan trail</p>
                    <ScanTrail scans={s.scans} />
                  </div>
                )}
              </div>
              {s.deliveredAt && (
                <p className="border-t border-line px-4 py-2.5 text-xs text-slate">
                  Delivered {fmtDate(s.deliveredAt)}.{" "}
                  {canReturn ? `Returns open until ${fmtDate(new Date(new Date(s.deliveredAt).getTime() + returnWindowDays * 86_400_000))}.` : "Return window closed."}
                </p>
              )}
            </section>
          );
        })}

        {expanded && (
          <div className="grid gap-6 border-t border-line pt-5 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-slate">Delivering to</p>
              <p className="mt-1 font-semibold">{addr.name}</p>
              <p className="text-slate">
                {addr.line1}
                {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.pincode}
              </p>
              <p className="text-slate">{addr.phone}</p>
            </div>
            <dl className="space-y-1.5 tabular">
              <div className="flex justify-between"><dt className="text-slate">Subtotal</dt><dd>{inr(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate">Discount</dt><dd>− {inr(order.discountTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate">Shipping</dt><dd>{order.shippingFee ? inr(order.shippingFee) : "Free"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate">GST</dt><dd>{inr(order.taxTotal)}</dd></div>
              <div className="flex justify-between font-bold"><dt>Total</dt><dd>{inr(order.grandTotal)}</dd></div>
              {order.refunds.map((r) => (
                <div key={r.id} className="flex justify-between text-xs">
                  <dt className="text-slate">Refund {r.refundNumber}</dt>
                  <dd className="flex items-center gap-2">{inr(r.amount)} <StatusBadge status={r.status} /></dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {!expanded && (
          <Link href={`/orders/${order.orderNumber}`} className="btn-outline btn-sm">Track order</Link>
        )}
      </div>
    </article>
  );
}
