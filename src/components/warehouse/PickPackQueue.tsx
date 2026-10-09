"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, Loader2, PackageCheck, ScanBarcode } from "lucide-react";
import { callApi } from "@/lib/client/api";
import { StatusBadge } from "@/components/StatusBadge";
import { ScanForm } from "@/components/ScanForm";
import { ClientPagination } from "@/components/Pagination";
import { paginate } from "@/lib/paginate";

export type QueueItem = {
  id: string;
  sku: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  pickedQty: number;
};

export type QueueRow = {
  id: string;
  shipmentNumber: string;
  status: string;
  orderNumber: string;
  orderStatus: string;
  warehouseName: string;
  destination: string;
  paymentType: string;
  priority: "HIGH" | "MEDIUM" | "NORMAL";
  priorityReason: string;
  issues: string[];
  parcels: number;
  parcelsReady: number;
  items: QueueItem[];
};

type Filter = "all" | "high" | "blocked" | "packable";
type BulkAction = "pick" | "pack";
type BulkResult = { id: string; shipmentNumber: string; ok: boolean; message: string };

const ROWS_PER_PAGE = 8;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high", label: "High priority" },
  { key: "packable", label: "Ready to pack" },
  { key: "blocked", label: "Stock check" },
];

const PRIORITY_STYLE: Record<QueueRow["priority"], string> = {
  HIGH: "bg-red-50 text-sale",
  MEDIUM: "bg-amberSoft text-amber",
  NORMAL: "bg-mist text-slate",
};

const PRIORITY_LABEL: Record<QueueRow["priority"], string> = {
  HIGH: "High",
  MEDIUM: "Due soon",
  NORMAL: "Normal",
};

function units(row: QueueRow) {
  const total = row.items.reduce((a, i) => a + i.quantity, 0);
  const picked = row.items.reduce((a, i) => a + Math.min(i.pickedQty, i.quantity), 0);
  return { total, picked };
}

/**
 * The pick & pack floor queue.
 *
 * Sorted by priority on the server, filterable, and selectable so a supervisor
 * can clear a batch of parcels in one action instead of one scan at a time.
 * Anything short of stock is flagged before it is actioned and is excluded from
 * a bulk run, so a batch never half-completes for a reason nobody saw.
 */
