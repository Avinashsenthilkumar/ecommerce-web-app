import clsx from "clsx";
import { humanize } from "@/lib/format";

const TONE: Record<string, string> = {
  // positive
  DELIVERED: "bg-pineSoft text-pine",
  PAID: "bg-pineSoft text-pine",
  SUCCESS: "bg-pineSoft text-pine",
  COMPLETED: "bg-pineSoft text-pine",
  QC_PASSED: "bg-pineSoft text-pine",
  APPROVED: "bg-pineSoft text-pine",
  ACTIVE: "bg-pineSoft text-pine",
  LIVE: "bg-pineSoft text-pine",
  // in motion
  IN_TRANSIT: "bg-sky-50 text-sky-800",
  AT_HUB: "bg-sky-50 text-sky-800",
  OUT_FOR_DELIVERY: "bg-sky-50 text-sky-800",
  SHIPPED: "bg-sky-50 text-sky-800",
  PROCESSING: "bg-sky-50 text-sky-800",
  PICKED_UP: "bg-sky-50 text-sky-800",
  // needs attention
  PLACED: "bg-amberSoft text-amber",
  CONFIRMED: "bg-amberSoft text-amber",
  PENDING: "bg-amberSoft text-amber",
  REQUESTED: "bg-amberSoft text-amber",
  INITIATED: "bg-amberSoft text-amber",
  PICKUP_SCHEDULED: "bg-amberSoft text-amber",
  PENDING_REVIEW: "bg-amberSoft text-amber",
  // negative
  CANCELLED: "bg-red-50 text-sale",
  FAILED: "bg-red-50 text-sale",
  REJECTED: "bg-red-50 text-sale",
  QC_FAILED: "bg-red-50 text-sale",
  SUSPENDED: "bg-red-50 text-sale",
  REFUNDED: "bg-mist text-slate",
  PARTIALLY_REFUNDED: "bg-mist text-slate",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        TONE[status] ?? "bg-mist text-ink",
        className,
      )}
    >
      {humanize(status)}
    </span>
  );
}
