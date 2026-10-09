# subsel — connected commerce platform (Next.js full stack)

**Read [FLOW.md](FLOW.md) for the complete end-to-end flow and a 15-minute demo script.**

Storefront, vendor console, admin control tower, warehouse floor, hub network and courier app in one Next.js 14 project, backed by PostgreSQL through Prisma. Every screen in the Lovable prototype is here and every button calls a real API route that changes the database.


## Fixes in this build

Reported issue → what changed.

| # | Reported | Fix |
|---|---|---|
| 1 | Home "View All" button clipped on mobile | Section headers stack on phones; hero, categories, featured and delivery buttons go full width below `sm` so none are cut off |
| 2 | Top menu needs to be scrollable / off-canvas on mobile | New hamburger drawer (`MobileNav`) with every department, a search box, account links and "Sell on …". The chip row stays as the quick path and now has a fade edge showing it scrolls |
| 3 | Filter and search not working as expected | Shop page rebuilt: brand, price range, rating and in-stock filters (sidebar on desktop, drawer on phones), a search box with a visible Search button, removable active-filter chips, and "Clear all". Search also matches description, category and SKU. Every choice lives in the URL, so results are shareable and the back button works |
| 4 | No seller-wise sales | **Sales by seller** table in Admin → Sales & products: orders, units, revenue, commission, payout and last order date per seller, with totals. Also included in the CSV and the on-screen report |
| 5 | No pagination | Added to the catalogue, admin orders, inventory, product performance, sales by seller, seller applications, listings awaiting review and all sellers |
| 6 | Sales reports can't be filtered/viewed by day, month or year; no generate option | New **Sales report** panel: group by day / month / year, pick the year, **Generate report**, read the totals and per-period rows on screen (paginated), hide empty periods, and download the same selection as CSV |
| 7 | Product page has no review and rating function | Any signed-in customer can now rate and review once. "Verified purchase" shows only for customers who actually received it. Added a 5→1 star breakdown and a sign-in prompt for guests |
| 8 | Shows 27 in stock but cannot add to cart | Storefront, cart and checkout now read one shared stock figure (`variantPurchasableStock` — the most units held by a single fulfilment centre, which is what allocation can actually ship). Picking a size no longer lands on a sold-out option, the quick-add button is visible-but-disabled instead of hidden, and a refused add now says why (sign in / wrong account type / sold out) |
| 9 | "See operations" button leads to Page Not Found | That storefront button pointed at `/admin`, a staff console a shopper cannot open. It now points at the catalogue, link settings are validated against real shopper pages, old values stored in the database are repaired on read, and a bad saved menu can no longer crash the header |
| 10 | Header search not working | Search panel now anchors to the whole header instead of overlapping the department row, closes on outside click or Escape, and there is a second always-available search box inside the mobile drawer |
| 11 | Order management doesn't show the payment amount | Each order row shows "Amount due" / "Paid" with the value in large type plus the payment method; the confirm button and both confirmation dialogs name the amount |
| 12 | Mobile menu opened as a clipped strip; app didn't feel native | The header's backdrop blur was making it the containing block for the drawer's `position: fixed`, so `inset-0` sized to the header, not the screen. Overlays now render through a portal on `<body>`. Alongside it: iOS-safe scroll locking that restores position, dynamic-viewport heights (`100dvh`) so nothing hides behind the iOS address bar, 16px fields so iPhone stops zooming on focus, no pull-to-refresh or sideways rubber-band, instant taps with no double-tap zoom, and slide-in drawer / slide-up sheet animations |
| 13 | Mobile menu looked rough; app not responsive enough | Drawer rebuilt as a proper app side menu (identity header, search, shortcut row, department list with chevrons, pinned seller link, 52px rows). Product images became a swipeable carousel with dots on phones. Add to cart / Buy now and the checkout total are pinned above the tab bar. Console tables scroll sideways with a fade edge and the pager stays put. Display headings step down on small screens |
| 14 | Pagination "not available" | The page controls were hidden whenever a list fitted on one page, and with five products per department the shop never showed them. Prev / page numbers / Next now stay on screen, disabled, so paging is visibly part of every list |
| 15 | Sales report hard to find | Admin overview now has a **Generate sales report** button straight to the report, which has its own `#report` anchor |
| 16 | Pick & Pack Queue: bulk orders, inventory validation, priority, order status | Queue is sorted by priority (derived from how long the order has waited against a 24h pick SLA, prepaid breaking ties) with High / Due soon / Normal badges. Every parcel is validated against the buckets it will draw from — a pick needs reserved units, a pack needs picked units — and anything short is flagged and held back from bulk runs. Select parcels and pick or pack them as a batch, or pick a whole parcel in one action instead of one scan per unit; each parcel is its own transaction so one failure doesn't undo the batch, and every parcel reports its own outcome. Each row shows the order's own status and which parcel of the order it is. Filters for High priority / Ready to pack / Stock check |
| 17 | Hub Management: bulk product scanning, order counts | Scan desk has a Bulk mode taking a list of codes (manifest paste or scanner gun, one per line, up to 100). Each code is applied with the same intake → sort → dispatch logic, reported individually, and codes that failed stay in the box for a retry. Each hub card now shows parcels on hand, received / sorted / sent today, distinct orders today and total handled all time, with network totals in the header |


