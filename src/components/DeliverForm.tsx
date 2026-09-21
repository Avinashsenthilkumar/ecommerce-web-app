"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { callApi } from "@/lib/client/api";

const FAIL_REASONS = ["Customer not available", "Address not found", "Customer refused delivery", "Cash not ready"];

type Props = {
  shipmentId: string;
  isCod: boolean;
  codAmount: number;
  /** Demo helpers — stand in for scanning the label and asking the customer */
  demoCode: string;
  demoOtp: string;
};

export function DeliverForm({ shipmentId, isCod, codAmount, demoCode, demoOtp }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState("");
  const [cash, setCash] = useState("");
  const [reason, setReason] = useState(FAIL_REASONS[0]);
  const [mode, setMode] = useState<"deliver" | "fail">("deliver");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "deliver") {
        await callApi("/api/courier", "POST", {
          action: "deliver",
          shipmentId,
          code,
          otp,
          codCollected: isCod ? Number(cash) : undefined,
        });
      } else {
        await callApi("/api/courier", "POST", { action: "fail", shipmentId, reason });
      }
      start(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-1 rounded-full bg-mist p-1 text-xs font-semibold" role="tablist">
        {(["deliver", "fail"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full px-3 py-1.5 ${mode === m ? "bg-white text-ink shadow-sm" : "text-slate"}`}
          >
            {m === "deliver" ? "Deliver" : "Could not deliver"}
          </button>
        ))}
      </div>

      {mode === "deliver" ? (
        <>
          <div className="flex gap-2">
            <input className="input tabular" placeholder="Scan parcel QR" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Parcel QR" />
            <button type="button" onClick={() => setCode(demoCode)} className="btn-outline btn-sm whitespace-nowrap">Use label</button>
          </div>
          <div className="flex gap-2">
            <input
              className="input tabular tracking-[0.3em]"
              placeholder="Customer OTP"
              inputMode="numeric"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              aria-label="Customer OTP"
            />
            <button type="button" onClick={() => setOtp(demoOtp)} className="btn-outline btn-sm whitespace-nowrap">Use OTP</button>
          </div>
          {isCod && (
            <div>
              <label className="label" htmlFor={`cash-${shipmentId}`}>Cash collected (due ₹{codAmount.toLocaleString("en-IN")})</label>
              <input id={`cash-${shipmentId}`} className="input tabular" inputMode="numeric" value={cash} onChange={(e) => setCash(e.target.value.replace(/\D/g, ""))} />
            </div>
          )}
          <button disabled={busy || !code || otp.length !== 4 || (isCod && !cash)} className="btn-pine w-full">
            {busy ? "Saving…" : "Mark delivered"}
          </button>
        </>
      ) : (
        <>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason">
            {FAIL_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <button disabled={busy} className="btn-danger w-full">{busy ? "Saving…" : "Record failed attempt"}</button>
          <p className="text-xs text-slate">After three failed attempts the parcel is marked failed for return to origin.</p>
        </>
      )}
      {error && <p className="text-xs font-medium text-sale">{error}</p>}
    </form>
  );
}
