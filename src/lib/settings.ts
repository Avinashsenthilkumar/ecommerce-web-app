import { z } from "zod";
import { prisma } from "./prisma";

/**
 * Site settings the admin can edit at /admin/settings.
 * Anything not stored in the database falls back to these defaults.
 */
export const DEFAULTS = {
  "brand.name": "subsel",
  "brand.tagline":
    "A connected commerce platform — storefront, fulfilment, hub network and last mile in one operating system.",
  "brand.logoUrl": "", // image URL or uploaded image; empty = built-in mark
  "theme.ink": "#1C1917", // headings, buttons
  "theme.pine": "#3F7D58", // accent / discounts
  "theme.paper": "#FAF8F5", // page background
  "theme.mist": "#F1EEE9", // panels
  "theme.line": "#E7E2DA", // borders
  "announcement.enabled": "0",
  "announcement.text": "Free delivery on orders above ₹999",
  "navigation.items": JSON.stringify([
    { label: "Men", href: "/shop?category=men", visible: true, style: "link" },
    { label: "Women", href: "/shop?category=women", visible: true, style: "link" },
    { label: "Children", href: "/shop?category=children", visible: true, style: "link" },
    { label: "Electronics", href: "/shop?category=electronics", visible: true, style: "link" },
    { label: "Accessories", href: "/shop?category=accessories", visible: true, style: "link" },
    { label: "Home", href: "/shop?category=home", visible: true, style: "link" },
    { label: "All products", href: "/shop?category=all", visible: true, style: "pill" },
  ]),
  "home.eyebrow": "Autumn edit — 2026",
  "home.headline": "Considered goods, delivered precisely.",
  "home.subtext":
    "Apparel, electronics, accessories and home objects — picked, packed and tracked through our own fulfilment network.",
  "home.ctaPrimary": "Shop Now",
  "home.ctaPrimaryHref": "/shop?category=all",
  "home.ctaSecondary": "Explore Collection",
  "home.ctaSecondaryHref": "/shop?category=women",
  "home.heroImage": "/assets/hero-b_Z3yfX2.jpg",
  "home.showCategories": "1",
  "home.categoriesEyebrow": "Categories",
  "home.categoriesTitle": "Six departments, one checkout.",
  "home.categoriesCta": "View all",
  "home.categoriesHref": "/shop?category=all",
  "home.showArrivals": "1",
  "home.arrivalsEyebrow": "Catalogs",
  "home.arrivalsTitle": "Fresh arrivals and new selections.",
  "home.showFulfilment": "1",
  "home.fulfilEyebrow": "Fulfilment",
  "home.featuredTitle": "Selected for the week",
  "home.featuredCta": "View all",
  "home.featuredHref": "/shop?category=all",
  "home.fulfilTitle": "Every parcel is scanned, not guessed.",
  "home.fulfilText":
    "Orders split automatically across our Chennai and Thanjavur fulfilment centres. Each package carries a unique QR that is verified at pick, pack, hub intake and handover.",
  "home.fulfilPrimaryCta": "Track an order",
  "home.fulfilPrimaryHref": "/orders",
  "home.fulfilSecondaryCta": "See operations",
  "home.fulfilSecondaryHref": "/admin",
  "home.showFeatured": "1",
  "home.stat1Value": "99.4%",
  "home.stat1Label": "Pick accuracy",
  "home.stat2Value": "3.2 h",
  "home.stat2Label": "Avg. dispatch",
  "home.stat3Value": "100%",
  "home.stat3Label": "Hub legs scanned",
  "home.stat4Value": "7 days",
  "home.stat4Label": "Return window",
  "rules.discountPercent": "5",
  "rules.gstPercent": "18",
  "rules.freeShippingFrom": "999",
  "rules.shippingFee": "99",
  "rules.returnWindowDays": "7",
  "rules.lowStockThreshold": "8",
  "rules.paymentMethods": "UPI,CARD,NETBANKING,COD",
  "contact.email": "support@subsel.demo",
  "contact.phone": "+91 79040 06912",
  "contact.address": "Chennai & Thanjavur, Tamil Nadu",
  "footer.note": "Prices include GST",
} as const;

export type SettingKey = keyof typeof DEFAULTS;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #1C1917");
const text = (max = 300) => z.string().trim().max(max);
const num = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/, "Numbers only")
    .refine((v) => +v >= min && +v <= max, `Between ${min} and ${max}`);
const navigationItems = z.array(
  z.object({
    label: z.string().trim().min(1).max(40),
    href: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .refine((href) => href.startsWith("/") && !href.startsWith("//") && !href.includes("\\"), "Use an internal path starting with /"),
    visible: z.boolean(),
    style: z.enum(["link", "pill"]),
  }),
).max(12);

export type NavigationItem = z.infer<typeof navigationItems>[number];

