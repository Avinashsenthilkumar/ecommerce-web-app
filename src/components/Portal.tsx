"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders its children at the end of <body>.
 *
 * Overlays have to escape the header. The sticky header uses a backdrop blur,
 * and any element with a backdrop filter becomes the containing block for its
 * `position: fixed` descendants — which clipped the menu drawer to the height
 * of the header instead of covering the screen. Portalling to <body> puts the
 * overlay back on the viewport, on every browser.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
