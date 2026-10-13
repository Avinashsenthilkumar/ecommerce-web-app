"use client";

import { useEffect } from "react";

/**
 * Freezes the page behind an open drawer or sheet.
 *
 * `overflow: hidden` on <body> is enough on Android, but iOS Safari ignores it
 * and keeps rubber-banding the page underneath the overlay. Pinning the body
 * with `position: fixed` at a negative offset stops that; the scroll position
 * is remembered and restored on close so the shopper lands back where they were
 * rather than at the top of the list.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const { body } = document;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      // `position: fixed` wiped the scroll offset; put the shopper back.
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
