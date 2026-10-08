import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  PackageSearch,
  RotateCcw,
  Store,
} from "lucide-react";
import { staffGate } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/services/admin";
import { fmtDateTime, humanize, inr } from "@/lib/format";
import { AccessGate } from "@/components/AccessGate";
import { Empty, OpsShell, Section, StatCard, StatRow } from "@/components/OpsShell";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionButton } from "@/components/ActionButton";

export const metadata = { title: "Admin overview — subsel" };

const TABS = [{ href: "/admin", label: "Overview" }];

function DetailGroup({
  id,
  title,
  count,
  open = false,
  children,
}: {
  id: string;
  title: string;
  count: number;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      id={id}
      open={open}
      className="overflow-hidden rounded-2xl border border-line bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 marker:content-none hover:bg-mist/60 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-semibold">{title}</span>
        <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-medium tabular text-slate">
          {count}
        </span>
      </summary>
      <div className="border-t border-line">
        {children}
      </div>
    </details>
  );
}

export default async function AdminPage() {
  const { user, allowed } = await staffGate("ADMIN");
  if (!allowed) return <AccessGate need="ADMIN" user={user} />;
  const d = await getAdminDashboard();

  const tasks = [
    {
      show: d.queue.awaitingConfirmation > 0,
      icon: ClipboardCheck,
      label: "Confirm orders",
      count: d.queue.awaitingConfirmation,
      href: "#orders",
      hint: "Review newly placed orders",
    },
    {
      show: d.queue.awaitingAllocation > 0,
      icon: PackageSearch,
      label: "Allocate stock",
      count: d.queue.awaitingAllocation,
      href: "#orders",
      hint: "Orders confirmed and ready",
    },
    {
      show: d.queue.sellerApplications + d.queue.listingsToReview > 0,
      icon: Store,
      label: "Review sellers & products",
      count: d.queue.sellerApplications + d.queue.listingsToReview,
      href: "/admin/sellers",
      hint: `${d.queue.sellerApplications} sellers · ${d.queue.listingsToReview} listings`,
    },
    {
      show: d.queue.lowStock > 0,
      icon: AlertTriangle,
      label: "Check low stock",
      count: d.queue.lowStock,
      href: "#inventory",
      hint: "SKUs at or below threshold",
    },
    {
      show: d.queue.pendingReturns > 0,
      icon: RotateCcw,
      label: "Review return requests",
      count: d.queue.pendingReturns,
      href: "#returns",
      hint: "Pickup approval needed",
    },
    {
      show: d.queue.pendingRefunds > 0,
      icon: RotateCcw,
      label: "Process refunds",
      count: d.queue.pendingRefunds,
      href: "#refunds",
      hint: "Refunds still in progress",
    },
  ].filter((task) => task.show);

  return (
    <OpsShell
      title="Overview"
      subtitle="Your store’s work that needs attention"
      tabs={TABS}
      active="/admin"
    >
      <div className="flex flex-col gap-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <StatRow>
          <StatCard
            label="Revenue"
            value={inr(d.stats.revenue)}
            hint={`Across ${d.stats.paidOrders} paid orders`}
            tone="pine"
          />
          <StatCard
            label="Orders to confirm"
            value={d.queue.awaitingConfirmation}
            hint="New orders awaiting review"
            tone={d.queue.awaitingConfirmation ? "warn" : undefined}
          />
          <StatCard
            label="Orders to allocate"
            value={d.queue.awaitingAllocation}
            hint="Confirmed, awaiting stock"
            tone={d.queue.awaitingAllocation ? "warn" : undefined}
          />
          <StatCard
            label="Open orders"
            value={d.stats.openOrders}
            hint="Not delivered or cancelled"
          />
        </StatRow>

        <section className="rounded-2xl border border-line bg-white">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Needs attention</h2>
              <p className="text-xs text-slate">Start here to keep orders moving.</p>
            </div>
            <Link href="/admin/analytics" className="btn-outline btn-sm inline-flex items-center gap-1.5">
              View sales & products <ArrowRight size={14} />
            </Link>
          </div>
          {tasks.length === 0 ? (
            <p className="px-4 py-5 text-sm text-pine">You’re all caught up. No urgent tasks right now.</p>
          ) : (
            <ul className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
              {tasks.map((task) => (
                <li key={task.label}>
                  <Link
                    href={task.href}
                    className="flex h-full items-center gap-3 rounded-xl border border-line px-3 py-3 transition-colors hover:border-ink/20 hover:bg-mist/60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amberSoft text-amber">
                      <task.icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{task.label}</span>
                      <span className="block truncate text-xs text-slate">{task.hint}</span>
                    </span>
                    <span className="text-lg font-semibold tabular">{task.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Section
          title="Orders to process"
          hint="Oldest first. Confirm new orders or allocate stock for confirmed orders."
          className="min-h-48 flex-none"
        >
          {d.orders.length === 0 ? (
            <Empty>No orders need admin action right now.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.orders.map((order) => (
                <li key={order.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold tabular">{order.orderNumber}</p>
                      <StatusBadge status={order.status} />
                      <StatusBadge status={order.paymentStatus} />
                    </div>
                    <p className="mt-1 text-xs text-slate">
                      {order.user.fullName} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} units · {inr(order.grandTotal)} · {order.paymentMethod}
                    </p>
                    <p className="mt-1 text-[11px] text-slate">
                      Placed {fmtDateTime(order.placedAt)}
                      {order.shipments.length > 0 && ` · ${order.shipments.map((shipment) => shipment.shipmentNumber).join(", ")}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {order.status === "PLACED" && (
                      <ActionButton
                        url={`/api/admin/orders/${order.id}`}
                        body={{ action: "confirm" }}
                        label={order.paymentMethod === "COD" ? "Confirm COD" : "Confirm payment"}
                        variant="pine"
                      />
                    )}
                    {order.status === "CONFIRMED" && (
                      <ActionButton
                        url={`/api/admin/orders/${order.id}`}
                        body={{ action: "allocate" }}
                        label="Allocate stock"
                        pendingLabel="Allocating…"
                      />
                    )}
                    <ActionButton
                      url={`/api/admin/orders/${order.id}`}
                      body={{ action: "cancel" }}
                      label="Cancel"
                      variant="danger"
                      confirmText={`Cancel ${order.orderNumber}? Paid orders get a refund raised automatically.`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <section aria-label="More operations" className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate">
            More operations
          </h2>

          <DetailGroup id="inventory" title="Inventory" count={d.inventory.length} open={d.queue.lowStock > 0}>
            {d.inventory.length === 0 ? (
              <Empty>No inventory records.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-xs tabular">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-line text-left text-slate">
                      <th className="px-4 py-2 font-medium">SKU</th>
                      <th className="px-2 py-2 font-medium">Warehouse</th>
                      <th className="px-2 py-2 text-right font-medium">Available</th>
                      <th className="px-2 py-2 text-right font-medium">Reserved</th>
                      <th className="px-2 py-2 text-right font-medium">Picked</th>
                      <th className="px-2 py-2 text-right font-medium">Packed</th>
                      <th className="px-4 py-2 text-right font-medium">Shipped</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {d.inventory.map((item) => (
                      <tr key={item.id} title={`${item.variant.product.name} (${item.variant.label})`}>
                        <td className="px-4 py-2 font-semibold">{item.variant.sku}</td>
                        <td className="px-2 py-2 text-slate">{item.warehouse.name}</td>
                        <td className={`px-2 py-2 text-right font-semibold ${item.warehouse.isActive && item.available <= item.lowStockThreshold ? "text-amber" : ""}`}>
                          {item.available}
                        </td>
                        <td className="px-2 py-2 text-right">{item.reserved}</td>
                        <td className="px-2 py-2 text-right">{item.picked}</td>
                        <td className="px-2 py-2 text-right">{item.packed}</td>
                        <td className="px-4 py-2 text-right">{item.shipped}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailGroup>

          <DetailGroup id="returns" title="Return requests needing review" count={d.queue.pendingReturns} open={d.queue.pendingReturns > 0}>
            {d.returns.length === 0 ? (
              <Empty>No return requests need review.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {d.returns.map((item) => (
                  <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold tabular">{item.returnNumber}</p>
                      <p className="text-xs text-slate">{item.user.fullName} · {item.quantity} × {item.orderItem.productName} · {item.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      {item.status === "REQUESTED" && (
                        <>
                          <ActionButton url={`/api/admin/returns/${item.id}`} body={{ action: "approve" }} label="Approve pickup" variant="pine" />
                          <ActionButton url={`/api/admin/returns/${item.id}`} body={{ action: "reject" }} label="Reject" variant="danger" />
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DetailGroup>

          <DetailGroup id="refunds" title="Refunds in progress" count={d.queue.pendingRefunds} open={d.queue.pendingRefunds > 0}>
            {d.refunds.length === 0 ? (
              <Empty>No refunds need processing.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {d.refunds.map((item) => (
                  <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold tabular">{item.refundNumber}</p>
                      <p className="text-xs text-slate">{item.order.orderNumber} · {item.order.user.fullName} · {inr(item.amount)} · {humanize(item.method)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      {item.status === "INITIATED" && <ActionButton url={`/api/admin/refunds/${item.id}`} label="Start processing" variant="outline" />}
                      {item.status === "PROCESSING" && <ActionButton url={`/api/admin/refunds/${item.id}`} label="Mark completed" variant="pine" />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DetailGroup>

          <DetailGroup id="shipments" title="Recent shipments" count={d.shipments.length}>
            {d.shipments.length === 0 ? (
              <Empty>No shipments yet.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {d.shipments.map((shipment) => (
                  <li key={shipment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tabular">{shipment.shipmentNumber} <span className="font-normal text-slate">{shipment.trackingNumber}</span></p>
                      <p className="truncate text-xs text-slate">
                        {[`${shipment.warehouse.name} FC`, ...shipment.legs.map((leg) => leg.hub.name.replace(" Delivery Hub", "").replace(" Hub", ""))].join(" → ")} · {shipment.paymentType === "COD" ? `COD ${inr(shipment.codAmount)}` : "Prepaid"}
                      </p>
                    </div>
                    <StatusBadge status={shipment.status} />
                  </li>
                ))}
              </ul>
            )}
          </DetailGroup>

          <DetailGroup id="movements" title="Recent stock movements" count={d.movements.length}>
            {d.movements.length === 0 ? (
              <Empty>No stock movements recorded.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {d.movements.map((movement) => (
                  <li key={movement.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold tabular">{movement.variant.sku} <span className="font-normal text-slate">× {movement.quantity}</span></p>
                      <p className="truncate text-slate">{humanize(movement.fromBucket)} → {humanize(movement.toBucket)} · {movement.warehouse.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium">{humanize(movement.reason)}</p>
                      <p className="text-slate">{fmtDateTime(movement.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DetailGroup>
        </section>
      </div>
    </OpsShell>
  );
}
