import { Star } from "lucide-react";
import { discountPct, inr } from "@/lib/format";

/** Large price row used on the product page: ₹1,299  ₹1,799  28% off */
export function Price({ price, mrp }: { price: number; mrp: number; size?: "md" | "lg" }) {
  const off = discountPct(mrp, price);
  return (
    <div className="flex flex-wrap items-baseline gap-3 tabular">
      <span className="font-display text-[2rem] font-medium tracking-[-0.02em]">{inr(price)}</span>
      {off > 0 && (
        <>
          <span className="text-sm text-slate line-through">{inr(mrp)}</span>
          <span className="text-sm font-medium text-pine">{off}% off</span>
        </>
      )}
    </div>
  );
}

/** Stacked price block used on product cards (right aligned). */
export function CardPrice({ price, mrp }: { price: number; mrp: number }) {
  const off = discountPct(mrp, price);
  return (
    <div className="shrink-0 text-right leading-tight tabular">
      <p className="text-[15px] font-medium">{inr(price)}</p>
      {off > 0 && (
        <>
          <p className="mt-0.5 text-xs text-slate line-through">{inr(mrp)}</p>
          <p className="mt-0.5 text-xs text-pine">{off}% off</p>
        </>
      )}
    </div>
  );
}

export function Rating({ avg, count, suffix = "" }: { avg: number; count: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate tabular">
      <Star size={12} className="fill-ink text-ink" aria-hidden />
      <span>{avg.toFixed(1)}</span>
      <span className="text-line" aria-hidden>|</span>
      <span>
        {count.toLocaleString("en-IN")}
        {suffix}
      </span>
    </div>
  );
}
