/**
 * Downloads the storefront photos and logo from the subsel prototype
 * (https://demo-ecommerc-webapp.lovable.app) into public/products and public/brand.
 *
 *   npm run images
 *
 * It reads the prototype's page and JavaScript bundles, finds every /assets/*.jpg|png|webp,
 * saves each without its build hash (p-shoe-BnbFUOKv.jpg -> p-shoe.jpg), then copies the
 * category and kids photos to the names the seed data uses (cat-men.jpg, p-hoodie.jpg, ...).
 */
import { mkdir, writeFile, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://demo-ecommerc-webapp.lovable.app";
const LOGO = `${BASE}/__l5e/assets-v1/646d887d-8b76-4041-90ba-b84c820021d4/subsel-logo.png`;
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(root, "public", "products");
const BRAND = path.join(root, "public", "brand");

const IMG = /\/?assets\/[\w.-]+?\.(?:jpe?g|png|webp)/g;
const JS = /\/?assets\/[\w.-]+?\.js/g;

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 subsel-image-sync" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}
const norm = (p) => "/" + p.replace(/^\/+/, "");
const exists = (f) => access(f).then(() => true, () => false);
/** p-shoe-BnbFUOKv.jpg -> p-shoe.jpg ; hero-b_Z3yfX2.jpg -> hero.jpg */
const clean = (file) => file.replace(/-[A-Za-z0-9_-]{8}(\.[a-z]+)$/i, "$1"); // Vite adds an 8-char hash
const tokens = (file) => file.replace(/\.[a-z]+$/i, "").toLowerCase().split(/[-_]/);

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(BRAND, { recursive: true });

  console.log("Reading the prototype…");
  const html = await (await get(`${BASE}/`)).text();
  const images = new Set([...html.matchAll(IMG)].map((m) => norm(m[0])));
  const queue = [...new Set([...html.matchAll(JS)].map((m) => norm(m[0])))];
  const seen = new Set();

  // Crawl the entry bundle and any lazily loaded chunks it references
  while (queue.length && seen.size < 80) {
    const js = queue.shift();
    if (seen.has(js)) continue;
    seen.add(js);
    try {
      const code = await (await get(BASE + js)).text();
      for (const m of code.matchAll(IMG)) images.add(norm(m[0]));
      for (const m of code.matchAll(JS)) if (!seen.has(norm(m[0]))) queue.push(norm(m[0]));
    } catch (e) {
      console.warn("  skipped", js, e.message);
    }
  }

  console.log(`Found ${images.size} images in ${seen.size} bundle(s). Downloading…`);
  const saved = [];
  for (const asset of images) {
    const name = clean(path.basename(asset));
    try {
      const buf = Buffer.from(await (await get(BASE + asset)).arrayBuffer());
      await writeFile(path.join(OUT, name), buf);
      // The seed expects .jpg names; keep a .jpg copy of png/webp files too
      if (!name.endsWith(".jpg")) await writeFile(path.join(OUT, name.replace(/\.[a-z]+$/i, ".jpg")), buf);
      saved.push(name);
      console.log("  ✓", name);
    } catch (e) {
      console.warn("  ✗", asset, e.message);
    }
  }

  // Map category photos and the kids product photo to the names the seed data uses
  const CATS = {
    men: ["men", "man", "mens"],
    women: ["women", "woman", "womens"],
    children: ["children", "kids", "kid", "child", "baby"],
    electronics: ["electronics", "electronic", "tech", "audio"],
    accessories: ["accessories", "accessory"],
    home: ["home", "living", "interior", "homeware"],
  };
  const nonProduct = saved.filter((n) => !n.startsWith("p-") && !n.startsWith("hero"));
  for (const [slug, words] of Object.entries(CATS)) {
    const target = path.join(OUT, `cat-${slug}.jpg`);
    const hit = nonProduct.find((n) => tokens(n).some((t) => words.includes(t)));
    if (hit && hit !== `cat-${slug}.jpg`) await copyFile(path.join(OUT, hit), target);
    console.log(`  cat-${slug}.jpg`, hit ? `← ${hit}` : "(not found in prototype)");
  }
  const kids = saved.find((n) => n.startsWith("p-") && tokens(n).some((t) => ["hoodie", "kids", "kid", "terry", "child", "children"].includes(t)));
  if (kids && kids !== "p-hoodie.jpg") await copyFile(path.join(OUT, kids), path.join(OUT, "p-hoodie.jpg"));
  console.log("  p-hoodie.jpg", kids ? `← ${kids}` : "(not found in prototype)");

  try {
    await writeFile(path.join(BRAND, "subsel-logo.png"), Buffer.from(await (await get(LOGO)).arrayBuffer()));
    console.log("  ✓ brand/subsel-logo.png");
  } catch (e) {
    console.warn("  ✗ logo", e.message);
  }

  const expected = ["hero", "p-shoe", "p-tshirt", "p-shirt", "p-sweater", "p-headphones", "p-wallet", "p-coffee", "p-hoodie", ...Object.keys(CATS).map((c) => `cat-${c}`)];
  const missing = [];
  for (const e of expected) if (!(await exists(path.join(OUT, `${e}.jpg`)))) missing.push(`${e}.jpg`);
  console.log(missing.length ? `\nStill missing (add these by hand to public/products): ${missing.join(", ")}` : "\nAll storefront images are in place.");
}

main().catch((e) => {
  console.error("Image download failed:", e.message);
  process.exit(1);
});
