"use client";

import { useEffect, useRef, useState } from "react";

/** Logo from admin settings, with the built-in mark drawn if the file is missing. */
export function LogoMark({ src, size = 30 }: { src?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const url = src || "/brand/subsel-logo.png";

  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [url]);

  if (!failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img ref={ref} src={url} alt="" width={size} height={size} decoding="async"
        style={{ height: size, width: "auto", maxWidth: size * 2.4 }} className="object-contain" onError={() => setFailed(true)} />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M5.5 12.5a11 11 0 0 1 21 0" fill="none" stroke="#F5B400" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M26.5 19.5a11 11 0 0 1-21 0" fill="none" stroke="#1E9BD7" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M10.5 15.2a6 6 0 0 1 11 0" fill="none" stroke="#F08A00" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
