import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck, RotateCcw, ShieldCheck } from "lucide-react";
import { getProductBySlug, relatedProducts } from "@/lib/services/catalog";
import { getWishlistIds } from "@/lib/services/wishlist";
import { ProductImage } from "@/components/ProductImage";
import { Price, Rating } from "@/components/Price";
import { BuyBox } from "@/components/BuyBox";
import { ProductCard } from "@/components/ProductCard";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const p = await getProductBySlug(params.slug);
  return p ? { title: `${p.name} — ${p.brand.name} | subsel`, description: p.shortDescription } : { title: "Product not found | subsel" };
}

const PROMISES = [
  { icon: Truck, title: "Network delivery", text: "Scanned at every leg" },
  { icon: RotateCcw, title: "7 day returns", text: "Pickup from your door" },
  { icon: ShieldCheck, title: "Secure payment", text: "UPI, card & COD" },
];

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product || product.status !== "ACTIVE") notFound();
  const [related, saved] = await Promise.all([relatedProducts(product.id), getWishlistIds()]);

  const variants = product.variants.map((v) => {
    const best = [...v.inventory].sort((a, b) => b.available - a.available)[0];
    return {
      id: v.id,
      label: v.label,
      stock: v.inventory.reduce((s, i) => s + i.available, 0),
      warehouse: best?.available ? best.warehouse.name : null,
    };
  });

  return (
    <div className="shell pt-10">
      <nav className="mb-6 flex gap-2 text-sm text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span aria-hidden>/</span>
        <Link href={`/shop?category=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-10">
        <div className="space-y-4">
          {(product.images.length ? product.images : [{ id: "none", url: "", alt: product.name }]).map((img) => (
            <div key={img.id} className="aspect-[4/5] overflow-hidden rounded-card border border-line bg-mist">
              <ProductImage src={img.url} alt={img.alt ?? product.name} className="h-full w-full" />
            </div>
          ))}
        </div>

        <div className="lg:pl-2">
          <p className="eyebrow">{product.brand.name}</p>
          <h1 className="h-display mt-3 text-[2.4rem] leading-[1.05] sm:text-[2.75rem]">{product.name}</h1>
          <p className="mt-3 text-[15px] text-slate">{product.shortDescription}</p>
          <div className="mt-5">
            <Rating avg={product.ratingAvg} count={product.ratingCount} suffix=" reviews" />
          </div>
          <div className="mt-5">
            <Price price={product.sellingPrice} mrp={product.mrp} />
          </div>

          <div className="mt-8">
            <BuyBox variants={variants} productId={product.id} saved={saved.has(product.id)} />
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {PROMISES.map((p) => (
              <li key={p.title} className="rounded-[20px] border border-line bg-white px-4 py-5">
                <p.icon size={16} strokeWidth={1.75} />
                <p className="mt-4 text-sm">{p.title}</p>
                <p className="mt-0.5 text-xs text-slate">{p.text}</p>
              </li>
            ))}
          </ul>

          <div className="mt-12">
            <h2 className="text-base font-medium">Description</h2>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-slate">{product.description}</p>
            {product.specs.length > 0 && (
              <dl className="mt-8 grid gap-x-8 sm:grid-cols-2">
                {product.specs.map((s) => (
                  <div key={s.id} className="flex justify-between gap-4 border-b border-line py-3 text-sm">
                    <dt className="text-slate">{s.key}</dt>
                    <dd className="text-right">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-6 text-xs text-slate">Sold by {product.vendor.businessName}</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="pt-28">
          <h2 className="section-title mb-10">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} p={p} saved={saved.has(p.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
