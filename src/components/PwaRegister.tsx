"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds (it is skipped in `npm run dev`). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
