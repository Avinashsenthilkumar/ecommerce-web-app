import { staffGate } from "@/lib/auth";
import { getHubOverview, nextHubAction } from "@/lib/services/network";
import { humanize } from "@/lib/format";
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

export default async function HubPage() {
  const { user, allowed } = await staffGate("HUB");
  if (!allowed) return <AccessGate need="HUB" user={user} />;
  const { hubs, network, stats } = await getHubOverview();

  return (
    <OpsShell title="Hub management" subtitle={hubs.map((h) => h.name.replace(" Delivery Hub", "").replace(" Hub", "")).join(", ")} tabs={TABS} active="/hub">
      <StatRow>
        <StatCard label="In network" value={stats.inNetwork} hint="Parcels between hubs" />
        <StatCard label="Awaiting intake" value={stats.awaitingIntake} hint="Scan on arrival" tone={stats.awaitingIntake ? "warn" : undefined} />
        <StatCard label="Orders today" value={stats.ordersToday} hint="Distinct orders received" tone="pine" />
        <StatCard
          label="Scanned today"
          value={`${stats.receivedToday}/${stats.dispatchedToday}`}
          hint="Received / dispatched"
        />
      </StatRow>

      <Board className="xl:grid-cols-[16rem_1fr]">
      {/* Per-hub counts: what a hub manager is accountable for today, and the
          running total the hub has handled. */}
      <div className="grid content-start gap-3 md:grid-cols-3 xl:grid-cols-1 xl:overflow-y-auto">
        {hubs.map((h) => (
          <div key={h.id} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs font-semibold text-slate">{TYPE_LABEL[h.type]}</p>
            <p className="mt-1 text-lg font-bold">{h.name}</p>
            <p className="mt-2 text-sm text-slate">
              <b className="text-ink tabular">{h.counts.atHub}</b> parcel(s) at this hub
            </p>

            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
              {[
                ["Received", h.counts.receivedToday],
                ["Sorted", h.counts.sortedToday],
                ["Sent", h.counts.dispatchedToday],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-[11px] text-slate">{label}</dt>
                  <dd className="text-base font-semibold tabular">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-3 text-[11px] text-slate">
              <b className="text-ink tabular">{h.counts.ordersToday}</b> order(s) today ·{" "}
              <b className="text-ink tabular">{h.counts.totalHandled}</b> handled all time
            </p>
          </div>
        ))}
      </div>

      <Section title="Parcel scan desk" hint="Receive, sort and dispatch each leg">
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
