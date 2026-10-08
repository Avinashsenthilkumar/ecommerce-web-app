"use client";

import { useState } from "react";
import { Download } from "lucide-react";

export function AdminSalesReportDownload({ years }: { years: number[] }) {
  const currentYear = new Date().getFullYear();
  const options = [...new Set([currentYear, ...years])].sort((a, b) => b - a);
  const [period, setPeriod] = useState<"day" | "month" | "year">("month");
  const [year, setYear] = useState(currentYear);
  const href = `/api/admin/analytics/report?period=${period}${
    period === "year" ? "" : `&year=${year}`
  }`;

  return (
    <div className="flex flex-wrap items-end gap-3 p-4">
      <label className="grid gap-1 text-xs font-medium text-slate">
        Report frequency
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value as "day" | "month" | "year")}
          className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink"
        >
          <option value="day">Daily</option>
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
        </select>
      </label>
      {period !== "year" && (
        <label className="grid gap-1 text-xs font-medium text-slate">
          Year
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink"
          >
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      )}
      <a href={href} className="btn-primary btn-sm inline-flex min-h-10 items-center gap-2">
        <Download size={15} />
        Download CSV
      </a>
      <p className="basis-full text-xs text-slate">
        Includes sales and revenue by period, plus product-level performance for the selected year. Cancelled orders are excluded.
      </p>
    </div>
  );
}
