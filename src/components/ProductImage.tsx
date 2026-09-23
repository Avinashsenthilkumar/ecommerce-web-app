"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

/**
 * Plain <img> with a designed fallback.
 * The effect also catches images that failed while the page was still server-rendered
 * (React never fires onError for those), so a missing file never shows a broken icon.
 */
export function ProductImage({ src, alt, className, priority = false }: { src?: string | null; alt: string; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(!src);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed || !src) {
    const initials = alt
      .split(/\s+/)
      .filter((w) => /[A-Za-z]/.test(w[0] ?? ""))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("");
    return (
      <div role="img" aria-label={alt} className={clsx("flex items-center justify-center bg-gradient-to-br from-mist to-pineSoft", className)}>
        <span className="font-display text-4xl text-pine/60">{initials}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={clsx("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
