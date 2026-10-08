"use client";

import { useState } from "react";
import { inr } from "@/lib/format";

type TrendPoint = { label: string; unitsSold: number; revenue: number };
type Trends = { daily: TrendPoint[]; weekly: TrendPoint[]; monthly: TrendPoint[] };

const PERIODS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
] as const;

export function VendorTrendCharts({ trends }: { trends: Trends }) {
  const [period, setPeriod] = useState<keyof Trends>("daily");
  const points = trends[period];
  const maxUnits = Math.max(1, ...points.map((point) => point.unitsSold));
  const maxRevenue = Math.max(1, ...points.map((point) => point.revenue));

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Sales trend period">
        {PERIODS.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={period === option.key}
            onClick={() => setPeriod(option.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              period === option.key ? "bg-ink text-white" : "bg-mist text-slate hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <TrendList
          title="Units sold"
          points={points}
          value={(point) => point.unitsSold}
          max={maxUnits}
          format={(value) => value.toLocaleString("en-IN")}
          barClass="bg-pine"
        />
        <TrendList
          title="Revenue"
          points={points}
          value={(point) => point.revenue}
          max={maxRevenue}
          format={(value) => inr(value)}
          barClass="bg-amber"
        />
      </div>
    </div>
  );
}

function TrendList({
  title,
  points,
  value,
  max,
  format,
  barClass,
}: {
  title: string;
  points: TrendPoint[];
  value: (point: TrendPoint) => number;
  max: number;
  format: (value: number) => string;
  barClass: string;
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold text-slate">{title}</h3>
      <ul className="space-y-2">
        {points.map((point) => {
          const amount = value(point);
          return (
            <li key={point.label} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-xs">
              <span className="text-slate">{point.label}</span>
              <span
                className="h-2 overflow-hidden rounded-full bg-mist"
                role="img"
                aria-label={`${point.label}: ${format(amount)}`}
              >
                <span
                  className={`block h-full rounded-full ${barClass}`}
                  style={{ width: `${(amount / max) * 100}%` }}
                />
              </span>
              <span className="min-w-12 text-right font-medium tabular">{format(amount)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
