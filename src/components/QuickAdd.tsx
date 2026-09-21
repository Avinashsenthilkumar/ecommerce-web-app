"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import { ApiClientError, callApi, loginHref } from "@/lib/client/api";

export function QuickAdd({ variantId, disabled }: { variantId?: string; disabled?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "added" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  async function add() {
    if (!variantId) return;
    try {
      await callApi("/api/cart", "POST", { variantId, quantity: 1 });
      setState("added");
      start(() => router.refresh());
      setTimeout(() => setState("idle"), 1600);
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 401) {
        router.push(loginHref());
        return;
      }
      setState("error");
      setMsg((e as Error).message);
      setTimeout(() => setState("idle"), 2400);
    }
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={disabled || !variantId || pending}
      title={state === "error" ? msg : disabled ? "Out of stock" : "Add to cart"}
      className="absolute inset-x-3 bottom-3 inline-flex translate-y-2 items-center justify-center gap-1.5 rounded-full bg-white/95 py-2.5 text-xs font-medium text-ink opacity-0 shadow-sm ring-1 ring-line backdrop-blur transition-all hover:bg-ink hover:text-white focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 disabled:hidden"
    >
      {state === "added" ? <Check size={13} /> : <Plus size={13} />}
      {state === "added" ? "Added to bag" : state === "error" ? msg || "Unavailable" : "Add to bag"}
    </button>
  );
}
