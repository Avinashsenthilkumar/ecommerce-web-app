"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import clsx from "clsx";

/** Reloads the console data without a full page reload. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" onClick={() => start(() => router.refresh())} className="btn-outline btn-sm" aria-label="Refresh data">
      <RotateCw size={13} className={clsx(pending && "animate-spin")} />
      <span className="hidden sm:inline">{pending ? "Refreshing" : "Refresh"}</span>
    </button>
  );
}
