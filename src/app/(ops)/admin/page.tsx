import { staffGate } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/services/admin";
import { fmtDateTime, humanize, inr } from "@/lib/format";
import { AccessGate } from "@/components/AccessGate";
import { Empty, OpsShell, Section, StatCard } from "@/components/OpsShell";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionButton } from "@/components/ActionButton";

export const metadata = { title: "Admin dashboard — orders, inventory, refunds | subsel" };

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/warehouse", label: "Warehouse" },
  { href: "/hub", label: "Hub" },
  { href: "/courier", label: "Courier" },
];

export default async function AdminPage() {
  const { user, allowed } = await staffGate("ADMIN");
  if (!allowed) return <AccessGate need="ADMIN" user={user} />;
  const d = await getAdminDashboard();

  return (
    <OpsShell title="Admin console" subtitle="Business operations & control tower" tabs={TABS} active="/admin">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue" value={inr(d.stats.revenue)} hint={`${d.stats.paidOrders} paid orders`} tone="pine" />
        <StatCard label="Open orders" value={d.stats.openOrders} hint="Awaiting fulfilment" tone={d.stats.openOrders ? "warn" : undefined} />
        <StatCard label="Shipments" value={d.stats.shipments} hint="Across hub network" />
        <StatCard label="Returns" value={d.stats.returns} hint={`${d.stats.refunds} refunds`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Section title="Order management" hint="Confirm payment, allocate inventory and split shipments">
          {d.orders.length === 0 ? (
            <Empty>No orders yet. Place one from the storefront as a customer.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold tabular">{o.orderNumber}</p>
                    <p className="text-xs text-slate">
                      {o.user.fullName}, {o.items.reduce((s, i) => s + i.quantity, 0)} item(s), {inr(o.grandTotal)}, {o.paymentMethod}
                    </p>
                    {o.shipments.length > 0 && (
                      <p className="mt-1 text-xs text-slate tabular">{o.shipments.map((s) => s.shipmentNumber).join(", ")}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={o.status} />
                    <StatusBadge status={o.paymentStatus} />
                    {o.status === "PLACED" && (
                      <ActionButton url={`/api/admin/orders/${o.id}`} body={{ action: "confirm" }} label={o.paymentMethod === "COD" ? "Confirm COD order" : "Confirm payment"} variant="pine" />
                    )}
                    {o.status === "CONFIRMED" && (
                      <ActionButton url={`/api/admin/orders/${o.id}`} body={{ action: "allocate" }} label="Allocate stock" pendingLabel="Allocating…" variant="primary" />
                    )}
                    {(o.status === "PLACED" || o.status === "CONFIRMED") && (
                      <ActionButton url={`/api/admin/orders/${o.id}`} body={{ action: "cancel" }} label="Cancel" variant="danger" confirmText={`Cancel ${o.orderNumber}? Paid orders get a refund raised automatically.`} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="space-y-6">
          <Section title="Action queue">
            <ul className="space-y-2 px-5 py-4 text-sm">
              <li><b className="tabular">{d.queue.awaitingConfirmation}</b> order(s) waiting for confirmation.</li>
              <li><b className="tabular">{d.queue.awaitingAllocation}</b> order(s) waiting for allocation.</li>
              <li className={d.queue.lowStock ? "text-amber" : ""}><b className="tabular">{d.queue.lowStock}</b> SKU(s) at or below 8 units available.</li>
            </ul>
          </Section>

          <Section title="Returns" hint="Approve or reject customer requests">
            {d.returns.length === 0 ? (
              <Empty>No return requests.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {d.returns.map((r) => (
                  <li key={r.id} className="space-y-2 px-5 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold tabular">{r.returnNumber}</p>
                        <p className="text-xs text-slate">
                          {r.user.fullName}, {r.quantity} × {r.orderItem.productName} ({r.orderItem.variantLabel})
                        </p>
                        <p className="text-xs text-slate">Reason: {r.reason}{r.comment ? `, “${r.comment}”` : ""}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    {r.status === "REQUESTED" && (
                      <div className="flex gap-2">
                        <ActionButton url={`/api/admin/returns/${r.id}`} body={{ action: "approve" }} label="Approve and schedule pickup" variant="pine" />
                        <ActionButton url={`/api/admin/returns/${r.id}`} body={{ action: "reject" }} label="Reject" variant="danger" />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Refunds" hint="Move refunds to completion">
            {d.refunds.length === 0 ? (
              <Empty>No refunds.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {d.refunds.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                    <div>
                      <p className="text-sm font-bold tabular">{r.refundNumber}</p>
                      <p className="text-xs text-slate">
                        {r.order.orderNumber}, {r.order.user.fullName}, {inr(r.amount)}, {humanize(r.method)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      {r.status === "INITIATED" && <ActionButton url={`/api/admin/refunds/${r.id}`} label="Start processing" variant="outline" />}
                      {r.status === "PROCESSING" && <ActionButton url={`/api/admin/refunds/${r.id}`} label="Mark completed" variant="pine" />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <Section title="Inventory" hint="Live stock buckets across warehouses">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm tabular">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold text-slate">
                <th className="px-5 py-3">SKU</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Warehouse</th>
                {["Available", "Reserved", "Picked", "Packed", "Shipped"].map((h) => (
                  <th key={h} className="px-3 py-3 text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {d.inventory.map((i) => (
                <tr key={i.id}>
                  <td className="px-5 py-2.5 font-semibold">{i.variant.sku}</td>
                  <td className="px-3 py-2.5 text-slate">{i.variant.product.name} ({i.variant.label})</td>
                  <td className="px-3 py-2.5 text-slate">{i.warehouse.name}</td>
                  <td className={`px-3 py-2.5 text-right font-bold ${i.available <= i.lowStockThreshold ? "text-amber" : ""}`}>{i.available}</td>
                  <td className="px-3 py-2.5 text-right">{i.reserved}</td>
                  <td className="px-3 py-2.5 text-right">{i.picked}</td>
                  <td className="px-3 py-2.5 text-right">{i.packed}</td>
                  <td className="px-3 py-2.5 text-right">{i.shipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Stock movements" hint="Newest first">
          {d.movements.length === 0 ? (
            <Empty>No movements recorded.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.movements.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <p className="font-semibold tabular">
                      {m.variant.sku} <span className="font-normal text-slate">× {m.quantity}</span>
                    </p>
                    <p className="text-xs text-slate">
                      {humanize(m.fromBucket)} to {humanize(m.toBucket)} at {m.warehouse.name}
                      {m.referenceId ? `, ${m.referenceId}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold">{humanize(m.reason)}</p>
                    <p className="text-xs text-slate">{fmtDateTime(m.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Shipment network" hint="Every parcel and its current hub leg">
          {d.shipments.length === 0 ? (
            <Empty>No shipments yet. Allocate an order to create one.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.shipments.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold tabular">{s.shipmentNumber} <span className="font-medium text-slate">{s.trackingNumber}</span></p>
                    <p className="text-xs text-slate">
                      {[s.warehouse.name, ...s.legs.map((l) => l.hub.name)].join(" → ")}, {s.paymentType === "COD" ? `COD ${inr(s.codAmount)}` : "Prepaid"}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </OpsShell>
  );
}
