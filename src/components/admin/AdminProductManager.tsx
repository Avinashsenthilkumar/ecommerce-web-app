"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { callApi } from "@/lib/client/api";
import { ProductImage } from "@/components/ProductImage";

type Warehouse = { id: string; name: string };
type ProductStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "INACTIVE";
type VariantDraft = {
  id?: string;
  sku: string;
  label: string;
  priceOverride: string;
  weightGrams: string;
  stockByWarehouse: Record<string, string>;
};
type SpecDraft = { key: string; value: string };
type ProductDraft = {
  name: string;
  brandName: string;
  categoryId: string;
  vendorId: string;
  shortDescription: string;
  description: string;
  mrp: string;
  sellingPrice: string;
  status: ProductStatus;
  images: string[];
  specs: SpecDraft[];
  variants: VariantDraft[];
};
type ProductRecord = {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  vendorId: string;
  mrp: number;
  sellingPrice: number;
  status: ProductStatus;
  brand: { name: string };
  images: { url: string }[];
  specs: { key: string; value: string }[];
  variants: {
    id: string;
    sku: string;
    label: string;
    priceOverride: number | null;
    weightGrams: number | null;
    inventory: { warehouseId: string; available: number }[];
  }[];
};
type SellerOption = { id: string; businessName: string; status: string };

function isCloudinaryUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.includes("/image/upload/")
    );
  } catch {
    return false;
  }
}

const emptyDraft = (
  categories: { id: string }[],
  vendors: SellerOption[],
): ProductDraft => ({
  name: "",
  brandName: "",
  categoryId: categories[0]?.id ?? "",
  vendorId: vendors[0]?.id ?? "",
  shortDescription: "",
  description: "",
  mrp: "",
  sellingPrice: "",
  status: "ACTIVE",
  images: [],
  specs: [],
  variants: [],
});

