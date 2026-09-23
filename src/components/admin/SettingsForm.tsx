"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, RotateCcw, Upload } from "lucide-react";
import { callApi } from "@/lib/client/api";

type Field =
  | { k: string; label: string; type?: "text" | "textarea" | "number" | "color" | "url"; hint?: string; wide?: boolean }
  | { k: string; label: string; type: "toggle"; hint?: string }
  | { k: string; label: string; type: "image"; hint?: string; wide?: boolean }
  | { k: string; label: string; type: "methods"; hint?: string; wide?: boolean };

type Group = { id: string; title: string; hint: string; fields: Field[] };

const PRESETS: { name: string; colors: Record<string, string> }[] = [
  { name: "Warm stone (default)", colors: { "theme.ink": "#1C1917", "theme.pine": "#3F7D58", "theme.paper": "#FAF8F5", "theme.mist": "#F1EEE9", "theme.line": "#E7E2DA" } },
  { name: "Midnight blue", colors: { "theme.ink": "#111827", "theme.pine": "#2563EB", "theme.paper": "#F8FAFC", "theme.mist": "#EEF2F7", "theme.line": "#DDE3EA" } },
  { name: "Flipkart bright", colors: { "theme.ink": "#172337", "theme.pine": "#FB641B", "theme.paper": "#F1F3F6", "theme.mist": "#FFFFFF", "theme.line": "#DDE1E7" } },
  { name: "Forest", colors: { "theme.ink": "#14281F", "theme.pine": "#2F855A", "theme.paper": "#F7FAF7", "theme.mist": "#E9F1EB", "theme.line": "#D7E3DA" } },
];

const PAYMENTS = ["UPI", "CARD", "NETBANKING", "COD"];

