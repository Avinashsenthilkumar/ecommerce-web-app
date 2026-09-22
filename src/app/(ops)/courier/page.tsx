import { staffGate } from "@/lib/auth";
import { getCourierBoard } from "@/lib/services/network";
import { inr } from "@/lib/format";
import { AccessGate } from "@/components/AccessGate";
import { Board, Empty, OpsShell, Section, StatCard, StatRow } from "@/components/OpsShell";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionButton } from "@/components/ActionButton";
import { DeliverForm } from "@/components/DeliverForm";

export const metadata = { title: "Courier app — last mile delivery & POD | subsel" };

const TABS = [
  { href: "/courier", label: "Runsheet" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/warehouse", label: "Warehouse" },
  { href: "/hub", label: "Hub" },
];

type Addr = { name: string; phone: string; line1: string; line2?: string; city: string; pincode: string };

export default async function CourierPage() {
  const { user, allowed } = await staffGate("COURIER");
  if (!allowed) return <AccessGate need="COURIER" user={user} />;
  const { couriers, runsheet, pickups, stats } = await getCourierBoard();

  return (
    <OpsShell title="Courier management" subtitle="Last mile runsheet & proof of delivery" tabs={TABS} active="/courier">
      <StatRow>
        <StatCard label="On runsheet" value={stats.onRunsheet} hint="Out for delivery now" />
        <StatCard label="Return pickups" value={stats.returnPickups} hint="Reverse logistics" />
        <StatCard label="Delivered" value={stats.delivered} hint="All time" tone="pine" />
        <StatCard label="Riders" value={stats.riders} hint="Chennai & Thanjavur" />
      </StatRow>

      <Board className="xl:grid-cols-[15rem_1.5fr_1fr]">
      <div className="grid content-start gap-3 md:grid-cols-2 xl:grid-cols-1 xl:overflow-y-auto">
        {couriers.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-2xl border border-line bg-white p-4">
            <div>
              <p className="text-xs font-semibold text-slate">{c.zone}</p>
              <p className="mt-1 text-lg font-bold">{c.user.fullName}</p>
              <p className="text-sm text-slate tabular">
                {c.vehicleNumber}, {c._count.shipments} parcel(s) assigned
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c.isAvailable ? "bg-pineSoft text-pine" : "bg-mist text-slate"}`}>
              {c.isAvailable ? "On shift" : "Off shift"}
            </span>
          </div>
        ))}
      </div>

      <Section title="Delivery runsheet" hint="Verify the QR, collect COD, mark delivered">
        {runsheet.length === 0 ? (
          <Empty>Runsheet is empty. Release a parcel from the delivery hub.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {runsheet.map((s) => {
              const a = s.order.shippingAddress as unknown as Addr;
              return (
                <li key={s.id} className="grid gap-5 px-5 py-5 2xl:grid-cols-[1.2fr_1fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold tabular">{s.trackingNumber}</p>
                      <StatusBadge status={s.status} />
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${s.paymentType === "COD" ? "bg-amberSoft text-amber" : "bg-mist text-slate"}`}>
                        {s.paymentType === "COD" ? `Collect ${inr(s.codAmount)}` : "Prepaid"}
                      </span>
                    </div>
                    <p className="text-xs text-slate">
                      {s.shipmentNumber}, {s.order.orderNumber}, rider {s.courier?.user.fullName}
                    </p>
                    <p className="mt-3 text-sm font-semibold">{a.name}, {a.phone}</p>
                    <p className="text-sm text-slate">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.pincode}
                    </p>
                    <p className="mt-2 text-xs text-slate">{s.items.map((i) => `${i.quantity} × ${i.productName} (${i.variantLabel})`).join("; ")}</p>
                    {s.attempts.length > 0 && (
                      <p className="mt-2 text-xs font-semibold text-sale">
                        {s.attempts.length} failed attempt(s), last: {s.attempts[0].failureReason}
                      </p>
                    )}
                  </div>
                  <div className="2xl:border-l 2xl:border-line 2xl:pl-5">
                    <DeliverForm shipmentId={s.id} isCod={s.paymentType === "COD"} codAmount={s.codAmount} demoCode={s.qrCode ?? s.trackingNumber} demoOtp={s.deliveryOtp} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Return pickups" hint="Collect from customer and check quality at intake">
        {pickups.length === 0 ? (
          <Empty>No return pickups scheduled.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {pickups.map((r) => {
              const a = r.orderItem.order.shippingAddress as unknown as Addr;
              return (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold tabular">{r.returnNumber}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-slate">
                      {r.quantity} × {r.orderItem.productName} ({r.orderItem.variantLabel}), reason: {r.reason}
                    </p>
                    <p className="mt-1 text-sm">
                      {a.name}, {a.line1}, {a.city} {a.pincode}
                    </p>
                    <p className="text-xs text-slate">Rider: {r.pickupCourier?.user.fullName ?? "Unassigned"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.status === "PICKUP_SCHEDULED" && (
                      <ActionButton url="/api/courier" body={{ action: "pickup", returnId: r.id }} label="Mark collected" variant="primary" />
                    )}
                    {r.status === "PICKED_UP" && (
                      <>
                        <ActionButton url="/api/courier" body={{ action: "qc", returnId: r.id, pass: true }} label="QC passed, restock" variant="pine" />
                        <ActionButton url="/api/courier" body={{ action: "qc", returnId: r.id, pass: false }} label="QC failed" variant="danger" />
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
      </Board>
    </OpsShell>
  );
}