/** Validation per key — every admin edit is checked on the server. */
export const RULES: Record<SettingKey, z.ZodTypeAny> = {
  "brand.name": text(40).min(1),
  "brand.tagline": text(300),
  "brand.logoUrl": z
    .string()
    .trim()
    .max(400_000)
    .refine(
      (v) => v === "" || v.startsWith("/") || v.startsWith("http"),
      "Use an image URL, a path like /brand/logo.png, or upload a file",
    ),
  "theme.ink": hex,
  "theme.pine": hex,
  "theme.paper": hex,
  "theme.mist": hex,
  "theme.line": hex,
  "announcement.enabled": z.enum(["0", "1"]),
  "announcement.text": text(140),
  "navigation.items": z
    .string()
    .max(5000)
    .refine((value) => {
      try {
        return navigationItems.safeParse(JSON.parse(value)).success;
      } catch {
        return false;
      }
    }, "Navigation must contain up to 12 valid links with internal paths"),
  "home.eyebrow": text(60),
  "home.headline": text(120).min(1),
  "home.subtext": text(300),
  "home.ctaPrimary": text(30),
  "home.ctaPrimaryHref": text(120),
  "home.ctaSecondary": text(30),
  "home.ctaSecondaryHref": text(120),
  "home.heroImage": z.string().trim().max(400_000),
  "home.showCategories": z.enum(["0", "1"]),
  "home.categoriesEyebrow": text(40),
  "home.categoriesTitle": text(80),
  "home.categoriesCta": text(30),
  "home.categoriesHref": text(120),
  "home.showArrivals": z.enum(["0", "1"]),
  "home.arrivalsEyebrow": text(40),
  "home.arrivalsTitle": text(80),
  "home.showFulfilment": z.enum(["0", "1"]),
  "home.fulfilEyebrow": text(40),
  "home.featuredTitle": text(80),
  "home.featuredCta": text(30),
  "home.featuredHref": text(120),
  "home.fulfilTitle": text(90),
  "home.fulfilText": text(400),
  "home.fulfilPrimaryCta": text(30),
  "home.fulfilPrimaryHref": text(120),
  "home.fulfilSecondaryCta": text(30),
  "home.fulfilSecondaryHref": text(120),
  "home.showFeatured": z.enum(["0", "1"]),
  "home.stat1Value": text(12),
  "home.stat1Label": text(30),
  "home.stat2Value": text(12),
  "home.stat2Label": text(30),
  "home.stat3Value": text(12),
  "home.stat3Label": text(30),
  "home.stat4Value": text(12),
  "home.stat4Label": text(30),
  "rules.discountPercent": num(0, 50),
  "rules.gstPercent": num(0, 30),
  "rules.freeShippingFrom": num(0, 100000),
  "rules.shippingFee": num(0, 5000),
  "rules.returnWindowDays": num(0, 60),
  "rules.lowStockThreshold": num(0, 1000),
  "rules.paymentMethods": z.string().refine(
    (v) =>
      v
        .split(",")
        .filter(Boolean)
        .every((m) => ["UPI", "CARD", "NETBANKING", "COD"].includes(m)) &&
      v.length > 0,
    "Choose at least one payment method",
  ),
  "contact.email": text(80),
  "contact.phone": text(30),
  "contact.address": text(120),
  "footer.note": text(120),
};

export type Settings = Record<SettingKey, string>;

export function getNavigationItems(settings: Settings): NavigationItem[] {
  return navigationItems.parse(JSON.parse(settings["navigation.items"]));
}

// Settings are read on every page. Cache them briefly and clear the cache on save,
// so a render costs one query at most and admin edits appear straight away.
let cached: { at: number; data: Settings } | null = null;
const TTL_MS = 2000;

/** All settings, defaults merged with whatever the admin has saved. */
export async function getSettings(): Promise<Settings> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
  const rows = await prisma.setting.findMany().catch(() => []);
  const out = { ...DEFAULTS } as Record<string, string>;
  for (const r of rows) if (r.key in DEFAULTS) out[r.key] = r.value;
  cached = { at: Date.now(), data: out as Settings };
  return cached.data;
}

export async function saveSettings(values: Record<string, string>) {
  const clean: { key: string; value: string }[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (!(key in DEFAULTS)) continue;
    clean.push({ key, value: RULES[key as SettingKey].parse(value) as string });
  }
  await prisma.$transaction(
    clean.map((c) =>
      prisma.setting.upsert({
        where: { key: c.key },
        create: c,
        update: { value: c.value },
      }),
    ),
  );
  cached = null;
  return { saved: clean.length };
}

export async function resetSettings(keys?: string[]) {
  await (keys?.length
    ? prisma.setting.deleteMany({ where: { key: { in: keys } } })
    : prisma.setting.deleteMany());
  cached = null;
  return { reset: true };
}

/** Store rules in the shape the pricing and returns code expects. */
export function rulesFrom(s: Settings) {
  return {
    discountRate: +s["rules.discountPercent"] / 100,
    discountPercent: +s["rules.discountPercent"],
    gstRate: +s["rules.gstPercent"] / 100,
    gstPercent: +s["rules.gstPercent"],
    freeShippingFrom: +s["rules.freeShippingFrom"],
    shippingFee: +s["rules.shippingFee"],
    returnWindowDays: +s["rules.returnWindowDays"],
    lowStockThreshold: +s["rules.lowStockThreshold"],
    paymentMethods: s["rules.paymentMethods"].split(",").filter(Boolean) as (
      | "UPI"
      | "CARD"
      | "NETBANKING"
      | "COD"
    )[],
  };
}
export type StoreRules = ReturnType<typeof rulesFrom>;

/** "#1C1917" → "28 25 23" so Tailwind's /opacity utilities keep working. */
export function channels(hexColor: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hexColor.trim());
  if (!m) return "0 0 0";
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function themeCss(s: Settings) {
  return `:root{--c-ink:${channels(s["theme.ink"])};--c-pine:${channels(s["theme.pine"])};--c-paper:${channels(s["theme.paper"])};--c-mist:${channels(s["theme.mist"])};--c-line:${channels(s["theme.line"])}}`;
}
