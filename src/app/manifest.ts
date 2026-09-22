import type { MetadataRoute } from "next";

// Makes subsel installable ("Add to Home screen") and open full-screen like a native app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "subsel — Considered goods, delivered precisely",
    short_name: "subsel",
    description: "Shop apparel, electronics, accessories and home goods with live, scanned delivery tracking.",
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF8F5",
    theme_color: "#FAF8F5",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My orders", url: "/orders", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Bag", url: "/cart", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Wishlist", url: "/wishlist", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
