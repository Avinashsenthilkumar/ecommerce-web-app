# subsel — how the platform works, end to end

subsel is a marketplace like Amazon or Flipkart: many sellers list products, customers buy them in one checkout, and subsel runs its own fulfilment network (warehouses → hubs → couriers) with a QR scan at every step.

## 1. Who uses it

| Person | Signs in at | What they do |
|---|---|---|
| Customer | `/login`, `/register` | Browse, search, wishlist, bag, checkout, track, cancel, return, review |
| Seller | `/vendor/register`, `/vendor/login` | Apply to sell, list products, add stock, see sales and payout |
| Admin | `/staff/login` | Approve sellers and listings, confirm and allocate orders, returns, refunds, inventory |
| Warehouse staff | `/staff/login` | Pick (scan each item), pack, print QR label, hand over |
| Hub staff | `/staff/login` | Scan parcels in, sort, dispatch to the next hub or to a rider |
| Courier (rider) | `/staff/login` | Deliver with QR + customer OTP, collect COD, collect returns, quality check |

Customers never see staff tools. Each staff member sees only their own console; admin can open all of them.

## 2. Seller onboarding (admin approval)

1. The seller fills in the application at **`/vendor/register`**: business name, contact, GSTIN (optional), pickup address, what they sell.
2. The account is created with status **Pending**. When they sign in they see "Your application is under review"; they cannot list products yet.
3. Admin opens **Admin → Sellers**, checks the details, then:
   - **Approve seller** → status Approved. The seller can now list products.
   - **Reject** (with a reason) → the seller sees the reason on their status screen.
4. Later, admin can **Suspend** an approved seller (with a reason). All of that seller's products disappear from the store instantly, and they cannot add to bags. **Reinstate** brings everything back.

## 3. Listing a product (admin review)

1. An approved seller clicks **List a new product**: name, brand, category, MRP, selling price, description, SKU prefix, variants with opening stock, and the warehouse that holds the stock.
2. The product is saved as **Pending review**, hidden from customers. Opening stock is recorded as a Restock movement.
3. Admin sees it under **Admin → Sellers → Listings awaiting review**:
   - **Approve & publish** → the product goes live on the store.
   - **Send back** (with a note) → the seller sees the note and can fix it and **Resubmit for review**.
4. Sellers can add stock to any SKU at any time; it becomes buyable immediately.

## 4. Customer shopping

1. **Browse** the home page, departments, search and sort. Anyone can browse without an account.
2. **Wishlist**: tap the heart. Guests are sent to sign in and returned to the same page.
3. **Bag**: add to cart or buy now. Stock is checked against every warehouse. From the bag the customer can change quantity, remove, or **Save for later** (moves the item to the wishlist).
4. **Checkout** on the bag page:
   - Choose a saved address or type a new one (it is saved for next time).
   - Choose **UPI, Card, Netbanking or COD**.
   - Price: subtotal − **5% discount** + **18% GST** + shipping (free from ₹999, otherwise ₹99).
   - UPI / Card / Netbanking are approved instantly by the demo gateway. COD is paid at the door.
5. The order is created with a number like `ORD-20260922-000121` and the bag is emptied.

## 5. Order lifecycle

```
Customer places order            → PLACED
Admin: Confirm payment / COD     → CONFIRMED        (customer can cancel up to here)
Admin: Allocate stock            → ALLOCATED        stock Available → Reserved, parcels created
Warehouse: scan items            → PROCESSING       stock Reserved → Picked (one unit per scan)
Warehouse: pack, QR label        →                  stock Picked → Packed
Warehouse: hand over (scan QR)   → SHIPPED          stock Packed → Shipped
Hubs: intake → sort → dispatch   → SHIPPED          each hub scans the parcel
Delivery hub releases to rider   → out for delivery customer sees the OTP
Rider: QR + OTP (+ cash)         → DELIVERED        COD orders become Paid
```

**Split shipments.** If items sit in different warehouses (for example shoes in Chennai and a T-shirt in Thanjavur), allocation creates one parcel per warehouse, each with its own tracking number, QR and delivery OTP. For COD, the cash is split across parcels so they add up exactly to the order total.

**Routing.** Each warehouse knows its first hub and each hub knows the next one:
- Thanjavur FC → Thanjavur Hub (origin) → Chennai Hub (sorting) → Velachery Delivery Hub
- Chennai FC → Chennai Hub (sorting) → Velachery Delivery Hub

