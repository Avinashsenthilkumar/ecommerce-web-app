import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter_Tight } from "next/font/google";
import "./globals.css";

const display = Inter_Tight({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600"] });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "subsel — Premium multi-category commerce, end to end",
  description:
    "Shop apparel, electronics, accessories and home objects. Every order is fulfilled through a connected warehouse, hub and last-mile network with live tracking.",
  icons: { icon: "/brand/subsel-logo.png" },
  openGraph: {
    title: "subsel — Premium multi-category commerce",
    description: "A connected commerce platform: storefront, fulfilment, hub network and last mile in one operating system.",
    type: "website",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
