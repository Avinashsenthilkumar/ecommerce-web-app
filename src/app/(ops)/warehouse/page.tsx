import { staffGate } from "@/lib/auth";
import {
  getWarehouseFloor,
  getWarehouseProductLabels,
  PICK_SLA_HOURS,
} from "@/lib/services/fulfilment";
import { AccessGate } from "@/components/AccessGate";
import { Board, Empty, OpsShell, Section, StatCard, StatRow } from "@/components/OpsShell";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionButton } from "@/components/ActionButton";
import { ScanForm } from "@/components/ScanForm";
import { QrLabel } from "@/components/QrLabel";
import { ProductBarcodeLabels } from "@/components/ProductBarcodeLabels";
import { PickPackQueue, type QueueRow } from "@/components/warehouse/PickPackQueue";

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

  // Flattened for the client queue: plain values only, no Prisma objects or Dates.
  const queueRows: QueueRow[] = pickPack.map((s) => {
    const addr = s.order.shippingAddress as unknown as Addr;
    return {
      id: s.id,
      shipmentNumber: s.shipmentNumber,
      status: s.status,
      orderNumber: s.order.orderNumber,
      orderStatus: s.order.status,
      warehouseName: s.warehouse.name,
      destination: `${addr.name} (${addr.city} ${addr.pincode})`,
      paymentType: s.paymentType,
      priority: s.priority.level,
      priorityReason: s.priority.reason,
      issues: s.issues,
      parcels: s.orderProgress.parcels,
      parcelsReady: s.orderProgress.ready,
      items: s.items.map((i) => ({
        id: i.id,
        sku: i.sku,
        productName: i.productName,
        variantLabel: i.variantLabel,
        quantity: i.quantity,
        pickedQty: i.pickedQty,
      })),
    };
  });

  return (
    <OpsShell title="Warehouse management" subtitle="Chennai & Thanjavur fulfilment centres" tabs={TABS} active="/warehouse">
      <StatRow>
        <StatCard label="Work queue" value={stats.ordersOnFloor} hint="Orders on the floor" />
        <StatCard
          label="High priority"
          value={stats.highPriority}
          hint={`Past the ${PICK_SLA_HOURS}h pick SLA`}
          tone={stats.highPriority ? "warn" : undefined}
        />
        <StatCard
          label="Stock checks"
          value={stats.blocked}
          hint="Short of reserved or picked units"
          tone={stats.blocked ? "warn" : undefined}
        />
        <StatCard label="Packed units" value={stats.packedUnits} hint="Ready to ship" />
      </StatRow>

      <Board className="xl:grid-cols-2">
      <Section
        title="Pick & pack queue"
        hint="Sorted by priority. Scan unit by unit, pick a whole parcel, or clear a batch."
      >
        <PickPackQueue rows={queueRows} />
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