function draftFromProduct(product: ProductRecord, warehouses: Warehouse[]): ProductDraft {
  return {
    name: product.name,
    brandName: product.brand.name,
    categoryId: product.categoryId,
    vendorId: product.vendorId,
    shortDescription: product.shortDescription,
    description: product.description,
    mrp: String(product.mrp),
    sellingPrice: String(product.sellingPrice),
    status: product.status,
    images: product.images.map((image) => image.url).filter(isCloudinaryUrl),
    specs: product.specs.map(({ key, value }) => ({ key, value })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      label: variant.label,
      priceOverride: variant.priceOverride === null ? "" : String(variant.priceOverride),
      weightGrams: variant.weightGrams === null ? "" : String(variant.weightGrams),
      stockByWarehouse: Object.fromEntries(
        warehouses.map((warehouse) => [
          warehouse.id,
          String(
            variant.inventory.find((row) => row.warehouseId === warehouse.id)
              ?.available ?? 0,
          ),
        ]),
      ),
    })),
  };
}

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export function AdminProductManager({
  products,
  categories,
  vendors,
  warehouses,
}: {
  products: ProductRecord[];
  categories: { id: string; name: string }[];
  vendors: SellerOption[];
  warehouses: Warehouse[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<ProductDraft>(() =>
    emptyDraft(categories, vendors),
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const selected = products.find((product) => product.id === selectedId);
    setDraft(
      selected ? draftFromProduct(selected, warehouses) : emptyDraft(categories, vendors),
    );
    setError("");
    setNotice("");
  }, [selectedId, products, warehouses, categories, vendors]);

  const update = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function startNewProduct() {
    setSelectedId("");
  }

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    update(
      "variants",
      draft.variants.map((variant, i) =>
        i === index ? { ...variant, ...patch } : variant,
      ),
    );
  }

  async function uploadImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    setError("");
    if (draft.images.length + files.length > 5) {
      setError("A product can have up to 5 images.");
      return;
    }
    if (files.some((file) => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type))) {
      setError("Choose JPG, PNG, WebP, or GIF images.");
      return;
    }
    if (files.some((file) => file.size > 2 * 1024 * 1024)) {
      setError("Each image must be under 2 MB.");
      return;
    }

    setBusy(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const image = await toDataUrl(file);
          const result = await callApi<{ url: string }>(
            "/api/cloudinary/upload",
            "POST",
            { image },
          );
          return result.url;
        }),
      );
      update("images", [...draft.images, ...uploaded]);
      setNotice(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded to Cloudinary.`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!draft.variants.length) {
      setError("Add at least one product variant.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...draft,
        mrp: Number(draft.mrp),
        sellingPrice: Number(draft.sellingPrice),
        variants: draft.variants.map((variant) => ({
          ...variant,
          priceOverride: variant.priceOverride ? Number(variant.priceOverride) : null,
          weightGrams: variant.weightGrams ? Number(variant.weightGrams) : null,
          stockByWarehouse: Object.fromEntries(
            warehouses.map((warehouse) => [
              warehouse.id,
              Number(variant.stockByWarehouse[warehouse.id] ?? 0),
            ]),
          ),
        })),
      };
      const result = await callApi<{ id: string }>(
        selectedId ? `/api/admin/products/${selectedId}` : "/api/admin/products",
        selectedId ? "PATCH" : "POST",
        payload,
      );
      setSelectedId(result.id);
      setNotice("Product saved.");
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(15rem,0.7fr)_minmax(0,2fr)]">
      <aside className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">Product catalogue</h3>
            <p className="text-xs text-slate">{products.length} products</p>
          </div>
          <button type="button" className="btn-primary btn-sm" onClick={startNewProduct}>
            <Plus size={14} /> New
          </button>
        </div>
        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
          {products.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => setSelectedId(product.id)}
                aria-current={selectedId === product.id ? "true" : undefined}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-mist/60 ${
                  selectedId === product.id ? "bg-mist" : ""
                }`}
              >
                <span className="h-12 w-10 shrink-0 overflow-hidden rounded-md bg-mist">
                  <ProductImage src={product.images[0]?.url} alt="" className="h-full w-full" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{product.name}</span>
                  <span className="block text-xs text-slate">{product.status.replaceAll("_", " ")}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <form onSubmit={save} className="space-y-5 rounded-2xl border border-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <h3 className="text-base font-semibold">{selectedId ? "Edit product" : "Create product"}</h3>
            <p className="mt-1 text-xs text-slate">Product photos upload directly to Cloudinary.</p>
          </div>
          {selectedId && (
            <button type="button" className="btn-outline btn-sm" onClick={startNewProduct}>
              New product
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="label">Product name</span>
            <input className="input" value={draft.name} onChange={(e) => update("name", e.target.value)} required minLength={3} />
          </label>
          <label>
            <span className="label">Brand</span>
            <input className="input" value={draft.brandName} onChange={(e) => update("brandName", e.target.value)} required />
          </label>
          <label>
            <span className="label">Seller</span>
            <select className="input" value={draft.vendorId} onChange={(e) => update("vendorId", e.target.value)} required>
              {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.businessName}{vendor.status !== "APPROVED" ? ` (${vendor.status.toLowerCase()})` : ""}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Category</span>
            <select className="input" value={draft.categoryId} onChange={(e) => update("categoryId", e.target.value)} required>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Store status</span>
            <select className="input" value={draft.status} onChange={(e) => update("status", e.target.value as ProductStatus)}>
              <option value="ACTIVE">Live</option>
              <option value="PENDING_REVIEW">Pending review</option>
              <option value="REJECTED">Rejected</option>
              <option value="DRAFT">Draft</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <label>
            <span className="label">MRP (₹)</span>
            <input className="input tabular" type="number" min="1" step="1" value={draft.mrp} onChange={(e) => update("mrp", e.target.value)} required />
          </label>
          <label>
            <span className="label">Selling price (₹)</span>
            <input className="input tabular" type="number" min="1" step="1" value={draft.sellingPrice} onChange={(e) => update("sellingPrice", e.target.value)} required />
          </label>
          <label className="sm:col-span-2">
            <span className="label">Short description</span>
            <input className="input" maxLength={160} value={draft.shortDescription} onChange={(e) => update("shortDescription", e.target.value)} required />
          </label>
          <label className="sm:col-span-2">
            <span className="label">Full description</span>
            <textarea className="input min-h-28" value={draft.description} onChange={(e) => update("description", e.target.value)} required />
          </label>
        </div>

        <section className="space-y-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold">Product images</h4>
              <p className="text-xs text-slate">Up to 5 images, stored on Cloudinary.</p>
            </div>
            <label className="btn-outline btn-sm cursor-pointer">
              <Upload size={14} /> Upload images
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={uploadImages}
                disabled={busy || draft.images.length >= 5}
              />
            </label>
          </div>
          {draft.images.length > 0 ? (
            <ul className="flex flex-wrap gap-3">
              {draft.images.map((url, index) => (
                <li key={`${url}-${index}`} className="relative h-24 w-20 overflow-hidden rounded-lg border border-line bg-mist">
                  <ProductImage src={url} alt={`${draft.name} image ${index + 1}`} className="h-full w-full" />
                  <button
                    type="button"
                    onClick={() => update("images", draft.images.filter((_, i) => i !== index))}
                    className="absolute right-1 top-1 rounded-full bg-white p-1"
                    aria-label={`Remove image ${index + 1}`}
                  ><X size={13} /></button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate">No product images uploaded.</p>}
        </section>

        <section className="space-y-3 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold">Variants and inventory</h4>
              <p className="text-xs text-slate">Manage SKUs, option labels, price overrides, weight and available units.</p>
            </div>
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={() => update("variants", [...draft.variants, {
                sku: "",
                label: "",
                priceOverride: "",
                weightGrams: "",
                stockByWarehouse: Object.fromEntries(warehouses.map((warehouse) => [warehouse.id, "0"])),
              }])}
            ><Plus size={14} /> Add variant</button>
          </div>
          {draft.variants.length === 0 && <p className="text-sm text-slate">Add at least one variant before saving.</p>}
          {draft.variants.map((variant, index) => (
            <fieldset key={variant.id ?? `new-${index}`} className="space-y-3 rounded-xl border border-line p-3">
              <legend className="px-1 text-xs font-semibold text-slate">Variant {index + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="label">SKU</span><input className="input uppercase" value={variant.sku} onChange={(e) => updateVariant(index, { sku: e.target.value.toUpperCase() })} required /></label>
                <label><span className="label">Option / label</span><input className="input" placeholder="Blue / Medium" value={variant.label} onChange={(e) => updateVariant(index, { label: e.target.value })} required /></label>
                <label><span className="label">Price override (₹, optional)</span><input className="input" type="number" min="1" value={variant.priceOverride} onChange={(e) => updateVariant(index, { priceOverride: e.target.value })} /></label>
                <label><span className="label">Weight (grams, optional)</span><input className="input" type="number" min="1" value={variant.weightGrams} onChange={(e) => updateVariant(index, { weightGrams: e.target.value })} /></label>
              </div>
              {warehouses.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {warehouses.map((warehouse) => (
                    <label key={warehouse.id}>
                      <span className="label">{warehouse.name} available stock</span>
                      <input
                        className="input tabular"
                        type="number"
                        min="0"
                        max="100000"
                        value={variant.stockByWarehouse[warehouse.id] ?? "0"}
                        onChange={(e) => updateVariant(index, {
                          stockByWarehouse: { ...variant.stockByWarehouse, [warehouse.id]: e.target.value },
                        })}
                        required
                      />
                    </label>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="btn-ghost btn-sm text-sale"
                onClick={() => update("variants", draft.variants.filter((_, i) => i !== index))}
              ><Trash2 size={13} /> Remove variant</button>
            </fieldset>
          ))}
        </section>

        <section className="space-y-3 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold">Specifications</h4>
              <p className="text-xs text-slate">Key/value details shown on the product page.</p>
            </div>
            <button type="button" className="btn-outline btn-sm" onClick={() => update("specs", [...draft.specs, { key: "", value: "" }])}>
              <Plus size={14} /> Add specification
            </button>
          </div>
          {draft.specs.map((spec, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <input className="input" aria-label="Specification name" placeholder="Material" value={spec.key} onChange={(e) => update("specs", draft.specs.map((row, i) => i === index ? { ...row, key: e.target.value } : row))} />
              <input className="input" aria-label="Specification value" placeholder="Organic cotton" value={spec.value} onChange={(e) => update("specs", draft.specs.map((row, i) => i === index ? { ...row, value: e.target.value } : row))} />
              <button type="button" className="btn-ghost btn-sm text-sale" aria-label="Remove specification" onClick={() => update("specs", draft.specs.filter((_, i) => i !== index))}><Trash2 size={14} /></button>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button className="btn-primary" disabled={busy || vendors.length === 0 || categories.length === 0}>
            {busy ? "Saving…" : selectedId ? "Save product" : "Create product"}
          </button>
          {notice && <p role="status" className="text-sm text-pine">{notice}</p>}
          {error && <p role="alert" className="text-sm font-medium text-sale">{error}</p>}
          {vendors.length === 0 && <p className="text-sm text-sale">Approve a seller before creating products.</p>}
        </div>
      </form>
    </div>
  );
}
