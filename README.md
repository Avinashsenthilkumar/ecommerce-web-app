# subsel — connected commerce platform (Next.js full stack)

Storefront, vendor console, admin control tower, warehouse floor, hub network and courier app in one Next.js 14 project, backed by PostgreSQL through Prisma. Every screen in the Lovable prototype is here and every button calls a real API route that changes the database.

## Stack

Next.js 14 (App Router, server components) · TypeScript · Tailwind CSS · Prisma 5 · PostgreSQL · Zod validation · qrcode.react

## Run it

```bash
npm install
cp .env.example .env          # set DATABASE_URL to your PostgreSQL database
npx prisma db push            # creates all 29 tables
npm run db:seed               # loads the prototype catalogue, hubs, riders and one delivered order
npm run images                # downloads the prototype photos + logo into public/
npm run dev                   # http://localhost:3000
```

`npm run db:reset` wipes and re-seeds at any time.

Photos: `npm run images` pulls every photo and the logo from the Lovable prototype (needs internet). Anything it can't find is listed at the end; drop those files into `public/products/` with the names in `public/products/README.md`. Until then the UI shows clean placeholders.

## Accounts and logins

Like Amazon or Flipkart, shoppers never see anything about staff or roles.

| Who | Where they sign in | What they get |
|---|---|---|
| Customers | `/login` and `/register` (from the Account menu) | Cart, checkout, orders, returns, wishlist, saved addresses |
| Sellers | `/vendor/login` ("Sell on subsel" in the footer) | Seller console: list products, add stock, see sales |
| Staff | `/staff/login` ("Staff login" in the footer) | Admin, warehouse, hub or courier console for their role only |

Guests can browse and search freely. Adding to cart, wishlist or checkout sends them to sign in and brings them back to the same page.

Security: passwords are hashed with scrypt; sessions are random tokens in an httpOnly cookie, and only a SHA-256 hash is stored in the `Session` table. Middleware bounces signed-out visitors from protected pages, and every page and API route checks the role on the server. A customer account cannot sign in through the staff login, and the other way round.

### Seeded accounts (password `Subsel@123` for all)

| Role | Email | Login page |
|---|---|---|
| Customer | priya@subsel.demo | /login |
| Seller | aureli@subsel.demo, coastal@subsel.demo | /vendor/login |
| Admin | admin@subsel.demo | /staff/login |
| Warehouse | floor@subsel.demo | /staff/login |
| Hub | hub@subsel.demo | /staff/login |
| Courier | ravi@subsel.demo, meena@subsel.demo | /staff/login |

These hints also appear under the login forms in development only (`npm run dev`); production builds hide them. Change or delete these accounts before going live.

## Project layout

```
prisma/
  schema.prisma          29 tables
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
| POST | `/api/vendor/products` | vendor | New product with variants and opening stock |
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
- **Returns**: 7-day window from delivery, quantity-aware. QC pass restocks the original warehouse and raises a refund (original source for prepaid, bank transfer for COD).
- **Order status** is derived from its shipments after every step, so it never drifts.
- **Bag pricing** (same as the prototype): subtotal − 5% discount, + 18% GST on the discounted amount, + shipping (free from ₹999, otherwise ₹99). Example: ₹23,298 → −₹1,165 → +₹3,984 GST → ₹26,117. Change `DISCOUNT_RATE` / `GST_RATE` in `src/lib/services/cart.ts`.
- Payment methods: UPI, Card, Netbanking (simulated gateway) and COD. "Save for later" moves a bag item to the wishlist.
- Money is stored as whole rupees (Int).
