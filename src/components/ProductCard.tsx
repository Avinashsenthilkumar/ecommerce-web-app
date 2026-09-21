import Link from "next/link";
import type { ProductCardData } from "@/lib/services/catalog";
import { ProductImage } from "./ProductImage";
import { CardPrice, Rating } from "./Price";
import { QuickAdd } from "./QuickAdd";
import { WishlistButton } from "./WishlistButton";

export function ProductCard({ p, saved = false }: { p: ProductCardData; saved?: boolean }) {
  const firstInStock = p.variants.find((v) => v.inventory.some((i) => i.available > 0));
  const stock = p.variants.reduce((s, v) => s + v.inventory.reduce((a, i) => a + i.available, 0), 0);
  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-[24px] border border-line bg-mist">
        <Link href={`/product/${p.slug}`} className="block aspect-[4/5]">
          <ProductImage src={p.images[0]?.url} alt={p.name} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" />
        </Link>
        <WishlistButton productId={p.id} saved={saved} />
        <QuickAdd variantId={firstInStock?.id} disabled={!firstInStock} />
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="eyebrow truncate">{p.brand.name}</p>
          <h3 className="text-[15px] leading-snug">
            <Link href={`/product/${p.slug}`} className="hover:underline hover:underline-offset-4">{p.name}</Link>
          </h3>
          <Rating avg={p.ratingAvg} count={p.ratingCount} />
          {stock > 0 && stock <= 8 && <p className="text-xs text-amber">Only {stock} left</p>}
          {stock === 0 && <p className="text-xs text-sale">Out of stock</p>}
        </div>
        <CardPrice price={p.sellingPrice} mrp={p.mrp} />
      </div>
    </article>
  );
}
