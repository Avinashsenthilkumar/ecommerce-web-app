"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { callApi } from "@/lib/client/api";
import { AddressFields, emptyAddress, formatAddress, type AddressValue } from "./AddressFields";

type Saved = AddressValue & { id: string; isDefault: boolean };

export function AddressBook({ addresses, defaultName, defaultPhone }: { addresses: Saved[]; defaultName: string; defaultPhone: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [adding, setAdding] = useState(addresses.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressValue>(emptyAddress(defaultName, defaultPhone));
  const [makeDefault, setMakeDefault] = useState(addresses.length === 0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, action: "default" | "delete") {
    setBusy(id);
    setError("");
    try {
      await callApi(`/api/account/addresses/${id}`, "POST", { action });
      start(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy("new");
    setError("");
    try {
      const endpoint = editingId
        ? `/api/account/addresses/${editingId}`
        : "/api/account/addresses";
      await callApi(endpoint, editingId ? "PATCH" : "POST", { address: form, isDefault: makeDefault });
      setAdding(false);
      setEditingId(null);
      setForm(emptyAddress(defaultName, defaultPhone));
      start(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <div key={a.id} className={`panel p-5 ${a.isDefault ? "ring-1 ring-pine" : ""}`}>
            {a.isDefault && <p className="mb-2 text-xs font-bold text-pine">Default address</p>}
            <p className="font-semibold">{a.name}</p>
            <p className="text-sm text-slate">{formatAddress(a)}</p>
            <p className="text-sm text-slate">Phone: {a.phone}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingId(a.id);
                  setAdding(true);
                  setForm({
                    name: a.name,
                    phone: a.phone,
                    line1: a.line1,
                    line2: a.line2,
                    city: a.city,
                    state: a.state,
                    pincode: a.pincode,
                  });
                  setMakeDefault(a.isDefault);
                  setError("");
                }}
                disabled={busy !== null}
                className="btn-outline btn-sm"
              >
                <Pencil size={14} aria-hidden /> Edit
              </button>
              {!a.isDefault && (
                <button type="button" onClick={() => act(a.id, "default")} disabled={busy !== null} className="btn-outline btn-sm">Set as default</button>
              )}
              <button type="button" onClick={() => act(a.id, "delete")} disabled={busy !== null} className="btn-ghost btn-sm text-sale">
                {busy === a.id ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ))}
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(emptyAddress(defaultName, defaultPhone));
              setMakeDefault(false);
              setAdding(true);
              setError("");
            }}
            className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-slate transition-colors hover:border-ink hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          >
            <Plus size={22} aria-hidden /> Add a new address
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={save} className="panel space-y-4 p-5">
          <h3 className="font-bold">{editingId ? "Edit address" : "Add a new address"}</h3>
          <AddressFields value={form} onChange={setForm} idPrefix="book" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="h-4 w-4 accent-[#24493F]" />
            Make this my default address
          </label>
          <div className="flex gap-2">
            <button disabled={busy !== null} className="btn-primary">{busy === "new" ? "Saving…" : editingId ? "Save changes" : "Save address"}</button>
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setEditingId(null);
                  setError("");
                }}
                className="btn-outline"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
      {error && <p className="text-sm font-medium text-sale">{error}</p>}
    </div>
  );
}
