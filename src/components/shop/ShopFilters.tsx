"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { SlidersHorizontal, X } from "lucide-react";
import { Portal } from "@/components/Portal";
import { useScrollLock } from "@/lib/useScrollLock";

export type FacetData = {
  brands: { name: string; count: number }[];
  minPrice: number;
  maxPrice: number;
};

export type ActiveFilters = {
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock: boolean;
};

const RATINGS = [4, 3, 2];

/**
 * Filter panel. Inline on desktop, a drawer on phones.
 * Submitting writes the choices to the URL, so results are shareable and the
 * back button behaves; page is reset to 1 on every change.
 */
export function ShopFilters({
  facets,
  active,
  resultCount,
  variant,
}: {
  facets: FacetData;
  active: ActiveFilters;
  resultCount: number;
  /**
   * "trigger" renders only the phone button + drawer, "panel" only the inline
   * sidebar. Keeping them separate avoids two copies of the same radio group
   * on one page, which would fight over the shared input name.
   */
  variant: "trigger" | "panel";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const [brands, setBrands] = useState<string[]>(active.brands);
  const [min, setMin] = useState(active.minPrice?.toString() ?? "");
  const [max, setMax] = useState(active.maxPrice?.toString() ?? "");
  const [rating, setRating] = useState(active.minRating ?? 0);
  const [inStock, setInStock] = useState(active.inStock);

  // Keep the controls in step when the URL changes (back button, chip removal).
  // Keyed on a plain string so a fresh array from the server cannot re-trigger
  // this and wipe what the shopper is part-way through typing.
  const activeKey = [
    [...active.brands].sort().join("|"),
    active.minPrice ?? "",
    active.maxPrice ?? "",
    active.minRating ?? "",
    active.inStock ? "1" : "",
  ].join("~");

  useEffect(() => {
    setBrands(active.brands);
    setMin(active.minPrice?.toString() ?? "");
    setMax(active.maxPrice?.toString() ?? "");
    setRating(active.minRating ?? 0);
    setInStock(active.inStock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);

  useScrollLock(open);

  const activeCount =
    active.brands.length +
    (active.minPrice !== undefined || active.maxPrice !== undefined ? 1 : 0) +
    (active.minRating ? 1 : 0) +
    (active.inStock ? 1 : 0);

  function apply() {
    const sp = new URLSearchParams(params.toString());
    sp.delete("brand");
    brands.forEach((b) => sp.append("brand", b));

    const setOrDelete = (key: string, value: string) =>
      value ? sp.set(key, value) : sp.delete(key);

    setOrDelete("min", min.replace(/\D/g, ""));
    setOrDelete("max", max.replace(/\D/g, ""));
    setOrDelete("rating", rating ? String(rating) : "");
    setOrDelete("instock", inStock ? "1" : "");
    sp.delete("page");

    router.push(`${pathname}?${sp.toString()}`);
    setOpen(false);
  }

  function clearAll() {
    const sp = new URLSearchParams(params.toString());
    ["brand", "min", "max", "rating", "instock", "page"].forEach((k) => sp.delete(k));
    router.push(`${pathname}?${sp.toString()}`);
    setOpen(false);
  }

  const panel = (
    <div className="space-y-7">
      {facets.brands.length > 1 && (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">Brand</legend>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {facets.brands.map((b) => (
              <label key={b.name} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={brands.includes(b.name)}
                  onChange={(e) =>
                    setBrands((list) =>
                      e.target.checked ? [...list, b.name] : list.filter((x) => x !== b.name),
                    )
                  }
                  className="h-4 w-4 shrink-0 accent-[rgb(var(--c-ink))]"
                />
                <span className="min-w-0 flex-1 truncate">{b.name}</span>
                <span className="text-xs text-slate tabular">{b.count}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-3 text-sm font-semibold">Price</legend>
        <div className="flex items-center gap-2">
          <input
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder={`₹${facets.minPrice}`}
            aria-label="Minimum price"
            className="input h-11 w-full px-3 text-sm tabular"
          />
          <span className="text-slate">–</span>
          <input
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder={`₹${facets.maxPrice}`}
            aria-label="Maximum price"
            className="input h-11 w-full px-3 text-sm tabular"
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold">Customer rating</legend>
        <div className="space-y-2">
          {RATINGS.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="radio"
                name={`rating-${variant}`}
                checked={rating === r}
                onChange={() => setRating(r)}
                className="h-4 w-4 accent-[rgb(var(--c-ink))]"
              />
              {r}★ &amp; above
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="radio"
              name={`rating-${variant}`}
              checked={rating === 0}
              onChange={() => setRating(0)}
              className="h-4 w-4 accent-[rgb(var(--c-ink))]"
            />
            Any rating
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold">Availability</legend>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
            className="h-4 w-4 accent-[rgb(var(--c-ink))]"
          />
          In stock only
        </label>
      </fieldset>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={apply} className="btn-primary btn-sm flex-1">
          Apply filters
        </button>
        <button type="button" onClick={clearAll} className="btn-outline btn-sm">
          Clear
        </button>
      </div>
    </div>
  );

  if (variant === "panel") {
    return (
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Filters</h2>
          {activeCount > 0 && (
            <button type="button" onClick={clearAll} className="text-xs text-slate underline hover:text-ink">
              Clear all
            </button>
          )}
        </div>
        {panel}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-outline btn-sm h-11 lg:hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <SlidersHorizontal size={15} />
        Filters
        {activeCount > 0 && (
          <span className="ml-1 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-white tabular">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <Portal>
        <div
          className="fixed inset-x-0 top-0 z-[60] h-[100dvh] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-ink/40 backdrop-blur-[2px]"
          />
          <div
            className={clsx(
              "absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-[24px] bg-paper",
              "pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
              "motion-safe:animate-[sheet-up_.24s_ease-out]",
            )}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-paper px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Filters</h2>
                <p className="text-xs text-slate">{resultCount} products match</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="icon-btn"
                aria-label="Close filters"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-5">{panel}</div>
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}
