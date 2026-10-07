import { staffGate } from "@/lib/auth";
import {
  getWarehouseFloor,
  getWarehouseProductLabels,
} from "@/lib/services/fulfilment";
import { AccessGate } from "@/components/AccessGate";
import { Board, Empty, OpsShell, Section, StatCard, StatRow } from "@/components/OpsShell";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionButton } from "@/components/ActionButton";
import { ScanForm } from "@/components/ScanForm";
import { QrLabel } from "@/components/QrLabel";
import { ProductBarcodeLabels } from "@/components/ProductBarcodeLabels";

export const metadata = { title: "Warehouse management — pick, pack, QR label | subsel" };

const TABS = [
  { href: "/warehouse", label: "Floor" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/hub", label: "Hub" },
  { href: "/courier", label: "Courier" },
];

type Addr = { name: string; city: string; pincode: string };

export default async function WarehousePage() {
  const { user, allowed } = await staffGate("WAREHOUSE");
  if (!allowed) return <AccessGate need="WAREHOUSE" user={user} />;
  const [{ pickPack, dispatch, stats }, products] = await Promise.all([
    getWarehouseFloor(),
    getWarehouseProductLabels(
      user.role === "ADMIN" ? undefined : user.warehouseId,
    ),
  ]);

  return (
    <OpsShell title="Warehouse management" subtitle="Chennai & Thanjavur fulfilment centres" tabs={TABS} active="/warehouse">
      <StatRow>
        <StatCard label="Work queue" value={stats.ordersOnFloor} hint="Orders on the floor" />
        <StatCard label="Reserved units" value={stats.reservedUnits} hint="Awaiting pick" />
        <StatCard label="Packed units" value={stats.packedUnits} hint="Ready to ship" />
        <StatCard label="Labels pending" value={stats.labelsPending} hint="QR not generated" tone={stats.labelsPending ? "warn" : undefined} />
      </StatRow>

      <Board className="xl:grid-cols-2">
      <Section title="Pick & pack queue" hint="Scan each item before marking picked">
        {pickPack.length === 0 ? (
          <Empty>Nothing on the floor. Allocate an order from the admin console.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {pickPack.map((s) => {
              const nextSku = s.items.find((i) => i.pickedQty < i.quantity)?.sku;
              const units = s.items.reduce((a, i) => a + i.quantity, 0);
              const picked = s.items.reduce((a, i) => a + Math.min(i.pickedQty, i.quantity), 0);
              const addr = s.order.shippingAddress as unknown as Addr;
              return (
                <li key={s.id} className="grid gap-5 px-5 py-5 2xl:grid-cols-[1fr_1.1fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold tabular">{s.shipmentNumber}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-xs text-slate">
                      {s.order.orderNumber}, {s.warehouse.name}, to {addr.name} ({addr.city} {addr.pincode})
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-mist" aria-label={`${picked} of ${units} units picked`}>
                      <div className="h-full bg-pine transition-all" style={{ width: `${(picked / units) * 100}%` }} />
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {s.items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-3 tabular">
                          <span>
                            <b>{i.sku}</b> <span className="text-slate">{i.productName} ({i.variantLabel})</span>
                          </span>
                          <span className={i.pickedQty >= i.quantity ? "font-bold text-pine" : "text-slate"}>
                            {i.pickedQty}/{i.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3 2xl:border-l 2xl:border-line 2xl:pl-5">
                    {s.status === "ALLOCATED" ? (
                      <ScanForm
                        url="/api/warehouse"
                        body={{ action: "pick", shipmentId: s.id }}
                        placeholder="Scan item barcode (SKU)"
                        buttonLabel="Record pick"
                        demoValue={nextSku}
                        demoLabel="Use next SKU"
                      />
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-pine">All {units} unit(s) picked and verified.</p>
                        <ActionButton url="/api/warehouse" body={{ action: "pack", shipmentId: s.id }} label="Confirm packed" variant="pine" size="md" />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="QR shipping labels & dispatch" hint="Generate the label, then hand the parcel to a courier">
        {dispatch.length === 0 ? (
          <Empty>No shipments awaiting dispatch.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {dispatch.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start justify-between gap-5 px-5 py-5">
                <div className="flex gap-4">
                  {s.qrCode && <QrLabel value={s.qrCode} />}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold tabular">{s.shipmentNumber}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-xs text-slate tabular">
                      {s.trackingNumber}, {s.paymentType === "COD" ? `COD ₹${s.codAmount.toLocaleString("en-IN")}` : "Prepaid"}
                    </p>
                    <p className="mt-1 text-xs text-slate">Route: {[s.warehouse.name, ...s.legs.map((l) => l.hub.name)].join(" → ")}</p>
                    {s.qrCode && <p className="mt-1 text-[11px] text-slate tabular">{s.qrCode}</p>}
                  </div>
                </div>
                <div className="w-full max-w-md">
                  {s.status === "PACKED" ? (
                    <ActionButton url="/api/warehouse" body={{ action: "label", shipmentId: s.id }} label="Generate QR label" variant="primary" size="md" />
                  ) : (
                    <ScanForm
                      url="/api/warehouse"
                      body={{ action: "handover", shipmentId: s.id }}
                      placeholder="Scan parcel QR to hand over"
                      buttonLabel="Hand over"
                      demoValue={s.qrCode ?? undefined}
                      demoLabel="Use label"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      </Board>

      <Section
        title="Product barcode labels"
        hint="Print Code 128 labels for stocked product SKUs"
        className="max-h-[38vh] shrink-0"
      >
        <ProductBarcodeLabels products={products} />
      </Section>
    </OpsShell>
  );
}
