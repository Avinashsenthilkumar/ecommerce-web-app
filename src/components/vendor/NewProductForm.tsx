"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { callApi } from "@/lib/client/api";

type Opt = { id: string; name: string };

const parseOptions = (value: string) => [
  ...new Map(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => [item.toLowerCase(), item]),
  ).values(),
];

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function uploadToCloudinary(file: File) {
  const image = await fileToDataUrl(file);
  const result = await callApi<{ url: string }>(
    "/api/cloudinary/upload",
    "POST",
    { image },
  );
  return result.url;
}

export function NewProductForm({
  categories,
  warehouses,
}: {
  categories: Opt[];
  warehouses: Opt[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: "",
    brandName: "",
    categoryId: categories[0]?.id ?? "",
    shortDescription: "",
    description: "",
    mrp: "",
    sellingPrice: "",
    skuPrefix: "",
    warehouseId: warehouses[0]?.id ?? "",
    colors: "",
    sizes: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [variantStock, setVariantStock] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  const set =
    (k: keyof typeof f) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setF({ ...f, [k]: e.target.value });
  const colors = parseOptions(f.colors);
  const sizes = parseOptions(f.sizes);
  const variantLabels =
    colors.length && sizes.length
      ? colors.flatMap((color) => sizes.map((size) => `${color} / ${size}`))
      : colors.length
        ? colors
        : sizes;

  async function selectImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.currentTarget.files ?? []);
    e.currentTarget.value = "";
    setError("");
    if (files.length > 5) {
      setError("Choose up to 5 product images.");
      return;
    }
    if (
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
            file.type,
          ),
      )
    ) {
      setError("Use JPG, PNG, WebP or GIF images.");
      return;
    }
    if (
      files.some((file) => file.size > 2 * 1024 * 1024) ||
      files.reduce((total, file) => total + file.size, 0) > 3 * 1024 * 1024
    ) {
      setError(
        "Each image must be under 2 MB and the total must be under 3 MB.",
      );
      return;
    }
    try {
      setImages(await Promise.all(files.map(uploadToCloudinary)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (variantLabels.length === 0) {
      setError("Add at least one color or size option.");
      return;
    }
    if (variantLabels.length > 100) {
      setError("A product can have up to 100 color and size combinations.");
      return;
    }
    const variants = variantLabels.map((label) => ({
      label,
      stock: Number(variantStock[label] ?? 0),
    }));
    if (
      variants.some(
        (variant) => !Number.isInteger(variant.stock) || variant.stock < 0,
      )
    ) {
      setError("Opening stock must be a whole number of 0 or more.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await callApi<{ slug: string }>(
        "/api/vendor/products",
        "POST",
        {
          name: f.name,
          brandName: f.brandName,
          categoryId: f.categoryId,
          shortDescription: f.shortDescription,
          description: f.description,
          mrp: Number(f.mrp),
          sellingPrice: Number(f.sellingPrice),
          skuPrefix: f.skuPrefix,
          warehouseId: f.warehouseId,
          images,
          variants,
        },
      );
      setDone(r.slug);
      setOpen(false);
      start(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        {done && (
          <span className="text-xs text-pine">
            Submitted. It goes live after admin review.
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary btn-sm"
        >
          List a new product
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-full space-y-4 border-t border-line bg-mist/40 p-5"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="label" htmlFor="np-name">
            Product name
          </label>
          <input
            id="np-name"
            className="input"
            value={f.name}
            onChange={set("name")}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="np-brand">
            Brand
          </label>
          <input
            id="np-brand"
            className="input"
            value={f.brandName}
            onChange={set("brandName")}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="np-cat">
            Category
          </label>
          <select
            id="np-cat"
            className="input"
            value={f.categoryId}
            onChange={set("categoryId")}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="np-mrp">
            MRP (₹)
          </label>
          <input
            id="np-mrp"
            className="input tabular"
            inputMode="numeric"
            value={f.mrp}
            onChange={set("mrp")}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="np-price">
            Selling price (₹)
          </label>
          <input
            id="np-price"
            className="input tabular"
            inputMode="numeric"
            value={f.sellingPrice}
            onChange={set("sellingPrice")}
            required
          />
        </div>
        <div className="md:col-span-3">
          <label className="label" htmlFor="np-short">
            One-line description
          </label>
          <input
            id="np-short"
            className="input"
            value={f.shortDescription}
            onChange={set("shortDescription")}
            required
            maxLength={160}
          />
        </div>
        <div className="md:col-span-3">
          <label className="label" htmlFor="np-desc">
            Full description
          </label>
          <textarea
            id="np-desc"
            className="input min-h-[90px]"
            value={f.description}
            onChange={set("description")}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="np-sku">
            SKU prefix
          </label>
          <input
            id="np-sku"
            className="input uppercase tabular"
            placeholder="ABC-TEE"
            value={f.skuPrefix}
            onChange={set("skuPrefix")}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="np-wh">
            Stock at
          </label>
          <select
            id="np-wh"
            className="input"
            value={f.warehouseId}
            onChange={set("warehouseId")}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="label" htmlFor="np-img">
            Product images
          </label>
          <input
            id="np-img"
            className="input file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={selectImages}
          />
          <p className="mt-1 text-xs text-slate">
            Up to 5 images. JPG, PNG, WebP or GIF; 2 MB each, 3 MB total.
          </p>
          {images.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-3">
              {images.map((image, index) => (
                <li
                  key={`${index}-${image.slice(-24)}`}
                  className="relative h-20 w-16 overflow-hidden rounded-lg border border-line bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={`Product image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setImages(
                        images.filter((_, imageIndex) => imageIndex !== index),
                      )
                    }
                    className="absolute right-1 top-1 rounded-full bg-white p-1"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className="label" htmlFor="np-colors">
            Colors
          </label>
          <input
            id="np-colors"
            className="input"
            placeholder="Navy, Olive"
            value={f.colors}
            onChange={set("colors")}
          />
        </div>
        <div>
          <label className="label" htmlFor="np-sizes">
            Sizes
          </label>
          <input
            id="np-sizes"
            className="input"
            placeholder="S, M, L"
            value={f.sizes}
            onChange={set("sizes")}
          />
        </div>
        <div className="md:col-span-3">
          <p className="label">Variant combinations and opening stock</p>
          {variantLabels.length === 0 ? (
            <p className="text-sm text-slate">
              Enter colors, sizes, or both to create sellable options.
            </p>
          ) : variantLabels.length > 100 ? (
            <p className="text-sm text-sale">
              This creates {variantLabels.length} combinations. Reduce the
              options to 100 or fewer.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {variantLabels.map((label) => (
                <label
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">{label}</span>
                  <input
                    aria-label={`${label} opening stock`}
                    className="input w-24 tabular"
                    type="number"
                    min="0"
                    step="1"
                    value={variantStock[label] ?? "0"}
                    onChange={(event) =>
                      setVariantStock({
                        ...variantStock,
                        [label]: event.target.value,
                      })
                    }
                    required
                  />
                </label>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-slate">
            Separate options with commas. If both colors and sizes are set,
            every combination gets its own SKU and stock level.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={busy} className="btn-primary">
          {busy ? "Submitting…" : "Submit for review"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm font-medium text-sale">{error}</p>}
    </form>
  );
}
