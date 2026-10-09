"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileBarChart, Loader2 } from "lucide-react";
import clsx from "clsx";
import { callApi } from "@/lib/client/api";
import { inr } from "@/lib/format";
import { pageWindow } from "@/lib/paginate";

type Period = "day" | "month" | "year";

type PeriodRow = { period: string; orders: number; unitsSold: number; revenue: number };
type SellerRow = {
  id: string;
  seller: string;
  status: string;
  commissionPercent: number;
  unitsSold: number;
  orders: number;
  revenue: number;
  commission: number;
  payout: number;
};

type Report = {
  period: Period;
  year: number | null;
  periods: PeriodRow[];
  sellers: SellerRow[];
  sellerTotals: { revenue: number; commission: number; payout: number; sellingSellers: number };
  totals: { orders: number; unitsSold: number; revenue: number };
};

const ROWS_PER_PAGE = 12;

function formatPeriod(key: string) {
  if (/^\d{4}$/.test(key)) return key;
  if (/^\d{4}-\d{2}$/.test(key)) {
    return new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${key}-01T00:00:00Z`));
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00Z`));
}

/** Small page control for the client-side report tables. */
function Pager({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Report pages" className="flex flex-wrap items-center gap-1.5 px-4 py-3">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="h-8 rounded-full border border-line px-3 text-xs disabled:opacity-40"
      >
        Prev
      </button>
      {pageWindow(page, pageCount).map((p, i) =>
        p === -1 ? (
          <span key={`gap-${i}`} className="px-1 text-xs text-slate">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={clsx(
              "h-8 min-w-8 rounded-full border px-2.5 text-xs tabular",
              p === page ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        className="h-8 rounded-full border border-line px-3 text-xs disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}

/**
 * Generate and read a sales report on screen, by day, month or year —
 * with the CSV download for the same selection.
 */
export function SalesReportPanel({ years }: { years: number[] }) {
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => [...new Set([currentYear, ...years])].sort((a, b) => b - a),
    [currentYear, years],
  );

  const [period, setPeriod] = useState<Period>("month");
  const [year, setYear] = useState(currentYear);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [periodPage, setPeriodPage] = useState(1);
  const [sellerPage, setSellerPage] = useState(1);
  const [hideEmpty, setHideEmpty] = useState(true);

  const query = `period=${period}${period === "year" ? "" : `&year=${year}`}`;

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const data = await callApi<Report>(`/api/admin/analytics/report?${query}&format=json`, "GET");
      setReport(data);
      setPeriodPage(1);
      setSellerPage(1);
    } catch (e) {
      setError((e as Error).message);
      setReport(null);
    } finally {
      setBusy(false);
    }
  }

  // Show a report straight away instead of an empty panel.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const periodRows = useMemo(() => {
    if (!report) return [];
    const rows = hideEmpty
      ? report.periods.filter((r) => r.orders > 0 || r.unitsSold > 0 || r.revenue > 0)
      : report.periods;
    return [...rows].reverse(); // newest first
  }, [report, hideEmpty]);

  const periodPages = Math.max(1, Math.ceil(periodRows.length / ROWS_PER_PAGE));
  const visiblePeriods = periodRows.slice(
    (Math.min(periodPage, periodPages) - 1) * ROWS_PER_PAGE,
    Math.min(periodPage, periodPages) * ROWS_PER_PAGE,
  );

  const sellerRows = report?.sellers ?? [];
  const sellerPages = Math.max(1, Math.ceil(sellerRows.length / ROWS_PER_PAGE));
  const visibleSellers = sellerRows.slice(
    (Math.min(sellerPage, sellerPages) - 1) * ROWS_PER_PAGE,
    Math.min(sellerPage, sellerPages) * ROWS_PER_PAGE,
  );

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
        <label className="grid gap-1 text-xs font-medium text-slate">
          Group by
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink"
          >
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </label>

        {period !== "year" && (
          <label className="grid gap-1 text-xs font-medium text-slate">
            Year
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink"
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="btn-primary btn-sm inline-flex min-h-10 items-center gap-2"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <FileBarChart size={15} />}
          {busy ? "Generating…" : "Generate report"}
        </button>

        <a
          href={`/api/admin/analytics/report?${query}`}
          className="btn-outline btn-sm inline-flex min-h-10 items-center gap-2"
        >
          <Download size={15} />
          Download CSV
        </a>

        <label className="ml-auto flex items-center gap-2 text-xs text-slate">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => {
              setHideEmpty(e.target.checked);
              setPeriodPage(1);
            }}
            className="h-4 w-4 accent-[rgb(var(--c-ink))]"
          />
          Hide periods with no sales
        </label>
      </div>

      {error && (
        <p role="alert" className="border-b border-line bg-red-50 px-4 py-3 text-sm text-sale">
          {error}
        </p>
      )}

      {report && (
        <>
          {/* Totals */}
          <dl className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
            {[
              ["Orders", report.totals.orders.toLocaleString("en-IN")],
              ["Units sold", report.totals.unitsSold.toLocaleString("en-IN")],
              ["Revenue", inr(report.totals.revenue)],
              ["Seller payout", inr(report.sellerTotals.payout)],
            ].map(([label, value]) => (
              <div key={label} className="bg-white px-4 py-3">
                <dt className="text-xs text-slate">{label}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Period rows */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-mist/50 text-xs text-slate">
                <tr>
                  <th className="px-4 py-2.5 font-medium">
                    {period === "day" ? "Date" : period === "month" ? "Month" : "Year"}
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">Orders</th>
                  <th className="px-4 py-2.5 text-right font-medium">Units</th>
                  <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visiblePeriods.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate">
                      No sales recorded for this selection.
                    </td>
                  </tr>
                ) : (
                  visiblePeriods.map((row) => (
                    <tr key={row.period}>
                      <td className="px-4 py-2.5">{formatPeriod(row.period)}</td>
                      <td className="px-4 py-2.5 text-right tabular">{row.orders}</td>
                      <td className="px-4 py-2.5 text-right tabular">{row.unitsSold}</td>
                      <td className="px-4 py-2.5 text-right font-medium tabular">{inr(row.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pager page={Math.min(periodPage, periodPages)} pageCount={periodPages} onChange={setPeriodPage} />

          {/* Seller rows */}
          <div className="border-t border-line">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <h3 className="text-sm font-semibold">Sales by seller</h3>
              <p className="text-xs text-slate">
                {report.sellerTotals.sellingSellers} of {sellerRows.length} sellers made a sale · commission{" "}
                {inr(report.sellerTotals.commission)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-mist/50 text-xs text-slate">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Seller</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Orders</th>
                    <th className="px-4 py-2.5 text-right font-medium">Units</th>
                    <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                    <th className="px-4 py-2.5 text-right font-medium">Commission</th>
                    <th className="px-4 py-2.5 text-right font-medium">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visibleSellers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate">
                        No sellers yet.
                      </td>
                    </tr>
                  ) : (
                    visibleSellers.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-2.5 font-medium">{s.seller}</td>
                        <td className="px-4 py-2.5 text-xs text-slate">
                          {s.status.replaceAll("_", " ").toLowerCase()}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular">{s.orders}</td>
                        <td className="px-4 py-2.5 text-right tabular">{s.unitsSold}</td>
                        <td className="px-4 py-2.5 text-right font-medium tabular">{inr(s.revenue)}</td>
                        <td className="px-4 py-2.5 text-right tabular text-slate">
                          {inr(s.commission)}
                          <span className="ml-1 text-[11px]">({s.commissionPercent}%)</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular">{inr(s.payout)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager page={Math.min(sellerPage, sellerPages)} pageCount={sellerPages} onChange={setSellerPage} />
          </div>
        </>
      )}
    </div>
  );
}