## Stack

Next.js 14 (App Router, server components) · TypeScript · Tailwind CSS · Prisma 5 · PostgreSQL · Zod validation · qrcode.react

## Run it

```bash
npm install
cp .env.example .env          # set DATABASE_URL to your PostgreSQL database
npx prisma db push            # creates all tables
npm run db:seed               # loads 30 products (5 per category), hubs, riders and one delivered order
npm run images                # downloads the prototype photos + logo into public/
npm run dev                   # http://localhost:3000
```

`npm run db:reset` wipes and re-seeds at any time.

Photos: 23 product images ship inside `public/products`. `npm run images` additionally pulls the 8 original prototype photos, the category tiles and the logo (needs internet). Anything it can't find is listed at the end; drop those files into `public/products/` with the names in `public/products/README.md`. Until then the UI shows clean placeholders.

## Accounts and logins

Like Amazon or Flipkart, shoppers never see anything about staff or roles.

| Who | Where they sign in | What they get |
|---|---|---|
| Customers | `/login` and `/register` (from the Account menu) | Cart, checkout, orders, returns, wishlist, saved addresses |
| Sellers | `/vendor/register` to apply, `/vendor/login` ("Sell on subsel" in the footer) | After admin approval: list products (each reviewed by admin), add stock, see sales |
| Staff | `/staff/login` ("Staff login" in the footer) | Admin, warehouse, hub or courier console for their role only |

Guests can browse and search freely. Adding to cart, wishlist or checkout sends them to sign in and brings them back to the same page.

Security: passwords are hashed with scrypt; sessions are random tokens in an httpOnly cookie, and only a SHA-256 hash is stored in the `Session` table. Middleware bounces signed-out visitors from protected pages, and every page and API route checks the role on the server. A customer account cannot sign in through the staff login, and the other way round.

### Seeded accounts (password `Subsel@123` for all)

| Role | Email | Login page |
|---|---|---|
| Customer | priya@subsel.demo | /login |
| Seller | aureli@subsel.demo, coastal@subsel.demo | /vendor/login |
| Seller (pending approval) | lotus@subsel.demo | /vendor/login |
| Admin | admin@subsel.demo | /staff/login |
| Warehouse | floor@subsel.demo | /staff/login |
| Hub | hub@subsel.demo | /staff/login |
| Courier | ravi@subsel.demo, meena@subsel.demo | /staff/login |

These hints also appear under the login forms in development only (`npm run dev`); production builds hide them. Change or delete these accounts before going live.

## Project layout

```
prisma/
  schema.prisma          30 tables
  catalog.json           the 30 products, edit here to change seed data
scripts/
  download-images.mjs    fetches prototype photos (npm run images) in 9 modules (the data structure)
  seed.ts                prototype data
src/lib/
  auth.ts                demo auth + requireRole()
  api.ts                 route wrapper, errors, zod parsing
  codes.ts               ORD-/SHIP-/RET-/RFD- numbers, tracking, QR, OTP
  services/              all business logic, used by pages and API routes
    catalog.ts  cart.ts  orders.ts  inventory.ts  fulfilment.ts
    network.ts (hubs + courier)  returns.ts  admin.ts  vendor.ts
src/app/
  (store)/               /, /shop, /product/[slug], /cart, /orders, /orders/[orderNumber]
  (ops)/                 /admin, /warehouse, /hub, /courier, /vendor, /vendor/login
  api/                   REST endpoints (below)
src/components/          UI
```

## API reference

All responses are `{ ok: true, data }` or `{ ok: false, error }` with a proper HTTP status (400, 401, 403, 404, 409, 422).

