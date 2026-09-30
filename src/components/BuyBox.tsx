"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ApiClientError, callApi, loginHref } from "@/lib/client/api";
import { productColor } from "@/lib/product-colors";
import { WishlistButton } from "./WishlistButton";

type Variant = {
  id: string;
  label: string;
  stock: number;
  warehouse: string | null;
};

export function BuyBox({
  variants,
  productId,
  saved,
}: {
  variants: Variant[];
  productId: string;
  saved: boolean;
}) {
  const router = useRouter();
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selected, setSelected] = useState(firstAvailable?.id);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<"cart" | "buy" | null>(null);
  const [, start] = useTransition();

  const v = useMemo(
    () => variants.find((x) => x.id === selected),
    [variants, selected],
  );
  const max = Math.min(v?.stock ?? 0, 10);
  const round = variants.every((x) => x.label.length <= 2);
  const allColors =
    variants.length > 0 && variants.every((x) => productColor(x.label));

  async function add(mode: "cart" | "buy") {
    if (!v) return;
    setBusy(mode);
    setMsg(null);
    try {
      await callApi("/api/cart", "POST", { variantId: v.id, quantity: qty });
      if (mode === "buy") {
        router.push("/cart");
      } else {
        setMsg({ ok: true, text: `Added ${qty} × ${v.label} to your bag.` });
        start(() => router.refresh());
      }
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 401) {
        router.push(loginHref());
        return;
      }
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="eyebrow mb-3">
          {allColors ? "Color" : "Variant"}
        </legend>
        <div className="flex flex-wrap gap-2">
          {variants.map((x) => {
            const color = productColor(x.label);
            const isSelected = selected === x.id;
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => {
                  setSelected(x.id);
                  setQty(1);
                }}
                disabled={x.stock === 0}
                aria-pressed={isSelected}
                aria-label={color ? x.label : undefined}
                title={x.label}
                className={clsx(
                  "border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink",
                  color
                    ? "h-8 w-8 rounded-full p-1"
                    : `h-11 rounded-full text-sm ${round ? "w-11" : "px-5"}`,
                  color
                    ? isSelected
                      ? "border-ink ring-2 ring-ink ring-offset-2"
                      : "border-line hover:border-ink/50"
                    : isSelected
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white hover:border-ink/40",
                  x.stock === 0 &&
                    (color
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-not-allowed text-slate/50 line-through"),
                )}
              >
                {color ? (
                  <span
                    aria-hidden="true"
                    className="block h-full w-full rounded-full border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                ) : (
                  x.label
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex h-11 items-center rounded-full border border-line bg-white px-1">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="h-9 w-9 rounded-full text-lg leading-none hover:bg-mist"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-sm tabular" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max || 1, q + 1))}
            className="h-9 w-9 rounded-full text-lg leading-none hover:bg-mist"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <p className="text-sm text-slate">
          {v && v.stock > 0 ? (
            <>
              <span className={v.stock <= 8 ? "text-amber" : undefined}>
                {v.stock} in stock
              </span>
              {v.warehouse && <> · {v.warehouse}</>}
            </>
          ) : (
            <span className="text-sale">Out of stock</span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => add("cart")}
          disabled={!v || v.stock === 0 || busy !== null}
          className="btn-primary h-12 px-7"
        >
          {busy === "cart" ? "Adding…" : "Add to cart"}
        </button>
        <button
          type="button"
          onClick={() => add("buy")}
          disabled={!v || v.stock === 0 || busy !== null}
          className="btn-outline h-12 px-7"
        >
          {busy === "buy" ? "Opening bag…" : "Buy now"}
        </button>
        <WishlistButton productId={productId} saved={saved} variant="full" />
      </div>
      {msg && (
        <p className={clsx("text-sm", msg.ok ? "text-pine" : "text-sale")}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
