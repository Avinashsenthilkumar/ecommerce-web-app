"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, AlertCircle } from "lucide-react";
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
      // Not signed in: send them to sign in and bring them straight back.
      if (e instanceof ApiClientError && e.status === 401) {
        router.push(loginHref());
        return;
      }
      setState("error");
      // 403 means a staff or seller account tried to shop — say so plainly
      // instead of leaving a button that looks broken.
      setMsg(
        e instanceof ApiClientError && e.status === 403
          ? "Sign in as a customer"
          : (e as Error).message,
      );
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const outOfStock = disabled || !variantId;

  return (
    <button
      type="button"
      onClick={add}
      disabled={outOfStock || pending}
      title={state === "error" ? msg : outOfStock ? "Out of stock" : "Add to bag"}
      className="absolute inset-x-3 bottom-3 inline-flex translate-y-2 items-center justify-center gap-1.5 rounded-full bg-white/95 py-2.5 text-xs font-medium text-ink opacity-0 shadow-sm ring-1 ring-line backdrop-blur transition-all hover:bg-ink hover:text-white focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 disabled:cursor-not-allowed disabled:bg-white/95 disabled:text-slate disabled:hover:text-slate"
    >
      {state === "added" ? (
        <Check size={13} />
      ) : state === "error" ? (
        <AlertCircle size={13} />
      ) : (
        <Plus size={13} />
      )}
      {state === "added"
        ? "Added to bag"
        : state === "error"
          ? msg || "Unavailable"
          : outOfStock
            ? "Out of stock"
            : "Add to bag"}
    </button>
  );
}
