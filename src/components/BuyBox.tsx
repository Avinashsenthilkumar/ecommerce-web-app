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

const splitColorSize = (label: string) => {
  const separator = label.indexOf(" / ");
  return separator < 0
    ? null
    : {
        color: label.slice(0, separator).trim(),
        size: label.slice(separator + 3).trim(),
      };
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
  const anyInStock = variants.some((variant) => variant.stock > 0);
  const colorSizeVariants = variants.map((variant) => ({
    variant,
    options: splitColorSize(variant.label),
  }));
  const hasColorSizes =
    colorSizeVariants.length > 0 &&
    colorSizeVariants.every(({ options }) => options !== null);
  const selectedOptions = v ? splitColorSize(v.label) : null;
  const colors = hasColorSizes
    ? [...new Set(colorSizeVariants.map(({ options }) => options!.color))]
    : [];
  const sizes = hasColorSizes
    ? [...new Set(colorSizeVariants.map(({ options }) => options!.size))]
    : [];

  function selectVariant(variant: Variant) {
    setSelected(variant.id);
    setQty(1);
  }

  function selectColor(color: string) {
    const matching = colorSizeVariants.filter(
      ({ options }) => options?.color === color,
    );
    const next =
      matching.find(
        ({ options, variant }) =>
          options?.size === selectedOptions?.size && variant.stock > 0,
      )?.variant ??
      matching.find(({ variant }) => variant.stock > 0)?.variant ??
      matching[0]?.variant;
    if (next) selectVariant(next);
  }

  function selectSize(size: string) {
    const forSize = colorSizeVariants.filter(({ options }) => options?.size === size);
    // Prefer this size in the colour already chosen; otherwise take any colour
    // that actually has it, so the choice always lands on something buyable.
    const next =
      forSize.find(
        ({ options, variant }) =>
          options?.color === selectedOptions?.color && variant.stock > 0,
      )?.variant ??
      forSize.find(({ variant }) => variant.stock > 0)?.variant ??
      forSize.find(({ options }) => options?.color === selectedOptions?.color)?.variant;
    if (next) selectVariant(next);
  }

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
      setMsg({
        ok: false,
        text:
          e instanceof ApiClientError && e.status === 403
            ? "You are signed in with a staff or seller account. Sign in as a customer to shop."
            : (e as Error).message,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {hasColorSizes ? (
        <div className="space-y-5">
          <fieldset>
            <legend className="eyebrow mb-3">Color</legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((colorName) => {
                const swatch = productColor(colorName);
                const selectedColor = selectedOptions?.color === colorName;
                const available = colorSizeVariants.some(
                  ({ options, variant }) =>
                    options?.color === colorName && variant.stock > 0,
                );
                return (
                  <button
                    key={colorName}
                    type="button"
                    onClick={() => selectColor(colorName)}
                    disabled={!available}
                    aria-pressed={selectedColor}
                    aria-label={colorName}
                    title={colorName}
                    className={clsx(
                      "border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink",
                      swatch
                        ? "h-8 w-8 rounded-full p-1"
                        : "h-10 rounded-full px-4 text-sm",
                      selectedColor
                        ? "border-ink ring-2 ring-ink ring-offset-2"
                        : "border-line bg-white hover:border-ink/50",
                      !available && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {swatch ? (
                      <span
                        aria-hidden="true"
                        className="block h-full w-full rounded-full border border-black/10"
                        style={{ backgroundColor: swatch }}
                      />
                    ) : (
                      colorName
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="eyebrow mb-3">Size</legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const matching = colorSizeVariants.find(
                  ({ options, variant }) =>
                    options?.color === selectedOptions?.color &&
                    options?.size === size &&
                    variant.stock > 0,
                )?.variant;
                const selectedSize = selectedOptions?.size === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => selectSize(size)}
                    disabled={!matching}
                    aria-pressed={selectedSize}
                    className={clsx(
                      "h-10 min-w-12 rounded-full border px-4 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink",
                      selectedSize
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-white hover:border-ink/40",
                      !matching &&
                        "cursor-not-allowed text-slate/50 line-through",
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      ) : (
        <fieldset>
          <legend className="eyebrow mb-3">
            {variants.length > 0 && variants.every((x) => productColor(x.label))
              ? "Color"
              : "Variant"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((x) => {
              const color = productColor(x.label);
              const isSelected = selected === x.id;
              const round = variants.every(
                (variant) => variant.label.length <= 2,
              );
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => selectVariant(x)}
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
      )}

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
            <span className="text-sale">Out of stock in this option</span>
          )}
        </p>
      </div>

      {v && v.stock === 0 && anyInStock && (
        <p className="rounded-xl bg-amberSoft px-4 py-3 text-sm text-amber">
          {v.label} is sold out. Pick another option above — others are still available.
        </p>
      )}
      {!anyInStock && (
        <p className="rounded-xl bg-mist px-4 py-3 text-sm text-slate">
          Every option is sold out right now. Add it to your wishlist and we will keep it handy.
        </p>
      )}

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
