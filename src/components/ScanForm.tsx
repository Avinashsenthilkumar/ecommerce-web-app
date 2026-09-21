"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";
import { callApi } from "@/lib/client/api";

type Props = {
  url: string;
  body: Record<string, unknown>;
  placeholder: string;
  buttonLabel: string;
  /** Demo helper: a value the "Use code" button fills in (stands in for a hardware scanner). */
  demoValue?: string;
  demoLabel?: string;
  field?: string;
};

/** Text input that behaves like a barcode scanner field: Enter submits, clears on success. */
export function ScanForm({ url, body, placeholder, buttonLabel, demoValue, demoLabel = "Use code", field = "code" }: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const data = await callApi<{ message?: string }>(url, "POST", { ...body, [field]: value.trim() });
      setMsg({ ok: true, text: data?.message ?? "Scan recorded." });
      setValue("");
      start(() => router.refresh());
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <ScanLine size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="input pl-9 font-medium tabular"
            aria-label={placeholder}
          />
        </div>
        {demoValue && (
          <button type="button" onClick={() => setValue(demoValue)} className="btn-outline btn-sm">
            {demoLabel}
          </button>
        )}
        <button type="submit" disabled={busy || !value.trim()} className="btn-primary btn-sm">
          {busy ? "Scanning…" : buttonLabel}
        </button>
      </div>
      {msg && <p className={`text-xs font-medium ${msg.ok ? "text-pine" : "text-sale"}`}>{msg.text}</p>}
    </form>
  );
}
