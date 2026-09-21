"use client";

import { useState } from "react";
import clsx from "clsx";

/**
 * Plain <img> with a designed fallback, so the store still looks finished
 * before real photos are dropped into /public/products.
 */
export function ProductImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    const initials = alt
      .split(/\s+/)
      .filter((w) => /[A-Za-z]/.test(w[0] ?? ""))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("");
    return (
      <div
        role="img"
        aria-label={alt}
        className={clsx("flex items-center justify-center bg-gradient-to-br from-mist to-pineSoft", className)}
      >
        <span className="font-display text-4xl text-pine/60">{initials}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src!} alt={alt} className={clsx("object-cover", className)} onError={() => setFailed(true)} />;
}
