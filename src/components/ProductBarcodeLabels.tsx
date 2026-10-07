"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";

export type ProductBarcodeItem = {
  id: string;
  sku: string;
  variantLabel: string;
  productName: string;
  brandName: string;
  categoryName: string;
  warehouseName: string;
  quantity: number;
};

function Barcode({ value }: { value: string }) {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svg.current) {
      JsBarcode(svg.current, value, {
        format: "CODE128",
        lineColor: "#111827",
        width: 1.7,
        height: 44,
        displayValue: true,
        fontSize: 11,
        margin: 2,
      });
    }
  }, [value]);

  return <svg ref={svg} aria-label={`Barcode for ${value}`} />;
}

export function ProductBarcodeLabels({
  products,
}: {
  products: ProductBarcodeItem[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [printIds, setPrintIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!printIds) return;

    const printFrame = requestAnimationFrame(() => window.print());
    const finishPrint = () => setPrintIds(null);
    window.addEventListener("afterprint", finishPrint);
    return () => {
      cancelAnimationFrame(printFrame);
      window.removeEventListener("afterprint", finishPrint);
    };
  }, [printIds]);

  function print(ids: string[]) {
    if (ids.length) setPrintIds(ids);
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  const labels = products.flatMap((product) =>
    (printIds ?? []).includes(product.id)
      ? Array.from(
          { length: copies[product.id] ?? 1 },
          (_, index) => ({ product, index }),
        )
      : [],
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="text-xs text-slate">
          {products.length} stocked SKU{products.length === 1 ? "" : "s"} ·
          Select products and set label copies
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-outline btn-sm"
            onClick={() => setSelected(products.map((product) => product.id))}
            disabled={products.length === 0}
          >
            Select all
          </button>
          <button
            type="button"
            className="btn-outline btn-sm"
            onClick={() => setSelected([])}
            disabled={selected.length === 0}
          >
            Clear selection
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => print(selected)}
            disabled={selected.length === 0}
          >
            <Printer size={14} /> Print selected ({selected.length})
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate">
          No active products with stock at this warehouse yet.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(product.id)}
                  onChange={() => toggle(product.id)}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {product.productName}
                    {product.variantLabel ? ` · ${product.variantLabel}` : ""}
                  </span>
                  <span className="block text-xs text-slate">
                    {product.brandName} · {product.categoryName} · {product.sku} ·
                    {" "}{product.quantity} units at {product.warehouseName}
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-2">
                <label
                  className="text-xs text-slate"
                  htmlFor={`copies-${product.id}`}
                >
                  Copies
                </label>
                <input
                  id={`copies-${product.id}`}
                  type="number"
                  min={1}
                  max={100}
                  value={copies[product.id] ?? 1}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setCopies((current) => ({
                      ...current,
                      [product.id]: Math.min(100, Math.max(1, value || 1)),
                    }));
                  }}
                  className="input h-9 w-16 px-2 text-center tabular"
                />
                <button
                  type="button"
                  className="btn-outline btn-sm"
                  onClick={() => print([product.id])}
                >
                  <Printer size={13} /> Print
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="barcode-print-area hidden">
        {labels.map(({ product, index }) => (
          <article
            key={`${product.id}-${index}`}
            className="barcode-label is-printing"
          >
            <p className="barcode-label-brand">{product.brandName}</p>
            <p className="barcode-label-name">
              {product.productName}
              {product.variantLabel ? ` · ${product.variantLabel}` : ""}
            </p>
            <Barcode value={product.sku} />
            <p className="barcode-label-category">{product.categoryName}</p>
          </article>
        ))}
      </div>
    </>
  );
}
