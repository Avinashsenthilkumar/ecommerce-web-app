"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Loader2, ScanLine } from "lucide-react";
import { callApi } from "@/lib/client/api";
import { ScanForm } from "./ScanForm";

type Result = { code: string; ok: boolean; action?: string; message: string };

/**
 * The desk a hub manager works at: pick the hub you are standing in, then scan
 * one parcel or a whole trolley.
 *
 * Bulk mode takes a list — pasted from a manifest or fired in by a scanner gun,
 * one code per line — and reports each parcel's outcome separately, because a
 * single unreadable barcode should not hide the ninety-nine that went through.
 */
export function HubScanDesk({ hubs }: { hubs: { id: string; name: string }[] }) {
  const router = useRouter();
  const [hubId, setHubId] = useState(hubs[0]?.id ?? "");
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [codes, setCodes] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{ ok: boolean; text: string } | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [, startTransition] = useTransition();

  const lines = codes
    .split(/[\n,]/)
    .map((c) => c.trim())
    .filter(Boolean);

  async function scanAll(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return;
    setBusy(true);
    setSummary(null);
    setResults(null);
    try {
      const data = await callApi<{ results: Result[]; message: string; failed: number }>(
        "/api/hub",
        "POST",
        { hubId, codes: lines },
      );
      setResults(data.results);
      setSummary({ ok: data.failed === 0, text: data.message });
      // Keep only the codes that still need attention, so a retry is one click.
      setCodes(data.results.filter((r) => !r.ok).map((r) => r.code).join("\n"));
      startTransition(() => router.refresh());
    } catch (err) {
      setSummary({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[14rem_1fr] md:items-start">
        <div>
          <label className="label" htmlFor="hub-select">
            Scanning at
          </label>
          <select
            id="hub-select"
            className="input"
            value={hubId}
            onChange={(e) => setHubId(e.target.value)}
          >
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="label mb-0">Parcel</span>
            <div className="flex gap-1 rounded-full bg-mist p-0.5">
              {(["single", "bulk"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setSummary(null);
                    setResults(null);
                  }}
                  aria-pressed={mode === m}
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs transition-colors",
                    mode === m ? "bg-white font-medium text-ink shadow-sm" : "text-slate",
                  )}
                >
                  {m === "single" ? "One parcel" : "Bulk"}
                </button>
              ))}
            </div>
          </div>

          {mode === "single" ? (
            <ScanForm
              key={hubId}
              url="/api/hub"
              body={{ hubId }}
              placeholder="Scan QR or type tracking number"
              buttonLabel="Scan"
            />
          ) : (
            <form onSubmit={scanAll} className="space-y-2">
              <div className="relative">
                <ScanLine
                  size={15}
                  className="pointer-events-none absolute left-3 top-3 text-slate"
                  aria-hidden
                />
                <textarea
                  value={codes}
                  onChange={(e) => setCodes(e.target.value)}
                  rows={4}
                  placeholder={"One code per line\nTRK12345678\nTRK87654321"}
                  aria-label="Parcel codes, one per line"
                  className="input min-h-[6rem] resize-y py-2 pl-9 font-medium tabular"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={busy || lines.length === 0}
                  className="btn-primary btn-sm inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  Scan {lines.length > 0 && <span className="tabular">{lines.length}</span>} parcel
                  {lines.length === 1 ? "" : "s"}
                </button>
                {codes && (
                  <button
                    type="button"
                    onClick={() => {
                      setCodes("");
                      setResults(null);
                      setSummary(null);
                    }}
                    className="btn-outline btn-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          )}
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
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-white px-3 py-2 text-xs">
          {results.map((r, i) => (
            <li key={`${r.code}-${i}`} className="flex flex-wrap justify-between gap-2">
              <span className="font-medium tabular">{r.code}</span>
              <span className={r.ok ? "text-pine" : "text-sale"}>{r.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
