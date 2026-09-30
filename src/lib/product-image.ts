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
  shoe: "/assets/p-shoe-BnbFUOKv.jpg",
  sneaker: "/assets/p-shoe-BnbFUOKv.jpg",
  trainer: "/assets/p-shoe-BnbFUOKv.jpg",
  boot: "/assets/p-shoe-BnbFUOKv.jpg",
  derby: "/assets/p-shoe-BnbFUOKv.jpg",
  shirt: "/assets/p-shirt-BHfsYPK6.jpg",
  tee: "/assets/p-tshirt-DpNeyLwr.jpg",
  top: "/assets/p-tshirt-DpNeyLwr.jpg",
  tshirt: "/assets/p-tshirt-DpNeyLwr.jpg",
  kurta: "/assets/p-shirt-BHfsYPK6.jpg",
  jacket: "/assets/p-sweater-BtEq3FDq.jpg",
  hoodie: "/assets/p-sweater-BtEq3FDq.jpg",
  sweater: "/assets/p-sweater-BtEq3FDq.jpg",
  jeans: "/assets/p-shoe-BnbFUOKv.jpg",
  chino: "/assets/p-shoe-BnbFUOKv.jpg",
  trouser: "/assets/p-shoe-BnbFUOKv.jpg",
  pant: "/assets/p-shoe-BnbFUOKv.jpg",
  jogger: "/assets/p-shoe-BnbFUOKv.jpg",
  dress: "/assets/p-shirt-BHfsYPK6.jpg",
  romper: "/assets/p-shirt-BHfsYPK6.jpg",
  bag: "/assets/p-wallet-B_UVj6XT.jpg",
  backpack: "/assets/p-wallet-B_UVj6XT.jpg",
  weekender: "/assets/p-wallet-B_UVj6XT.jpg",
  watch: "/assets/p-wallet-B_UVj6XT.jpg",
  band: "/assets/p-headphones-Dgv1yTiY.jpg",
  headphone: "/assets/p-headphones-Dgv1yTiY.jpg",
  headset: "/assets/p-headphones-Dgv1yTiY.jpg",
  earbud: "/assets/p-headphones-Dgv1yTiY.jpg",
  speaker: "/assets/p-headphones-Dgv1yTiY.jpg",
  audio: "/assets/p-headphones-Dgv1yTiY.jpg",
  belt: "/assets/p-wallet-B_UVj6XT.jpg",
  wallet: "/assets/p-wallet-B_UVj6XT.jpg",
  card: "/assets/p-wallet-B_UVj6XT.jpg",
  sunglasses: "/assets/p-wallet-B_UVj6XT.jpg",
  glasses: "/assets/p-wallet-B_UVj6XT.jpg",
  kids: "/assets/p-shirt-BHfsYPK6.jpg",
  kid: "/assets/p-shirt-BHfsYPK6.jpg",
  child: "/assets/p-shirt-BHfsYPK6.jpg",
  baby: "/assets/p-shirt-BHfsYPK6.jpg",
  candle: "/assets/p-coffee-0aXv5XKc.jpg",
  lamp: "/assets/p-coffee-0aXv5XKc.jpg",
  throw: "/assets/p-coffee-0aXv5XKc.jpg",
  basket: "/assets/p-coffee-0aXv5XKc.jpg",
  organizer: "/assets/p-coffee-0aXv5XKc.jpg",
  charger: "/assets/p-headphones-Dgv1yTiY.jpg",
  adapter: "/assets/p-headphones-Dgv1yTiY.jpg",
  power: "/assets/p-headphones-Dgv1yTiY.jpg",
  stole: "/assets/p-shirt-BHfsYPK6.jpg",
  scarf: "/assets/p-shirt-BHfsYPK6.jpg",
  shawl: "/assets/p-shirt-BHfsYPK6.jpg",
  coffee: "/assets/p-coffee-0aXv5XKc.jpg",
  mug: "/assets/p-coffee-0aXv5XKc.jpg",
  cup: "/assets/p-coffee-0aXv5XKc.jpg",
  dinner: "/assets/p-coffee-0aXv5XKc.jpg",
  stoneware: "/assets/p-coffee-0aXv5XKc.jpg",
  ceramic: "/assets/p-coffee-0aXv5XKc.jpg",
  dripper: "/assets/p-coffee-0aXv5XKc.jpg",
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
