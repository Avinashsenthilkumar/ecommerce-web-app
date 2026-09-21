"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import clsx from "clsx";
import { ApiClientError, callApi, loginHref } from "@/lib/client/api";

export function WishlistButton({ productId, saved: initial, variant = "icon" }: { productId: string; saved: boolean; variant?: "icon" | "full" }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();

  async function toggle() {
    setBusy(true);
    setSaved((s) => !s); // optimistic
    try {
      const r = await callApi<{ saved: boolean }>("/api/wishlist", "POST", { productId });
      setSaved(r.saved);
      start(() => router.refresh());
    } catch (e) {
      setSaved((s) => !s);
      if (e instanceof ApiClientError && e.status === 401) router.push(loginHref());
    } finally {
      setBusy(false);
    }
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-white transition hover:border-ink/40"
      >
        <Heart size={17} className={clsx(saved && "fill-sale text-sale")} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/95 transition hover:border-ink/40"
    >
      <Heart size={16} className={clsx(saved ? "fill-sale text-sale" : "text-ink")} />
    </button>
  );
}
