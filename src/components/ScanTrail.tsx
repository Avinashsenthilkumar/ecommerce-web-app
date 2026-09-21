import clsx from "clsx";
import { fmtDateTime } from "@/lib/format";

const LABEL: Record<string, string> = {
  PICK: "Picked",
  PACK: "Packed",
  LABEL: "QR label generated",
  HANDOVER: "Handed to courier",
  HUB_INTAKE: "Received at hub",
  HUB_SORT: "Sorted",
  HUB_DISPATCH: "Left hub",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  DELIVERY_FAILED: "Delivery attempt failed",
};

type Scan = { id: string; type: string; locationLabel: string; createdAt: Date; remarks: string | null; qrVerified: boolean };

/** Customer-facing tracking timeline built from scan events (pick scans collapsed into one). */
export function ScanTrail({ scans }: { scans: Scan[] }) {
  const rows: Scan[] = [];
  for (const s of scans) {
    if (s.type === "PICK" && rows[rows.length - 1]?.type === "PICK") {
      rows[rows.length - 1] = s;
      continue;
    }
    rows.push(s);
  }
  if (rows.length === 0) return <p className="text-sm text-slate">Waiting for the first scan at the warehouse.</p>;

  const latest = rows.length - 1;
  return (
    <ol className="relative space-y-4 pl-6">
      <span className="absolute bottom-2 left-[7px] top-2 w-px bg-line" aria-hidden />
      {rows
        .map((s, i) => ({ s, i }))
        .reverse()
        .map(({ s, i }) => (
          <li key={s.id} className="relative">
            <span
              className={clsx(
                "absolute -left-6 top-1 h-[15px] w-[15px] rounded-full border-2",
                i === latest ? "border-pine bg-pine" : "border-line bg-white",
                s.type === "DELIVERY_FAILED" && "border-sale bg-sale",
              )}
              aria-hidden
            />
            <p className={clsx("text-sm font-semibold", i !== latest && "text-ink/80")}>{LABEL[s.type] ?? s.type}</p>
            <p className="text-xs text-slate">
              {s.locationLabel}, {fmtDateTime(s.createdAt)}
              {s.qrVerified && <span className="ml-1.5 font-semibold text-pine">QR verified</span>}
            </p>
          </li>
        ))}
    </ol>
  );
}
