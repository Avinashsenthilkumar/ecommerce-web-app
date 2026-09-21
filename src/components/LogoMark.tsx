"use client";

import { useState } from "react";

/** Uses /brand/subsel-logo.png when present; otherwise draws the yellow and blue swoosh. */
export function LogoMark({ size = 30 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/brand/subsel-logo.png" alt="" width={size} height={size} className="object-contain" onError={() => setFailed(true)} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M4 9c6-6 18-6 22 1-7-3-14-2-19 4-2-1-3-3-3-5z" fill="#F5B400" />
      <path d="M28 23c-6 6-18 6-22-1 7 3 14 2 19-4 2 1 3 3 3 5z" fill="#1E9BD7" />
      <path d="M8 16c5-4 12-4 16 0-5-2-11-2-16 0z" fill="#F08A00" />
    </svg>
  );
}