Adding hubs in the database extends the network without code changes.

**Cancellation.** A customer or admin can cancel before stock is allocated. If it was prepaid, a refund is raised automatically.

## 6. Warehouse, hub and courier in detail

**Warehouse** (`/warehouse`)
1. Each parcel lists its SKUs. Staff scan every unit; a wrong or extra SKU is rejected.
2. When all units are scanned → **Confirm packed**.
3. **Generate QR label** → a unique QR is printed on the parcel.
4. **Hand over**: scan the QR; the parcel leaves and the first hub is told to expect it.

**Hub** (`/hub`)
- One scan does the right thing based on where the parcel is: first scan = received, second = sorted, third = dispatched to the next hub. At the delivery hub, the third scan assigns the least-busy rider attached to that hub.

**Courier** (`/courier`)
1. The runsheet shows each parcel with the address and, for COD, the exact cash to collect.
2. Deliver: scan the QR, enter the customer's 4-digit OTP (shown on their order page), enter the cash for COD → **Mark delivered**.
3. If delivery fails, record the reason. After 3 failed attempts the parcel is marked Failed (return to origin).

**Customer tracking** (`/orders`): every scan above appears on the customer's timeline with place and time.

## 7. Returns and refunds

1. Within **7 days of delivery**, the customer taps **Request return** on the item, picks the quantity and reason.
2. Admin → **Approve and schedule pickup** (the rider who delivered it is assigned) or **Reject**.
3. Rider → **Mark collected**, then at intake → **QC passed, restock** or **QC failed**.
4. QC passed: the units go back to Available in the original warehouse, and a refund is raised for what the customer paid for those items (after discount and GST). Prepaid refunds go to the original payment method; COD refunds go by bank transfer.
5. Admin → **Start processing** → **Mark completed**. The order shows Refunded or Partially refunded.

## 8. Reviews

- Only a customer who **received** the product can review it, once. The review shows a **Verified purchase** badge.
- The product's star rating and rating count update immediately.

## 9. Mobile app experience

- On phones the site switches to an app layout with a **bottom tab bar**: Home, Categories, Wishlist, Bag (with count), Account.
- It is a **Progressive Web App**: customers can install it on the home screen. It then opens full-screen with its own icon, like a native app.
  - Android (Chrome): an **Install** banner appears.
  - iPhone (Safari): a hint says Share → Add to Home Screen.
- Photos and app files are cached for fast repeat visits. With no internet, a branded "You are offline" screen appears. Personal pages (bag, orders, prices) always load fresh.
- Installing requires the live **HTTPS** site (for example on Vercel), or `localhost` on the same computer.

## 10. Money and stock rules

- Money is stored in whole rupees.
- Inventory buckets per SKU per warehouse: **Available → Reserved → Picked → Packed → Shipped**. Every change is logged in Stock movements with who did it and why. Stock can never go negative.
- Low stock: a SKU at or below 8 available units is flagged to admin.
- Seller payout estimate = sales × (1 − commission %). Commission is 10–12% for the demo sellers.

## 11. Demo script (15 minutes)

Password for every demo account: `Subsel@123`.

1. **Seller approval**: `/vendor/login` as `lotus@subsel.demo` → "under review". Then `/staff/login` as `admin@subsel.demo` → Sellers → Approve Lotus Handlooms. Sign in as Lotus again → the seller console opens.
2. **Listing approval**: Admin → Sellers → "Handwoven Cotton Stole" → Approve & publish. It now appears under Women.
3. **Order**: `/login` as `priya@subsel.demo` → add the Nike shoe and the Adidas tee → bag → COD → Place order (two parcels, two warehouses).
4. **Admin**: Confirm COD order → Allocate stock.
5. **Warehouse** (`floor@subsel.demo`): scan, pack, label and hand over both parcels.
6. **Hub** (`hub@subsel.demo`): scan each parcel through every hub until it is out for delivery.
7. **Courier** (`ravi@subsel.demo`): QR + OTP + cash → Delivered.
8. **Customer**: see the full scan trail, write a review, request a return.
9. **Admin → Courier → Admin**: approve the return, collect it, pass QC, complete the refund.

Use two browsers (or a normal and a private window) so the customer and staff stay signed in side by side.
