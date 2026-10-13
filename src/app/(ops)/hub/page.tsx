import { staffGate } from "@/lib/auth";
import { getHubOverview, nextHubAction } from "@/lib/services/network";
import { fmtDateTime, humanize } from "@/lib/format";
import { AccessGate } from "@/components/AccessGate";
import { Board, Empty, OpsShell, Section, StatCard, StatRow } from "@/components/OpsShell";
import { StatusBadge } from "@/components/StatusBadge";
import { ScanForm } from "@/components/ScanForm";
import { HubScanDesk } from "@/components/HubScanDesk";

export const metadata = { title: "Hub management — intake, sorting & dispatch | subsel" };

const TABS = [
  { href: "/hub", label: "Hubs" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/warehouse", label: "Warehouse" },
  { href: "/courier", label: "Courier" },
];

const TYPE_LABEL = { ORIGIN: "Origin hub", SORTING: "Sorting hub", DELIVERY: "Delivery hub" } as const;
const DISPATCH_STAGES = [
  { label: "Staged", statuses: ["ALLOCATED"] },
  { label: "Picked", statuses: ["PICKED"] },
  { label: "Packed", statuses: ["PACKED"] },
  { label: "Labelled", statuses: ["LABELLED"] },
  { label: "Dispatched", statuses: ["IN_TRANSIT", "AT_HUB", "OUT_FOR_DELIVERY"] },
  { label: "Hub progress", statuses: ["AT_HUB", "OUT_FOR_DELIVERY"] },
  { label: "Last mile", statuses: ["OUT_FOR_DELIVERY"] },
] as const;

function stageIndex(status: string) {
  switch (status) {
    case "ALLOCATED":
      return 0;
    case "PICKED":
      return 1;
    case "PACKED":
      return 2;
    case "LABELLED":
      return 3;
    case "IN_TRANSIT":
      return 4;
    case "AT_HUB":
      return 5;
    case "OUT_FOR_DELIVERY":
      return 6;
    default:
      return -1;
  }
}

export default async function HubPage() {
  const { user, allowed } = await staffGate("HUB");
  if (!allowed) return <AccessGate need="HUB" user={user} />;
  const { hubs, network, stats } = await getHubOverview();

  return (
    <OpsShell title="Hub management" subtitle={hubs.map((h) => h.name.replace(" Delivery Hub", "").replace(" Hub", "")).join(", ")} tabs={TABS} active="/hub">
      <StatRow>
        <StatCard label="In network" value={stats.inNetwork} hint="Parcels between hubs" />
        <StatCard label="Awaiting intake" value={stats.awaitingIntake} hint="Scan on arrival" tone={stats.awaitingIntake ? "warn" : undefined} />
        <StatCard label="Out for delivery" value={stats.outForDelivery} hint="Last mile" />
        <StatCard label="Hubs online" value={stats.hubsOnline} hint="Origin, sorting, delivery" tone="pine" />
      </StatRow>

      <Board className="xl:grid-cols-[16rem_1fr]">
      <div className="grid content-start gap-3 md:grid-cols-3 xl:grid-cols-1 xl:overflow-y-auto">
        {hubs.map((h) => (
          <div key={h.id} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs font-semibold text-slate">{TYPE_LABEL[h.type]}</p>
            <p className="mt-1 text-lg font-bold">{h.name}</p>
            <p className="mt-2 text-sm text-slate">
              <b className="text-ink tabular">{h._count.currentShipments}</b> parcel(s) at this hub
            </p>
          </div>
        ))}
      </div>

      <Section title="Order staging & parcel progress" hint="Follow every active shipment from warehouse staging through hub dispatch and last-mile handover">
        <div className="border-b border-line bg-mist/40 px-5 py-4">
          <HubScanDesk hubs={hubs.map((h) => ({ id: h.id, name: h.name }))} />
        </div>
        {network.length === 0 ? (
          <Empty>No parcels in the network. Dispatch one from the warehouse.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {network.map((s) => {
              const next = nextHubAction(s);
              return (
                <li key={s.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_1fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold tabular">{s.shipmentNumber}</p>
                      <span className="text-xs font-medium text-slate tabular">{s.trackingNumber}</span>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-xs text-slate">{s.order.orderNumber}</p>
                    <p className="mt-1 text-xs text-slate">
                      {s.items.map((item) => `${item.quantity} × ${item.productName} (${item.variantLabel})`).join("; ")}
                    </p>
                    <ol
                      aria-label={`Shipment progress: ${s.status.replaceAll("_", " ").toLowerCase()}`}
                      className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7"
                    >
                      {DISPATCH_STAGES.map((stage, index) => {
                        const current = stageIndex(s.status);
                        const done = index < current;
                        const active = index === current;
                        return (
                          <li
                            key={stage.label}
                            className={
                              active
                                ? "rounded-xl border border-pine/20 bg-pineSoft px-2.5 py-2 text-xs font-semibold text-pine"
                                : done
                                  ? "rounded-xl border border-pine/10 bg-pineSoft/50 px-2.5 py-2 text-xs font-medium text-pine"
                                  : "rounded-xl border border-line bg-white px-2.5 py-2 text-xs text-slate"
                            }
                          >
                            <span className="block text-[10px] uppercase tracking-wide opacity-70">
                              Step {index + 1}
                            </span>
                            {stage.label}
                          </li>
                        );
                      })}
                    </ol>
                    <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                      <li className="rounded-full bg-mist px-2.5 py-1 font-semibold text-slate">{s.warehouse.name}</li>
                      {s.legs.map((l) => (
                        <li key={l.id} className="flex items-center gap-1.5">
                          <span className="text-slate" aria-hidden>→</span>
                          <span
                            className={
                              l.status === "DEPARTED"
                                ? "rounded-full bg-pineSoft px-2.5 py-1 font-semibold text-pine"
                                : l.status === "PENDING"
                                  ? "rounded-full border border-dashed border-line px-2.5 py-1 text-slate"
                                  : "rounded-full bg-ink px-2.5 py-1 font-semibold text-white"
                            }
                            title={humanize(l.status)}
                          >
                            {l.hub.name}
                          </span>
                        </li>
                      ))}
                    </ol>
                    {s.scans.length > 0 && (
                      <div className="mt-4 rounded-xl bg-mist/60 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate">Recent shipment scans</p>
                        <ul className="mt-2 space-y-1.5">
                          {s.scans.map((scan) => (
                            <li key={scan.id} className="flex flex-wrap justify-between gap-x-3 text-xs">
                              <span className="font-medium text-ink">
                                {humanize(scan.type)} · {scan.locationLabel}
                                {scan.remarks && <span className="font-normal text-slate"> — {scan.remarks}</span>}
                              </span>
                              <time className="text-slate">{fmtDateTime(scan.createdAt)}</time>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {next && (
                    <div className="lg:border-l lg:border-line lg:pl-5">
                      <p className="mb-2 text-xs font-semibold text-slate">
                        Next: {next.label} at {next.hubName}
                      </p>
                      <ScanForm
                        url="/api/hub"
                        body={{ hubId: next.hubId }}
                        placeholder="Scan QR or tracking number"
                        buttonLabel={next.label}
                        demoValue={s.trackingNumber}
                        demoLabel="Use tracking no."
                      />
                    </div>
                  )}
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
