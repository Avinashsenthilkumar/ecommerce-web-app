import type { Metadata, Viewport } from "next";
import { getSettings, themeCss } from "@/lib/settings";
import { DM_Sans, Inter_Tight } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

const display = Inter_Tight({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600"] });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const name = s["brand.name"];
  return {
    title: `${name} — ${s["home.headline"]}`,
    description: s["home.subtext"],
    icons: { icon: "/icons/favicon-32.png", apple: "/icons/apple-touch-icon.png" },
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    formatDetection: { telephone: false },
    openGraph: { title: name, description: s["brand.tagline"], type: "website" },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#FAF8F5" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <head>
        {/* theme colours saved in admin settings */}
        <style dangerouslySetInnerHTML={{ __html: themeCss(settings) }} />
      </head>
      <body className="min-h-screen">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
