const PRODUCT_FILES = new Set([
  "/products/cat-accessories.jpg",
  "/products/cat-children.jpg",
  "/products/cat-electronics.jpg",
  "/products/cat-home.jpg",
  "/products/cat-men.jpg",
  "/products/cat-women.jpg",
  "/products/hero.jpg",
  "/products/p-backpack.jpg",
  "/products/p-band.jpg",
  "/products/p-basket.jpg",
  "/products/p-belt.jpg",
  "/products/p-candle.jpg",
  "/products/p-charger.jpg",
  "/products/p-chinos.jpg",
  "/products/p-derby.jpg",
  "/products/p-dinnerset.jpg",
  "/products/p-dress.jpg",
  "/products/p-earbuds.jpg",
  "/products/p-jacket.jpg",
  "/products/p-jeans.jpg",
  "/products/p-joggers.jpg",
  "/products/p-kidshoes.jpg",
  "/products/p-kurta.jpg",
  "/products/p-romper.jpg",
  "/products/p-speaker.jpg",
  "/products/p-stole.jpg",
  "/products/p-sunglasses.jpg",
  "/products/p-throw.jpg",
  "/products/p-watch.jpg",
  "/products/p-weekender.jpg",
  "/products/brand/subsel-logo.png",
]);

const REAL_PRODUCT_IMAGE_MAP: Record<string, string> = {
  shoe: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  sneaker:
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  trainer:
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  boot: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
  derby:
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
  shirt:
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
  tee: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
  top: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
  kurta:
    "https://images.unsplash.com/photo-1617137984096-2f9d4c1d5f39?auto=format&fit=crop&w=900&q=80",
  jacket:
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
  hoodie:
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
  sweater:
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
  jeans:
    "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80",
  chino:
    "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80",
  trouser:
    "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80",
  pant: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80",
  jogger:
    "https://images.unsplash.com/photo-1605518216965-733ca1905fb8?auto=format&fit=crop&w=900&q=80",
  dress:
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
  romper:
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
  bag: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",
  backpack:
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",
  weekender:
    "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
  watch:
    "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80",
  band: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80",
  headphone:
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80",
  headset:
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80",
  earbud:
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80",
  speaker:
    "https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=900&q=80",
  audio:
    "https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=900&q=80",
  belt: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
  wallet:
    "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80",
  card: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80",
  sunglasses:
    "https://images.unsplash.com/photo-1577803947579-9f4f7f68d0d4?auto=format&fit=crop&w=900&q=80",
  glasses:
    "https://images.unsplash.com/photo-1577803947579-9f4f7f68d0d4?auto=format&fit=crop&w=900&q=80",
  kids: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=900&q=80",
  kid: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=900&q=80",
  child:
    "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=900&q=80",
  baby: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=900&q=80",
  candle:
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  lamp: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  throw:
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  basket:
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  organizer:
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  charger:
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80",
  adapter:
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80",
  power:
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80",
  stole:
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  scarf:
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  shawl:
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  coffee:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  mug: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  cup: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  dinner:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  stoneware:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  ceramic:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  dripper:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
};

const RELATED_IMAGES: Array<{
  match: (name: string) => boolean;
  image: string;
}> = Object.entries(REAL_PRODUCT_IMAGE_MAP).map(([keyword, image]) => ({
  match: (name) => name.includes(keyword),
  image,
}));

const palette = [
  ["#0f172a", "#8b5cf6"],
  ["#1f2937", "#22c55e"],
  ["#111827", "#f59e0b"],
  ["#1e293b", "#06b6d4"],
  ["#312e81", "#f472b6"],
  ["#14532d", "#facc15"],
] as const;

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function makeProductArt(name: string) {
  const safeName = (name || "Product").replace(/\s+/g, " ").trim();
  const words = safeName.split(/\s+/).filter(Boolean);
  const title = words.slice(0, 3).join(" ").slice(0, 28) || "Product";
  const initials =
    words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "P";
  const [bg, accent] = palette[hashString(safeName) % palette.length];

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500" role="img" aria-label="${safeName}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="${accent}"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="1500" fill="url(#g)"/>
    <circle cx="900" cy="240" r="260" fill="rgba(255,255,255,0.08)"/>
    <circle cx="330" cy="1270" r="360" fill="rgba(255,255,255,0.08)"/>
    <rect x="140" y="1110" width="920" height="210" rx="30" fill="rgba(15,23,42,0.22)"/>
    <text x="600" y="655" text-anchor="middle" font-size="290" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="white" letter-spacing="6">${initials}</text>
    <text x="600" y="1225" text-anchor="middle" font-size="68" font-family="Arial, Helvetica, sans-serif" font-weight="600" fill="white">${title}</text>
  </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findBestRealImage(name: string) {
  const normalizedName = normalize(name);
  for (const rule of RELATED_IMAGES) {
    if (rule.match(normalizedName)) {
      return rule.image;
    }
  }
  return null;
}

export function resolveProductImageUrl(name: string, source?: string | null) {
  const mapped = findBestRealImage(name);
  if (mapped) return mapped;

  const trimmed = (source ?? "").trim();
  if (trimmed && trimmed.startsWith("data:image/")) return trimmed;
  if (
    trimmed &&
    (trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("/"))
  ) {
    if (trimmed.startsWith("/products/") && !PRODUCT_FILES.has(trimmed)) {
      return makeProductArt(name);
    }
    return trimmed;
  }

  return makeProductArt(name);
}
