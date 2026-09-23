import { staffGate } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { AccessGate } from "@/components/AccessGate";
import { OpsShell } from "@/components/OpsShell";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "Settings — subsel admin" };

const TABS = [{ href: "/admin/settings", label: "Settings" }];

const GROUPS = [
  {
    id: "brand", title: "Brand & logo", hint: "Store name and logo, used in the header, footer, emails and the app icon area.",
    fields: [
      { k: "brand.name", label: "Store name" },
      { k: "brand.logoUrl", label: "Logo", type: "image", hint: "PNG or SVG under 250 KB. Leave empty to use the built-in mark.", wide: true },
      { k: "brand.tagline", label: "Footer tagline", type: "textarea", wide: true },
    ],
  },
  {
    id: "theme", title: "Theme colours", hint: "Applies to every page instantly — storefront, seller and staff consoles.",
    fields: [
      { k: "theme.ink", label: "Primary (text & buttons)", type: "color" },
      { k: "theme.pine", label: "Accent (offers, success)", type: "color" },
      { k: "theme.paper", label: "Page background", type: "color" },
      { k: "theme.mist", label: "Panels", type: "color" },
      { k: "theme.line", label: "Borders", type: "color" },
    ],
  },
  {
    id: "home", title: "Homepage content", hint: "Every headline, button and statistic on the home page.",
    fields: [
      { k: "home.eyebrow", label: "Small line above the headline" },
      { k: "home.heroImage", label: "Hero image", type: "image", hint: "Wide photo, ideally 1600 × 1100 or larger." },
      { k: "home.headline", label: "Headline", wide: true },
      { k: "home.subtext", label: "Sub text", type: "textarea", wide: true },
      { k: "home.ctaPrimary", label: "Main button text" }, { k: "home.ctaPrimaryHref", label: "Main button link" },
      { k: "home.ctaSecondary", label: "Second button text" }, { k: "home.ctaSecondaryHref", label: "Second button link" },
      { k: "home.categoriesTitle", label: "Categories section title" }, { k: "home.arrivalsTitle", label: "New arrivals section title" },
      { k: "home.featuredTitle", label: "Featured section title" }, { k: "home.fulfilTitle", label: "Delivery section title" },
      { k: "home.fulfilText", label: "Delivery section text", type: "textarea", wide: true },
      { k: "home.stat1Value", label: "Stat 1 value" }, { k: "home.stat1Label", label: "Stat 1 label" },
      { k: "home.stat2Value", label: "Stat 2 value" }, { k: "home.stat2Label", label: "Stat 2 label" },
      { k: "home.stat3Value", label: "Stat 3 value" }, { k: "home.stat3Label", label: "Stat 3 label" },
      { k: "home.stat4Value", label: "Stat 4 value" }, { k: "home.stat4Label", label: "Stat 4 label" },
    ],
  },
  {
    id: "rules", title: "Store rules", hint: "Pricing, delivery and returns. Changes apply to new orders only.",
    fields: [
      { k: "rules.discountPercent", label: "Discount %", type: "number", hint: "Shown on the bag as Discount (x%)." },
      { k: "rules.gstPercent", label: "GST %", type: "number" },
      { k: "rules.freeShippingFrom", label: "Free delivery above (₹)", type: "number" },
      { k: "rules.shippingFee", label: "Delivery fee below that (₹)", type: "number" },
      { k: "rules.returnWindowDays", label: "Return window (days)", type: "number" },
      { k: "rules.lowStockThreshold", label: "Low stock alert at (units)", type: "number", hint: "Used for new SKUs and the admin low-stock warning." },
      { k: "rules.paymentMethods", label: "Payment methods at checkout", type: "methods", wide: true },
    ],
  },
  {
    id: "notice", title: "Announcement & contact", hint: "Top strip on the storefront, and the contact details in the footer.",
    fields: [
      { k: "announcement.enabled", label: "Show announcement bar", type: "toggle" },
      { k: "announcement.text", label: "Announcement text" },
      { k: "contact.email", label: "Support email" }, { k: "contact.phone", label: "Support phone" },
      { k: "contact.address", label: "Address line" }, { k: "footer.note", label: "Footer note" },
    ],
  },
] as const;

export default async function AdminSettingsPage() {
  const { user, allowed } = await staffGate("ADMIN");
  if (!allowed) return <AccessGate need="ADMIN" user={user} />;
  const settings = await getSettings();

  return (
    <OpsShell title="Settings" subtitle="Branding, theme, content and store rules" tabs={TABS} active="/admin/settings">
      <SettingsForm groups={GROUPS as unknown as Parameters<typeof SettingsForm>[0]["groups"]} initial={settings} />
    </OpsShell>
  );
}