export function SettingsForm({ groups, initial }: { groups: Group[]; initial: Record<string, string> }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [values, setValues] = useState(initial);
  const [tab, setTab] = useState(groups[0].id);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const [uploadKey, setUploadKey] = useState<string | null>(null);

  const dirty = Object.keys(values).some((k) => values[k] !== initial[k]);
  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));
  const group = groups.find((g) => g.id === tab)!;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const changed = Object.fromEntries(Object.entries(values).filter(([k, v]) => v !== initial[k]));
      await callApi("/api/admin/settings", "POST", { values: changed });
      setMsg({ ok: true, text: "Saved. The storefront updates immediately." });
      start(() => router.refresh());
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function resetGroup() {
    if (!window.confirm(`Reset “${group.title}” back to the original values?`)) return;
    setBusy(true);
    try {
      await callApi("/api/admin/settings", "POST", { reset: group.fields.map((f) => f.k) });
      setMsg({ ok: true, text: "Reset to defaults." });
      start(() => router.refresh());
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function pickImage(k: string) {
    setUploadKey(k);
    file.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !uploadKey) return;
    if (!f.type.startsWith("image/")) return setMsg({ ok: false, text: "Choose an image file." });
    if (f.size > 250_000) return setMsg({ ok: false, text: "Image must be under 250 KB. Compress it or paste a URL instead." });
    const reader = new FileReader();
    reader.onload = () => set(uploadKey, String(reader.result));
    reader.readAsDataURL(f);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <input ref={file} type="file" accept="image/*" hidden onChange={onFile} />

      {/* group tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setTab(g.id)}
            className={clsx("shrink-0 rounded-full border px-4 py-2 text-xs font-medium", tab === g.id ? "border-ink bg-ink text-white" : "border-line bg-white text-slate hover:border-ink/40")}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-line bg-white">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold">{group.title}</h2>
          <p className="text-xs text-slate">{group.hint}</p>
        </div>

        {group.id === "theme" && (
          <div className="flex flex-wrap gap-2 border-b border-line px-5 py-4">
            <span className="self-center text-xs text-slate">Quick themes:</span>
            {PRESETS.map((p) => (
              <button key={p.name} type="button" onClick={() => setValues((s) => ({ ...s, ...p.colors }))} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs hover:border-ink/40">
                <span className="flex">
                  {Object.values(p.colors).slice(0, 3).map((c) => (
                    <span key={c} className="-ml-1 h-3.5 w-3.5 rounded-full border border-white" style={{ background: c }} />
                  ))}
                </span>
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-5 p-5 md:grid-cols-2">
          {group.fields.map((f) => {
            const v = values[f.k] ?? "";
            const id = `s-${f.k}`;
            const wide = "wide" in f && f.wide;
            return (
              <div key={f.k} className={wide ? "md:col-span-2" : ""}>
                <label className="label" htmlFor={id}>{f.label}</label>

                {f.type === "toggle" ? (
                  <button type="button" id={id} onClick={() => set(f.k, v === "1" ? "0" : "1")} aria-pressed={v === "1"}
                    className={clsx("flex h-12 w-full items-center gap-3 rounded-full border px-5 text-sm", v === "1" ? "border-ink bg-mist" : "border-line bg-white")}>
                    <span className={clsx("flex h-5 w-9 items-center rounded-full p-0.5 transition-colors", v === "1" ? "bg-pine" : "bg-line")}>
                      <span className={clsx("h-4 w-4 rounded-full bg-white transition-transform", v === "1" && "translate-x-4")} />
                    </span>
                    {v === "1" ? "On" : "Off"}
                  </button>
                ) : f.type === "color" ? (
                  <div className="flex gap-2">
                    <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000"} onChange={(e) => set(f.k, e.target.value.toUpperCase())}
                      className="h-12 w-14 shrink-0 cursor-pointer rounded-xl border border-line bg-white p-1" aria-label={`${f.label} colour picker`} />
                    <input id={id} className="input tabular" value={v} onChange={(e) => set(f.k, e.target.value.toUpperCase())} />
                  </div>
                ) : f.type === "image" ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-12 w-16 items-center justify-center overflow-hidden rounded-xl border border-line bg-paper">
                      {v ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={v} alt="" className="max-h-10 max-w-14 object-contain" /> : <span className="text-[10px] text-slate">None</span>}
                    </span>
                    <button type="button" onClick={() => pickImage(f.k)} className="btn-outline btn-sm"><Upload size={13} /> Upload</button>
                    {v && <button type="button" onClick={() => set(f.k, "")} className="btn-ghost btn-sm">Remove</button>}
                    <input id={id} className="input min-w-[12rem] flex-1" placeholder="or paste an image URL / path" value={v.startsWith("data:") ? "" : v} onChange={(e) => set(f.k, e.target.value)} />
                  </div>
                ) : f.type === "methods" ? (
                  <div className="flex flex-wrap gap-2">
                    {PAYMENTS.map((m) => {
                      const on = v.split(",").includes(m);
                      return (
                        <button key={m} type="button" onClick={() => {
                          const cur = v.split(",").filter(Boolean);
                          const next = on ? cur.filter((x) => x !== m) : [...cur, m];
                          set(f.k, next.join(","));
                        }} aria-pressed={on}
                          className={clsx("rounded-full border px-4 py-2 text-xs font-medium", on ? "border-ink bg-ink text-white" : "border-line bg-white text-slate")}>
                          {m}
                        </button>
                      );
                    })}
                  </div>
                ) : f.type === "textarea" ? (
                  <textarea id={id} className="input min-h-[92px]" value={v} onChange={(e) => set(f.k, e.target.value)} />
                ) : (
                  <input id={id} className={clsx("input", f.type === "number" && "tabular")} inputMode={f.type === "number" ? "numeric" : undefined}
                    value={v} onChange={(e) => set(f.k, f.type === "number" ? e.target.value.replace(/\D/g, "") : e.target.value)} />
                )}
                {f.hint && <p className="mt-1.5 text-xs text-slate">{f.hint}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* sticky action bar */}
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
        <button type="button" onClick={save} disabled={busy || !dirty} className="btn-primary btn-sm">
          {busy ? "Saving…" : dirty ? "Save changes" : <><Check size={13} /> Saved</>}
        </button>
        <button type="button" onClick={resetGroup} disabled={busy} className="btn-outline btn-sm"><RotateCcw size={13} /> Reset this section</button>
        {msg && <span className={clsx("text-xs", msg.ok ? "text-pine" : "text-sale")}>{msg.text}</span>}
        {dirty && !msg && <span className="text-xs text-amber">Unsaved changes</span>}
      </div>
    </div>
  );
}
