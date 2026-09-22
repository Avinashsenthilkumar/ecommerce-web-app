/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
const DEMO_PASSWORD = "Subsel@123";
const pw = hashPassword(DEMO_PASSWORD); // one hash reused for speed; real signups get their own salt
const ymd = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

async function clear() {
  // children first
  await prisma.session.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.scanEvent.deleteMany();
  await prisma.deliveryAttempt.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.return.deleteMany();
  await prisma.shipmentLeg.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productSpec.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.courier.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.hub.updateMany({ data: { nextHubId: null } });
  await prisma.hub.deleteMany();
  await prisma.category.deleteMany();
  await prisma.counter.deleteMany();
}

async function main() {
  console.log("Clearing existing data…");
  await clear();

  // ── Hub network: Thanjavur (origin) → Chennai (sorting) → Velachery (delivery)
  const velachery = await prisma.hub.create({
    data: { name: "Velachery Delivery Hub", code: "HUB-VLC", type: "DELIVERY", city: "Chennai", pincode: "600042", servicePincodes: ["600042", "600041", "600096", "600100"] },
  });
  const chennaiHub = await prisma.hub.create({
    data: { name: "Chennai Hub", code: "HUB-CHN", type: "SORTING", city: "Chennai", pincode: "600032", servicePincodes: [], nextHubId: velachery.id },
  });
  const thanjavurHub = await prisma.hub.create({
    data: { name: "Thanjavur Hub", code: "HUB-TNJ", type: "ORIGIN", city: "Thanjavur", pincode: "613001", servicePincodes: [], nextHubId: chennaiHub.id },
  });

  // ── Warehouses
  const chennaiFC = await prisma.warehouse.create({
    data: { name: "Chennai Fulfilment Centre", code: "FC-CHN", city: "Chennai", address: "SIDCO Industrial Estate, Guindy", pincode: "600032", firstHubId: chennaiHub.id },
  });
  const thanjavurFC = await prisma.warehouse.create({
    data: { name: "Thanjavur Fulfilment Centre", code: "FC-TNJ", city: "Thanjavur", address: "Nanjikottai Road", pincode: "613006", firstHubId: thanjavurHub.id },
  });

  // ── Users (one per demo role + extra vendor + second rider)
  const priya = await prisma.user.create({
    data: { passwordHash: pw,
      fullName: "Priya Narayanan",
      email: "priya@subsel.demo",
      phone: "98400 12345",
      role: "CUSTOMER",
      addresses: {
        create: { name: "Priya Narayanan", phone: "98400 12345", line1: "14, 3rd Cross Street, Vijaya Nagar", line2: "Near Velachery MRTS", city: "Chennai", state: "Tamil Nadu", pincode: "600042", isDefault: true },
      },
    },
  });
  const admin = await prisma.user.create({ data: { passwordHash: pw, fullName: "Operations Admin", email: "admin@subsel.demo", role: "ADMIN" } });
  const floor = await prisma.user.create({ data: { passwordHash: pw, fullName: "Karthik Floor Lead", email: "floor@subsel.demo", role: "WAREHOUSE", warehouseId: chennaiFC.id } });
  const hubUser = await prisma.user.create({ data: { passwordHash: pw, fullName: "Suresh Hub Supervisor", email: "hub@subsel.demo", role: "HUB", hubId: chennaiHub.id } });
  const raviUser = await prisma.user.create({ data: { passwordHash: pw, fullName: "Ravi Kumar", email: "ravi@subsel.demo", phone: "90030 44120", role: "COURIER" } });
  const meenaUser = await prisma.user.create({ data: { passwordHash: pw, fullName: "Meena Rajan", email: "meena@subsel.demo", phone: "94430 88901", role: "COURIER" } });

  const ravi = await prisma.courier.create({ data: { userId: raviUser.id, zone: "Chennai South", vehicleNumber: "TN-09-BX-4412", homeHubId: velachery.id } });
  await prisma.courier.create({ data: { userId: meenaUser.id, zone: "Thanjavur", vehicleNumber: "TN-45-AC-8890", homeHubId: thanjavurHub.id } });

  const aureliUser = await prisma.user.create({ data: { passwordHash: pw, fullName: "Aureli Studio", email: "aureli@subsel.demo", role: "VENDOR" } });
  const coastalUser = await prisma.user.create({ data: { passwordHash: pw, fullName: "Coastal Goods Co.", email: "coastal@subsel.demo", role: "VENDOR" } });
  const aureli = await prisma.vendor.create({
    data: { userId: aureliUser.id, businessName: "Aureli Studio Pvt Ltd", gstin: "33AAACA1234F1Z5", commissionPercent: 12, status: "APPROVED", approvedAt: hoursAgo(24 * 60), approvedById: admin.id, pickupAddress: "22, Anna Salai, Chennai 600002", storeDescription: "Linen shirts, knitwear, leather goods and kidswear" },
  });
  const coastal = await prisma.vendor.create({
    data: { userId: coastalUser.id, businessName: "Coastal Goods Co.", gstin: "33AABCC5678K1Z2", commissionPercent: 10, status: "APPROVED", approvedAt: hoursAgo(24 * 45), approvedById: admin.id, pickupAddress: "8, Medical College Road, Thanjavur 613004", storeDescription: "Footwear, audio and home goods" },
  });

  // A new seller application waiting for admin approval (demo)
  const lotusUser = await prisma.user.create({ data: { passwordHash: pw, fullName: "Lakshmi Sundaram", email: "lotus@subsel.demo", phone: "98940 55120", role: "VENDOR" } });
  await prisma.vendor.create({
    data: { userId: lotusUser.id, businessName: "Lotus Handlooms", gstin: "33AAFCL9012M1Z8", status: "PENDING", pickupAddress: "14, Weavers Street, Kumbakonam 612001", storeDescription: "Handwoven cotton and silk sarees, stoles and dhotis from Kumbakonam weavers" },
  });

  // ── Categories
  const catData = [
    { slug: "men", name: "Men", tagline: "Tailoring, knitwear & footwear" },
    { slug: "women", name: "Women", tagline: "Editorial layers for every season" },
    { slug: "children", name: "Children", tagline: "Soft, durable, playful" },
    { slug: "electronics", name: "Electronics", tagline: "Sound, screens & everyday tech" },
    { slug: "accessories", name: "Accessories", tagline: "Leather, steel & small goods" },
    { slug: "home", name: "Home", tagline: "Objects for slower mornings" },
  ];
  const cats: Record<string, string> = {};
  for (const [i, c] of catData.entries()) {
    const row = await prisma.category.create({ data: { ...c, sortOrder: i, imageUrl: `/products/cat-${c.slug}.jpg` } });
    cats[c.slug] = row.id;
  }

  // ── Products (exact prototype catalogue)
  type Seed = {
    slug: string;
    name: string;
    brand: string;
    category: string;
    vendorId: string;
    mrp: number;
    price: number;
    rating: number;
    reviews: number;
    image: string;
    short: string;
    description: string;
    specs: [string, string][];
    variants: { sku: string; label: string; stock: number }[];
    warehouseId: string;
    featured?: boolean;
    newArrival?: boolean;
  };

  const products: Seed[] = [
    {
      slug: "nike-pegasus-run", name: "Nike Pegasus Trail Running Shoe", brand: "Nike", category: "men", vendorId: coastal.id,
      mrp: 10999, price: 8499, rating: 4.7, reviews: 1284, image: "/products/p-shoe.jpg",
      short: "Responsive daily trainer built for long neutral miles.",
      description: "A daily running shoe with a breathable engineered knit upper and a dual-density foam midsole. Designed for neutral runners logging steady weekly mileage on road and light trail.",
      specs: [["Upper", "Recycled engineered knit"], ["Midsole", "Dual-density responsive foam"], ["Drop", "10 mm"], ["Weight", "268 g (UK 9)"]],
      variants: [{ sku: "NKE-PEG-UK8", label: "UK 8", stock: 42 }, { sku: "NKE-PEG-UK9", label: "UK 9", stock: 42 }, { sku: "NKE-PEG-UK10", label: "UK 10", stock: 42 }],
      warehouseId: chennaiFC.id, newArrival: true,
    },
    {
      slug: "adidas-essential-tee", name: "Adidas Essentials Cotton T-Shirt", brand: "Adidas", category: "men", vendorId: coastal.id,
      mrp: 1799, price: 1299, rating: 4.5, reviews: 862, image: "/products/p-tshirt.jpg",
      short: "Heavyweight jersey with a clean, squared shoulder.",
      description: "Cut from 220 gsm combed cotton with a ribbed collar that holds its shape through repeated washing. A wardrobe base layer in a relaxed, modern fit.",
      specs: [["Fabric", "220 gsm combed cotton"], ["Fit", "Relaxed"], ["Origin", "Tiruppur, India"]],
      variants: [{ sku: "ADI-TEE-S", label: "S", stock: 42 }, { sku: "ADI-TEE-M", label: "M", stock: 42 }, { sku: "ADI-TEE-L", label: "L", stock: 42 }],
      warehouseId: thanjavurFC.id, newArrival: true,
    },
    {
      slug: "linen-mao-shirt", name: "100% Linen Mao Collar Shirt", brand: "Aureli Studio", category: "men", vendorId: aureli.id,
      mrp: 4599, price: 3499, rating: 4.6, reviews: 214, image: "/products/p-shirt.jpg",
      short: "Breathable pure linen with a band collar and relaxed drape.",
      description: "Garment-washed European linen shirt with a mandarin collar, horn-effect buttons and a relaxed body that softens with every wear.",
      specs: [["Fabric", "100% European linen"], ["Collar", "Mao / band"], ["Fit", "Relaxed"], ["Finish", "Garment washed"]],
      variants: [{ sku: "AUR-LIN-M", label: "M", stock: 42 }, { sku: "AUR-LIN-L", label: "L", stock: 42 }],
      warehouseId: chennaiFC.id, newArrival: true,
    },
    {
      slug: "relaxed-knit-sweater", name: "Relaxed Fit Knit Sweater", brand: "Norra", category: "women", vendorId: aureli.id,
      mrp: 5499, price: 4299, rating: 4.8, reviews: 341, image: "/products/p-sweater.jpg",
      short: "Chunky rib knit with dropped shoulders for easy layering.",
      description: "A relaxed sweater in a soft wool-cotton blend with dropped shoulders and deep ribbed cuffs. Layers over shirts or dresses alike.",
      specs: [["Fabric", "60% cotton, 40% merino wool"], ["Knit", "Chunky rib"], ["Fit", "Relaxed, dropped shoulder"], ["Care", "Hand wash"]],
      variants: [{ sku: "NOR-KNT-S", label: "S", stock: 42 }, { sku: "NOR-KNT-M", label: "M", stock: 42 }],
      warehouseId: thanjavurFC.id, newArrival: true, featured: true,
    },
    {
      slug: "anc-headphones", name: "Studio ANC Wireless Headphones", brand: "Kestrel Audio", category: "electronics", vendorId: coastal.id,
      mrp: 24999, price: 18999, rating: 4.7, reviews: 2109, image: "/products/p-headphones.jpg",
      short: "Adaptive noise cancelling with 40-hour battery life.",
      description: "Over-ear wireless headphones with adaptive active noise cancelling, 40 mm drivers and multipoint Bluetooth. Fold flat into the included case.",
      specs: [["Drivers", "40 mm dynamic"], ["Battery", "Up to 40 hours (ANC on)"], ["Charging", "USB-C, 10 min = 5 h"], ["Connectivity", "Bluetooth 5.3, multipoint"]],
      variants: [{ sku: "KES-ANC-BLK", label: "Charcoal", stock: 6 }, { sku: "KES-ANC-SND", label: "Sand", stock: 6 }],
      warehouseId: chennaiFC.id, featured: true,
    },
    {
      slug: "leather-card-holder", name: "Vegetable Tanned Card Holder", brand: "Halden", category: "accessories", vendorId: aureli.id,
      mrp: 2499, price: 1899, rating: 4.6, reviews: 428, image: "/products/p-wallet.jpg",
      short: "Slim four-slot card holder in full-grain leather.",
      description: "Cut from full-grain vegetable-tanned leather that darkens with use. Four card slots and a central pocket for folded notes.",
      specs: [["Material", "Full-grain vegetable-tanned leather"], ["Capacity", "4 slots + centre pocket"], ["Size", "10 × 7.5 cm"], ["Edges", "Hand burnished"]],
      variants: [{ sku: "HAL-CRD-TAN", label: "Tan", stock: 42 }],
      warehouseId: chennaiFC.id, featured: true,
    },
    {
      slug: "pourover-set", name: "Stoneware Pour-Over Set", brand: "Terra Maison", category: "home", vendorId: coastal.id,
      mrp: 3499, price: 2899, rating: 4.4, reviews: 176, image: "/products/p-coffee.jpg",
      short: "Hand-glazed dripper, carafe and two cups.",
      description: "A stoneware pour-over dripper with matching 600 ml carafe and two cups, finished in a speckled sand glaze. Fits standard #2 filters.",
      specs: [["Material", "Hand-glazed stoneware"], ["Carafe", "600 ml"], ["Includes", "Dripper, carafe, 2 cups"], ["Filter", "Standard #2"]],
      variants: [{ sku: "TER-POR-SND", label: "Sand", stock: 9 }],
      warehouseId: thanjavurFC.id, featured: true,
    },
    {
      slug: "kids-terry-hoodie", name: "Kids Terry Hoodie", brand: "Norra Mini", category: "children", vendorId: aureli.id,
      mrp: 2099, price: 1599, rating: 4.5, reviews: 93, image: "/products/p-hoodie.jpg",
      short: "Soft looped terry with a roomy hood and kangaroo pocket.",
      description: "A brushed cotton terry hoodie made for everyday play, with a relaxed fit that leaves room to grow and ribbed cuffs that stay put.",
      specs: [["Fabric", "100% cotton terry"], ["Fit", "Relaxed, room to grow"], ["Pocket", "Kangaroo"], ["Care", "Machine wash warm"]],
      variants: [{ sku: "NRM-HOD-23", label: "2–3Y", stock: 42 }, { sku: "NRM-HOD-45", label: "4–5Y", stock: 42 }],
      warehouseId: thanjavurFC.id,
    },
  ];

  const variantIds: Record<string, string> = {};
  for (const p of products) {
    const brand = await prisma.brand.upsert({ where: { name: p.brand }, create: { name: p.brand }, update: {} });
    const created = await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        shortDescription: p.short,
        description: p.description,
        categoryId: cats[p.category],
        brandId: brand.id,
        vendorId: p.vendorId,
        mrp: p.mrp,
        sellingPrice: p.price,
        ratingAvg: p.rating,
        ratingCount: p.reviews,
        isFeatured: !!p.featured,
        isNewArrival: !!p.newArrival,
        images: { create: [{ url: p.image, alt: p.name }] },
        specs: { create: p.specs.map(([key, value], i) => ({ key, value, sortOrder: i })) },
      },
    });
    for (const v of p.variants) {
      const variant = await prisma.productVariant.create({ data: { productId: created.id, sku: v.sku, label: v.label } });
      variantIds[v.sku] = variant.id;
      await prisma.inventory.create({ data: { variantId: variant.id, warehouseId: p.warehouseId, available: v.stock } });
    }
  }

  // ── One delivered order, matching the prototype's admin console
  const orderNo = `ORD-${ymd()}-000120`;
  const shipNo = `SHIP-${ymd()}-000450`;
  const order = await prisma.order.create({
    data: {
      orderNumber: orderNo,
      userId: priya.id,
      shippingAddress: { name: "Priya Narayanan", phone: "98400 12345", line1: "14, 3rd Cross Street, Vijaya Nagar", line2: "Near Velachery MRTS", city: "Chennai", state: "Tamil Nadu", pincode: "600042" },
      subtotal: 18999,
      discountTotal: 0,
      taxTotal: 3420,
      shippingFee: 0,
      grandTotal: 22419,
      paymentMethod: "UPI",
      paymentStatus: "PAID",
      status: "DELIVERED",
      placedAt: hoursAgo(52),
      payments: { create: { method: "UPI", gateway: "demo-gateway", gatewayTxnId: "pay_demo_seed01", amount: 22419, status: "SUCCESS", paidAt: hoursAgo(52) } },
    },
  });
  const shipment = await prisma.shipment.create({
    data: {
      shipmentNumber: shipNo,
      trackingNumber: "TRK-771043",
      qrCode: `SUBSEL:${shipNo}:A1B2C3`,
      deliveryOtp: "4821",
      orderId: order.id,
      warehouseId: chennaiFC.id,
      deliveryHubId: velachery.id,
      courierId: ravi.id,
      paymentType: "PREPAID",
      status: "DELIVERED",
      labelGeneratedAt: hoursAgo(49),
      dispatchedAt: hoursAgo(48.5),
      deliveredAt: hoursAgo(40),
      createdAt: hoursAgo(51),
      legs: {
        create: [
          { sequence: 1, hubId: chennaiHub.id, status: "DEPARTED", receivedAt: hoursAgo(47), sortedAt: hoursAgo(46.5), departedAt: hoursAgo(46) },
          { sequence: 2, hubId: velachery.id, status: "DEPARTED", receivedAt: hoursAgo(44), sortedAt: hoursAgo(43.5), departedAt: hoursAgo(43) },
        ],
      },
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      variantId: variantIds["KES-ANC-BLK"],
      productName: "Studio ANC Wireless Headphones",
      variantLabel: "Charcoal",
      sku: "KES-ANC-BLK",
      imageUrl: "/products/p-headphones.jpg",
      quantity: 1,
      unitMrp: 24999,
      unitPrice: 18999,
      lineTotal: 18999,
      allocatedWarehouseId: chennaiFC.id,
      shipmentId: shipment.id,
      pickedQty: 1,
    },
  });
  await prisma.inventory.update({
    where: { variantId_warehouseId: { variantId: variantIds["KES-ANC-BLK"], warehouseId: chennaiFC.id } },
    data: { shipped: 1 },
  });

  const scans: [string, string, number, string | null, string | null][] = [
    ["PICK", chennaiFC.name, 50, floor.id, "Picked 1 × KES-ANC-BLK"],
    ["PACK", chennaiFC.name, 49.5, floor.id, "Packing confirmed"],
    ["LABEL", chennaiFC.name, 49, floor.id, "QR shipping label generated"],
    ["HANDOVER", chennaiFC.name, 48.5, floor.id, "Handed to line-haul courier"],
    ["HUB_INTAKE", chennaiHub.name, 47, hubUser.id, "Received at hub"],
    ["HUB_SORT", chennaiHub.name, 46.5, hubUser.id, "Sorted to next leg"],
    ["HUB_DISPATCH", chennaiHub.name, 46, hubUser.id, "Dispatched to Velachery Delivery Hub"],
    ["HUB_INTAKE", velachery.name, 44, hubUser.id, "Received at hub"],
    ["HUB_SORT", velachery.name, 43.5, hubUser.id, "Sorted to last-mile bay"],
    ["OUT_FOR_DELIVERY", velachery.name, 43, hubUser.id, "Released to last-mile courier"],
    ["DELIVERED", "Customer doorstep, Chennai", 40, raviUser.id, "Delivered, OTP verified"],
  ];
  for (const [type, loc, h, by, remarks] of scans) {
    await prisma.scanEvent.create({
      data: { shipmentId: shipment.id, type: type as never, locationLabel: loc, createdAt: hoursAgo(h), scannedById: by, qrVerified: true, remarks },
    });
  }
  await prisma.deliveryAttempt.create({
    data: { shipmentId: shipment.id, courierId: ravi.id, attemptNumber: 1, status: "DELIVERED", qrVerified: true, podType: "OTP", podValue: "OTP verified", attemptedAt: hoursAgo(40) },
  });

  // A listing submitted by a seller, waiting for admin review (demo)
  const stoleBrand = await prisma.brand.upsert({ where: { name: "Aureli Studio" }, create: { name: "Aureli Studio" }, update: {} });
  const stole = await prisma.product.create({
    data: {
      slug: "handwoven-cotton-stole",
      name: "Handwoven Cotton Stole",
      shortDescription: "Light, breathable handloom stole with tasselled ends.",
      description: "Woven on a pit loom from fine combed cotton, with a soft hand-feel and tasselled ends. Wear it draped over a kurta or as a light summer wrap.",
      categoryId: cats["women"],
      brandId: stoleBrand.id,
      vendorId: aureli.id,
      mrp: 1799,
      sellingPrice: 1399,
      isNewArrival: true,
      status: "PENDING_REVIEW",
      specs: { create: [{ key: "Fabric", value: "100% cotton handloom", sortOrder: 0 }, { key: "Size", value: "200 × 70 cm", sortOrder: 1 }] },
    },
  });
  const stoleVariant = await prisma.productVariant.create({ data: { productId: stole.id, sku: "AUR-STL-IVR", label: "Ivory" } });
  await prisma.inventory.create({ data: { variantId: stoleVariant.id, warehouseId: chennaiFC.id, available: 30 } });

  // Verified reviews from other customers (ratings stay as seeded; these are the written ones)
  const arun = await prisma.user.create({ data: { passwordHash: pw, fullName: "Arun Kumar", email: "arun@subsel.demo", role: "CUSTOMER" } });
  const divya = await prisma.user.create({ data: { passwordHash: pw, fullName: "Divya Srinivasan", email: "divya@subsel.demo", role: "CUSTOMER" } });
  const productIds = Object.fromEntries((await prisma.product.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p.id]));
  const reviews: [string, string, number, string, number][] = [
    [arun.id, "nike-pegasus-run", 5, "Very comfortable on long runs. True to size and the grip is good on wet roads too.", 96],
    [divya.id, "nike-pegasus-run", 4, "Light and cushioned. Took a week to break in but now it is my daily pair.", 170],
    [divya.id, "relaxed-knit-sweater", 5, "Soft, not itchy at all, and the colour is exactly as shown. Delivered in two days.", 60],
    [arun.id, "anc-headphones", 5, "Noise cancelling is excellent on the bus. Battery easily lasts the week.", 210],
    [divya.id, "adidas-essential-tee", 4, "Thick cotton and holds its shape after washing. Slightly long on me.", 130],
  ];
  for (const [userId, slug, rating, comment, h] of reviews) {
    await prisma.review.create({ data: { userId, productId: productIds[slug], rating, comment, createdAt: hoursAgo(h) } });
  }

  // Sequence counters continue after the seeded numbers
  await prisma.counter.createMany({
    data: [
      { key: "order", value: 120 },
      { key: "shipment", value: 450 },
      { key: "return", value: 0 },
      { key: "refund", value: 0 },
    ],
  });

  console.log("Seed complete.");
  console.log(`  All demo accounts use the password ${DEMO_PASSWORD}`);
  console.log("  Customer  priya@subsel.demo      → /login");
  console.log("  Seller    aureli@subsel.demo     → /vendor/login");
  console.log("  Seller    lotus@subsel.demo      → /vendor/login (application pending, approve it in Admin → Sellers)");
  console.log(`  Admin     ${admin.email}      → /staff/login`);
  console.log("  Warehouse floor@subsel.demo      → /staff/login");
  console.log("  Hub       hub@subsel.demo        → /staff/login");
  console.log("  Courier   ravi@subsel.demo       → /staff/login");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
