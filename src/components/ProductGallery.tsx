"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { ProductImage } from "./ProductImage";

type Shot = { id: string; url: string; alt?: string | null };

/**
 * Product images.
 *
 * On phones this is a swipeable, snapping carousel with dots — stacking three
 * tall images meant scrolling past all of them before reaching the price.
 * On desktop, where there is room beside the buy box, they stack as before.
 */
export function ProductGallery({ images, name }: { images: Shot[]; name: string }) {
  const shots = images.length ? images : [{ id: "none", url: "", alt: name }];
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(Math.min(Math.max(next, 0), shots.length - 1));
  };

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      {/* Phone: swipeable */}
      <div className="lg:hidden">
        <div
          ref={track}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={`${name} images`}
        >
          {shots.map((img) => (
            <div key={img.id} className="w-full shrink-0 snap-center px-[1px]">
              <div className="aspect-[4/5] overflow-hidden rounded-card border border-line bg-mist">
                <ProductImage src={img.url} alt={img.alt ?? name} className="h-full w-full" />
              </div>
            </div>
          ))}
        </div>

        {shots.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {shots.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Image ${i + 1} of ${shots.length}`}
                aria-current={i === index ? "true" : undefined}
                className={clsx(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-6 bg-ink" : "w-2 bg-line",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: stacked */}
      <div className="hidden space-y-4 lg:block">
        {shots.map((img) => (
          <div
            key={img.id}
            className="aspect-[4/5] overflow-hidden rounded-card border border-line bg-mist"
          >
            <ProductImage src={img.url} alt={img.alt ?? name} className="h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
