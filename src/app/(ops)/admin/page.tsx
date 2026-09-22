import Link from "next/link";
import { AlertTriangle, Store, ClipboardCheck, PackageSearch } from "lucide-react";
import { staffGate } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/services/admin";
import { fmtDateTime, humanize, inr } from "@/lib/format";
import { AccessGate } from "@/components/AccessGate";
import { Board, Empty, OpsShell, Section, StatCard, StatRow } from "@/components/OpsShell";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionButton } from "@/components/ActionButton";

export const metadata = { title: "Admin dashboard — orders, inventory, refunds | subsel" };

const TABS = [{ href: "/admin", label: "Overview" }];

export default async function AdminPage() {
  const { user, allowed } = await staffGate("ADMIN");
  if (!allowed) return <AccessGate need="ADMIN" user={user} />;
  const d = await getAdminDashboard();

  const alerts = [
    { show: d.queue.awaitingConfirmation > 0, icon: ClipboardCheck, text: `${d.queue.awaitingConfirmation} to confirm`, href: "#orders" },
    { show: d.queue.awaitingAllocation > 0, icon: PackageSearch, text: `${d.queue.awaitingAllocation} to allocate`, href: "#orders" },
    { show: d.queue.sellerApplications + d.queue.listingsToReview > 0, icon: Store, text: `${d.queue.sellerApplications} seller(s), ${d.queue.listingsToReview} listing(s) to review`, href: "/admin/sellers" },
    { show: d.queue.lowStock > 0, icon: AlertTriangle, text: `${d.queue.lowStock} SKU(s) low on stock`, href: "#inventory" },
  ].filter((a) => a.show);

  return (
    <OpsShell title="Admin console" subtitle="Business operations & control tower" tabs={TABS} active="/admin">
      <StatRow>
        <StatCard label="Revenue" value={inr(d.stats.revenue)} hint={`${d.stats.paidOrders} paid orders`} tone="pine" />
        <StatCard label="Open orders" value={d.stats.openOrders} hint="Awaiting fulfilment" tone={d.stats.openOrders ? "warn" : undefined} />
        <StatCard label="Shipments" value={d.stats.shipments} hint="Across hub network" />
        <StatCard label="Returns" value={d.stats.returns} hint={`${d.stats.refunds} refunds`} />
      </StatRow>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate">Action queue</span>
        {alerts.length === 0 ? (
          <span className="rounded-full bg-pineSoft px-3 py-1 text-xs font-medium text-pine">All clear, nothing waiting</span>
        ) : (
          alerts.map((a) => (
            <Link key={a.text} href={a.href} className="inline-flex items-center gap-1.5 rounded-full bg-amberSoft px-3 py-1 text-xs font-medium text-amber hover:bg-amber hover:text-white">
              <a.icon size={13} /> {a.text}
            </Link>
          ))
        )}
      </div>

      <Board className="xl:grid-cols-[1.25fr_1.35fr_1fr] xl:grid-rows-2">
        {/* 1. Orders */}
        <div id="orders" className="contents">
          <Section title="Order management" hint="Confirm payment, allocate inventory and split shipments" className="max-h-[36rem] xl:max-h-none">
            {d.orders.length === 0 ? (
              <Empty>No orders yet.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {d.orders.map((o) => (
                  <li key={o.id} className="space-y-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold tabular">{o.orderNumber}</p>
                        <p className="truncate text-xs text-slate">
                          {o.user.fullName}, {o.items.reduce((s, i) => s + i.quantity, 0)} item(s), {inr(o.grandTotal)}, {o.paymentMethod}
                        </p>
                        {o.shipments.length > 0 && <p className="truncate text-[11px] text-slate tabular">{o.shipments.map((s) => s.shipmentNumber).join(", ")}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={o.status} />
                        <StatusBadge status={o.paymentStatus} />
                      </div>
                    </div>
                    {(o.status === "PLACED" || o.status === "CONFIRMED") && (
                      <div className="flex flex-wrap gap-2">
                        {o.status === "PLACED" && (
                          <ActionButton url={`/api/admin/orders/${o.id}`} body={{ action: "confirm" }} label={o.paymentMethod === "COD" ? "Confirm COD" : "Confirm payment"} variant="pine" />
                        )}
                        {o.status === "CONFIRMED" && <ActionButton url={`/api/admin/orders/${o.id}`} body={{ action: "allocate" }} label="Allocate stock" pendingLabel="Allocating…" />}
                        <ActionButton url={`/api/admin/orders/${o.id}`} body={{ action: "cancel" }} label="Cancel" variant="danger" confirmText={`Cancel ${o.orderNumber}? Paid orders get a refund raised automatically.`} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* 2. Inventory */}
        <div id="inventory" className="contents">
          <Section title="Inventory" hint="Live stock buckets across warehouses" className="max-h-[36rem] xl:max-h-none">
            <table className="w-full text-xs tabular">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-line text-left text-slate">
                  <th className="px-4 py-2 font-medium">SKU</th>
                  <th className="px-2 py-2 font-medium">WH</th>
                  <th className="px-2 py-2 text-right font-medium">Avail</th>
                  <th className="px-2 py-2 text-right font-medium">Rsv</th>
                  <th className="px-2 py-2 text-right font-medium">Pick</th>
                  <th className="px-2 py-2 text-right font-medium">Pack</th>
                  <th className="px-4 py-2 text-right font-medium">Ship</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.inventory.map((i) => (
                  <tr key={i.id} title={`${i.variant.product.name} (${i.variant.label})`}>
                    <td className="px-4 py-1.5 font-semibold">{i.variant.sku}</td>
                    <td className="px-2 py-1.5 text-slate">{i.warehouse.name.split(" ")[0]}</td>
                    <td className={`px-2 py-1.5 text-right font-semibold ${i.available <= i.lowStockThreshold ? "text-amber" : ""}`}>{i.available}</td>
                    <td className="px-2 py-1.5 text-right">{i.reserved}</td>
                    <td className="px-2 py-1.5 text-right">{i.picked}</td>
                    <td className="px-2 py-1.5 text-right">{i.packed}</td>
                    <td className="px-4 py-1.5 text-right">{i.shipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>

        {/* 3. Returns */}
        <Section title="Returns" hint="Approve or reject requests" className="max-h-[28rem] xl:max-h-none">
          {d.returns.length === 0 ? (
            <Empty>No return requests.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.returns.map((r) => (
                <li key={r.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tabular">{r.returnNumber}</p>
                      <p className="text-xs text-slate">{r.user.fullName}, {r.quantity} × {r.orderItem.productName}</p>
                      <p className="text-xs text-slate">{r.reason}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.status === "REQUESTED" && (
                    <div className="flex flex-wrap gap-2">
                      <ActionButton url={`/api/admin/returns/${r.id}`} body={{ action: "approve" }} label="Approve pickup" variant="pine" />
                      <ActionButton url={`/api/admin/returns/${r.id}`} body={{ action: "reject" }} label="Reject" variant="danger" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 4. Shipments */}
        <Section title="Shipment network" hint="Every parcel and its route" className="max-h-[28rem] xl:max-h-none">
          {d.shipments.length === 0 ? (
            <Empty>No shipments yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.shipments.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tabular">{s.shipmentNumber} <span className="font-normal text-slate">{s.trackingNumber}</span></p>
                    <p className="truncate text-xs text-slate">
                      {[s.warehouse.name.split(" ")[0] + " FC", ...s.legs.map((l) => l.hub.name.replace(" Delivery Hub", "").replace(" Hub", ""))].join(" → ")},{" "}
                      {s.paymentType === "COD" ? `COD ${inr(s.codAmount)}` : "Prepaid"}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 5. Stock movements */}
        <Section title="Stock movements" hint="Newest first" className="max-h-[28rem] xl:max-h-none">
          {d.movements.length === 0 ? (
            <Empty>No movements recorded.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.movements.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold tabular">{m.variant.sku} <span className="font-normal text-slate">× {m.quantity}</span></p>
                    <p className="truncate text-slate">{humanize(m.fromBucket)} → {humanize(m.toBucket)}, {m.warehouse.name.split(" ")[0]}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium">{humanize(m.reason)}</p>
                    <p className="text-slate">{fmtDateTime(m.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 6. Refunds */}
        <Section title="Refunds" hint="Move refunds to completion" className="max-h-[28rem] xl:max-h-none">
          {d.refunds.length === 0 ? (
            <Empty>No refunds.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.refunds.map((r) => (
                <li key={r.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tabular">{r.refundNumber}</p>
                      <p className="text-xs text-slate">{r.order.orderNumber}, {inr(r.amount)}, {humanize(r.method)}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.status === "INITIATED" && <ActionButton url={`/api/admin/refunds/${r.id}`} label="Start processing" variant="outline" />}
                  {r.status === "PROCESSING" && <ActionButton url={`/api/admin/refunds/${r.id}`} label="Mark completed" variant="pine" />}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </Board>
    </OpsShell>
  );
}