| Method | Route | Role | Body / purpose |
|---|---|---|---|
| GET | `/api/products?category=&q=&sort=` | public | Catalogue with stock |
| GET / POST / PATCH | `/api/cart` | customer | POST `{variantId, quantity}` · PATCH `{itemId, quantity}` (0 removes) |
| GET / POST | `/api/orders` | customer | POST `{address, paymentMethod: UPI\|CARD\|COD}` checks out the cart |
| GET | `/api/orders/:orderNumber` | owner / admin | Order with shipments and scan trail |
| POST | `/api/returns` | owner | `{orderItemId, quantity, reason, comment?}` |
| GET | `/api/admin/overview` | admin | Dashboard numbers and tables |
| POST | `/api/admin/orders/:id` | admin | `{action: confirm\|allocate\|cancel}` |
| POST | `/api/admin/returns/:id` | admin | `{action: approve\|reject}` |
| POST | `/api/admin/refunds/:id` | admin | Advance refund: Initiated → Processing → Completed |
| GET / POST | `/api/warehouse` | warehouse | `{action: pick, shipmentId, code}` · `pack` · `label` · `{action: handover, shipmentId, code}` |
| GET / POST | `/api/hub` | hub | `{hubId, code}` — server decides intake / sort / dispatch |
| GET / POST | `/api/courier` | courier | `deliver {shipmentId, code, otp, codCollected?}` · `fail {shipmentId, reason}` · `pickup {returnId}` · `qc {returnId, pass}` |
| POST | `/api/vendor/register` | public | Seller application (status Pending) |
| POST | `/api/vendor/products` | seller | New product (status Pending review) |
| POST | `/api/vendor/products/:id` | seller | `{action: resubmit}` a rejected listing |
| POST | `/api/admin/sellers/:id` | admin | `{action: approve\|reject\|suspend\|reinstate, reason?}` |
| POST | `/api/admin/listings/:id` | admin | `{action: approve\|reject, reason?}` |
| POST | `/api/reviews` | customer | `{productId, rating, comment?}` verified buyers only |
| POST | `/api/vendor/restock` | vendor | `{variantId, warehouseId, quantity}` |
| POST | `/api/auth/register` | public | `{fullName, email, phone, password}` new customer, signed in |
| POST | `/api/auth/login` | public | `{email, password, portal: customer\|vendor\|staff}` |
| POST | `/api/auth/logout` | any | Ends the session |
| GET / POST | `/api/account/addresses` | customer | List / add `{address, isDefault?}` |
| POST | `/api/account/addresses/:id` | customer | `{action: default\|delete}` |
| GET / POST | `/api/wishlist` | customer | POST `{productId}` toggles saved |
| POST | `/api/orders/:orderNumber/cancel` | customer | Cancel before stock is allocated; paid orders get a refund |

## Business rules built in

- **Inventory buckets**: Available → Reserved (allocation) → Picked (one per scan) → Packed → Shipped. Every change writes a `StockMovement`. Buckets never go negative (guarded update inside a transaction).
- **Allocation**: each item goes to a warehouse that can cover its full quantity, preferring one already used by the order, so parcels stay few. One shipment per warehouse.
- **Routing**: `warehouse.firstHub → hub.nextHub → …` until a Delivery hub. Add hubs in the database to extend the network, no code change.
- **COD**: cash is split per parcel (shipping fee on the first). The courier must enter the exact amount; the order becomes Paid once all cash is collected.
- **Proof of delivery**: QR match + customer OTP. Three failed attempts mark the parcel Failed.
- **Warehouse product labels**: The warehouse console can print Code 128 barcode labels for stocked product SKUs, individually or in batches, with a configurable number of copies. Scanning the printed barcode returns the SKU used by the pick workflow.
- **Returns**: 7-day window from delivery, quantity-aware. QC pass restocks the original warehouse and raises a refund (original source for prepaid, bank transfer for COD).
- **Order status** is derived from its shipments after every step, so it never drifts.
- **Bag pricing**: subtotal − discount %, + GST % on the discounted amount, + shipping (free above a threshold). Defaults: 5%, 18%, free from ₹999 else ₹99 — ₹23,298 → −₹1,165 → +₹3,984 GST → ₹26,117. All four are editable in **Admin → Settings → Store rules** (no code change).
- Payment methods: UPI, Card, Netbanking (simulated gateway) and COD. "Save for later" moves a bag item to the wishlist.
- Money is stored as whole rupees (Int).

## Mobile app (PWA)

On phones the store uses an app layout with a bottom tab bar, and it can be installed to the home screen (`src/app/manifest.ts`, `public/sw.js`, icons in `public/icons/`). The service worker only runs in production builds, so test installation with `npm run build && npm start` on `localhost`, or on the live HTTPS deployment.

## Admin settings (no-code configuration)

**Admin → Settings** (`/admin/settings`) lets the admin change the site without touching code. Values live in the `Setting` table; anything unset falls back to the defaults in `src/lib/settings.ts`.

| Section | What can be changed |
|---|---|
| Brand & logo | Store name, logo (upload under 250 KB or paste a URL), footer tagline |
| Theme colours | Primary, accent, background, panel and border colours, with four ready-made themes. Applied site-wide through CSS variables |
| Navigation | Add, remove, show or hide header links; edit labels and internal destinations; reorder links and choose link or button styling. Applies to desktop and mobile department navigation |
| Homepage content | Hero copy, image, buttons and links; section labels, headings, buttons and links; show or hide homepage sections; delivery block text and all four statistics |
| Store rules | Discount %, GST %, free-delivery threshold, delivery fee, return window, low-stock level, which payment methods appear at checkout |
| Announcement & contact | Top announcement bar (on/off + text), support email, phone, address, footer note |

Each section has its own "Reset this section" button. Saving takes effect immediately for new page loads (settings are cached for 2 seconds).