export function PickPackQueue({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<BulkAction | null>(null);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [summary, setSummary] = useState<{ ok: boolean; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();

  const visible = useMemo(() => {
    switch (filter) {
      case "high":
        return rows.filter((r) => r.priority === "HIGH");
      case "blocked":
        return rows.filter((r) => r.issues.length > 0);
      case "packable":
        return rows.filter((r) => r.status === "PICKED" && r.issues.length === 0);
      default:
        return rows;
    }
  }, [rows, filter]);

  // paginate() clamps a page number past the end, so a filter that shrinks the
  // list cannot leave the queue showing nothing.
  const paged = paginate(visible, page, ROWS_PER_PAGE);
  const selectable = visible.filter((r) => r.issues.length === 0);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));

  const chosen = rows.filter((r) => selected.has(r.id));
  const canPick = chosen.filter((r) => r.status === "ALLOCATED").length;
  const canPack = chosen.filter((r) => r.status === "PICKED").length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)));
  }

  async function runBulk(action: BulkAction) {
    // Only send shipments the action can actually apply to, so the response is
    // about real failures rather than parcels that were never eligible.
    const ids = chosen
      .filter((r) => (action === "pick" ? r.status === "ALLOCATED" : r.status === "PICKED"))
      .map((r) => r.id);
    if (ids.length === 0) return;

    setBusy(action);
    setResults(null);
    setSummary(null);
    try {
      const data = await callApi<{ results: BulkResult[]; message: string; failed: number }>(
        "/api/warehouse",
        "POST",
        { action: "bulk", bulkAction: action, shipmentIds: ids },
      );
      setResults(data.results);
      setSummary({ ok: data.failed === 0, text: data.message });
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (err) {
      setSummary({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function pickAll(id: string) {
    setBusy("pick");
    setSummary(null);
    setResults(null);
    try {
      const data = await callApi<{ message: string }>("/api/warehouse", "POST", {
        action: "pickAll",
        shipmentId: id,
      });
      setSummary({ ok: true, text: data.message });
      startTransition(() => router.refresh());
    } catch (err) {
      setSummary({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function packOne(id: string) {
    setBusy("pack");
    setSummary(null);
    setResults(null);
    try {
      await callApi("/api/warehouse", "POST", { action: "pack", shipmentId: id });
      setSummary({ ok: true, text: "Shipment packed." });
      startTransition(() => router.refresh());
    } catch (err) {
      setSummary({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate">
        Nothing on the floor. Allocate an order from the admin console.
      </p>
    );
  }

  return (
    <div>
      {/* Filters + bulk bar */}
      <div className="sticky top-0 z-10 space-y-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const count =
              f.key === "all"
                ? rows.length
                : f.key === "high"
                  ? rows.filter((r) => r.priority === "HIGH").length
                  : f.key === "blocked"
                    ? rows.filter((r) => r.issues.length > 0).length
                    : rows.filter((r) => r.status === "PICKED" && r.issues.length === 0).length;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilter(f.key);
                  setPage(1);
                }}
                aria-pressed={filter === f.key}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  filter === f.key
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-white text-slate hover:border-ink/40",
                )}
              >
                {f.label} <span className="tabular">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={selectable.length === 0}
              className="h-4 w-4 accent-[rgb(var(--c-ink))]"
            />
            Select all {selectable.length > 0 && <span className="tabular">({selectable.length})</span>}
          </label>

          <span className="text-xs text-slate tabular">{selected.size} selected</span>

          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runBulk("pick")}
              disabled={!!busy || canPick === 0}
              className="btn-primary btn-sm inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              {busy === "pick" ? <Loader2 size={14} className="animate-spin" /> : <ScanBarcode size={14} />}
              Pick {canPick > 0 && <span className="tabular">{canPick}</span>}
            </button>
            <button
              type="button"
              onClick={() => runBulk("pack")}
              disabled={!!busy || canPack === 0}
              className="btn-outline btn-sm inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              {busy === "pack" ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
              Pack {canPack > 0 && <span className="tabular">{canPack}</span>}
            </button>
          </div>
        </div>

        {summary && (
          <p
            role="status"
            className={clsx("text-xs font-medium", summary.ok ? "text-pine" : "text-sale")}
          >
            {summary.text}
          </p>
        )}

        {results && results.length > 0 && (
          <ul className="max-h-28 space-y-1 overflow-y-auto rounded-xl bg-mist/60 px-3 py-2 text-xs">
            {results.map((r) => (
              <li key={r.id} className="flex justify-between gap-3">
                <span className="font-medium tabular">{r.shipmentNumber}</span>
                <span className={r.ok ? "text-pine" : "text-sale"}>{r.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {paged.items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate">
          No shipments match this filter.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {paged.items.map((row) => {
            const { total, picked } = units(row);
            const blocked = row.issues.length > 0;
            const nextSku = row.items.find((i) => i.pickedQty < i.quantity)?.sku;
            return (
              <li key={row.id} className="grid gap-5 px-4 py-5 2xl:grid-cols-[1fr_1.1fr]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      disabled={blocked}
                      aria-label={`Select ${row.shipmentNumber}`}
                      className="h-4 w-4 accent-[rgb(var(--c-ink))] disabled:opacity-30"
                    />
                    <p className="text-sm font-bold tabular">{row.shipmentNumber}</p>
                    <StatusBadge status={row.status} />
                    <span
                      title={row.priorityReason}
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        PRIORITY_STYLE[row.priority],
                      )}
                    >
                      {PRIORITY_LABEL[row.priority]}
                    </span>
                    {row.paymentType === "COD" && (
                      <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-slate">
                        COD
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate">
                    {row.orderNumber}, {row.warehouseName}, to {row.destination}
                  </p>

                  {/* Order status tracking: where the whole order stands, not
                      just this parcel. */}
                  <p className="mt-1 text-xs text-slate">
                    Order status{" "}
                    <span className="font-medium text-ink">
                      {row.orderStatus.replaceAll("_", " ").toLowerCase()}
                    </span>
                    {row.parcels > 1 && (
                      <>
                        {" · "}
                        <span className="tabular">
                          parcel {row.parcelsReady + 1} of {row.parcels}
                        </span>
                      </>
                    )}
                    {" · "}
                    <span title={row.priorityReason}>{row.priorityReason}</span>
                  </p>

                  <div
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-mist"
                    aria-label={`${picked} of ${total} units picked`}
                  >
                    <div
                      className="h-full bg-pine transition-all"
                      style={{ width: `${total ? (picked / total) * 100 : 0}%` }}
                    />
                  </div>

                  <ul className="mt-3 space-y-1.5 text-sm">
                    {row.items.map((i) => (
                      <li key={i.id} className="flex justify-between gap-3 tabular">
                        <span className="min-w-0 truncate">
                          <b>{i.sku}</b>{" "}
                          <span className="text-slate">
                            {i.productName} ({i.variantLabel})
                          </span>
                        </span>
                        <span
                          className={
                            i.pickedQty >= i.quantity ? "font-bold text-pine" : "text-slate"
                          }
                        >
                          {i.pickedQty}/{i.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {blocked && (
                    <div className="mt-3 rounded-xl bg-amberSoft px-3 py-2 text-xs text-amber">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle size={13} /> Stock check needed
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {row.issues.map((issue) => (
                          <li key={issue} className="tabular">
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-3 2xl:border-l 2xl:border-line 2xl:pl-5">
                  {blocked ? (
                    <p className="text-sm text-slate">
                      Fix the stock record before picking this parcel. Bulk actions skip it.
                    </p>
                  ) : row.status === "ALLOCATED" ? (
                    <>
                      <ScanForm
                        url="/api/warehouse"
                        body={{ action: "pick", shipmentId: row.id }}
                        placeholder="Scan item barcode (SKU)"
                        buttonLabel="Record pick"
                        demoValue={nextSku}
                        demoLabel="Use next SKU"
                      />
                      <button
                        type="button"
                        onClick={() => pickAll(row.id)}
                        disabled={!!busy}
                        className="btn-outline btn-sm w-full justify-center disabled:opacity-40"
                      >
                        Pick all {total - picked} remaining unit(s)
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-pine">All {total} unit(s) picked and verified.</p>
                      <button
                        type="button"
                        onClick={() => packOne(row.id)}
                        disabled={!!busy}
                        className="btn-primary btn-sm w-full justify-center disabled:opacity-40"
                      >
                        Confirm packed
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ClientPagination
        className="px-4 pb-4"
        page={paged.page}
        pageCount={paged.pageCount}
        total={paged.total}
        pageSize={paged.pageSize}
        label="shipments"
        onPageChange={setPage}
      />
    </div>
  );
}
