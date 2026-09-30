/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { resolveProductImageUrl } from "../src/lib/product-image";
import catalog from "./catalog.json";

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
    data: {
      name: "Velachery Delivery Hub",
      code: "HUB-VLC",
      type: "DELIVERY",
      city: "Chennai",
      pincode: "600042",
      servicePincodes: ["600042", "600041", "600096", "600100"],
    },
  });
  const chennaiHub = await prisma.hub.create({
    data: {
      name: "Chennai Hub",
      code: "HUB-CHN",
      type: "SORTING",
      city: "Chennai",
      pincode: "600032",
      servicePincodes: [],
      nextHubId: velachery.id,
    },
  });
  const thanjavurHub = await prisma.hub.create({
    data: {
      name: "Thanjavur Hub",
      code: "HUB-TNJ",
      type: "ORIGIN",
      city: "Thanjavur",
      pincode: "613001",
      servicePincodes: [],
      nextHubId: chennaiHub.id,
    },
  });

  // ── Warehouses
  const chennaiFC = await prisma.warehouse.create({
    data: {
      name: "Chennai Fulfilment Centre",
      code: "FC-CHN",
      city: "Chennai",
      address: "SIDCO Industrial Estate, Guindy",
      pincode: "600032",
      firstHubId: chennaiHub.id,
    },
  });
  const thanjavurFC = await prisma.warehouse.create({
    data: {
      name: "Thanjavur Fulfilment Centre",
      code: "FC-TNJ",
      city: "Thanjavur",
      address: "Nanjikottai Road",
      pincode: "613006",
      firstHubId: thanjavurHub.id,
    },
  });

  // ── Users (one per demo role + extra vendor + second rider)
  const priya = await prisma.user.create({
    data: {
      passwordHash: pw,
      fullName: "Priya Narayanan",
      email: "priya@subsel.demo",
      phone: "98400 12345",
      role: "CUSTOMER",
      addresses: {
        create: {
          name: "Priya Narayanan",
          phone: "98400 12345",
          line1: "14, 3rd Cross Street, Vijaya Nagar",
          line2: "Near Velachery MRTS",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600042",
          isDefault: true,
        },
      },
    },
  });
  const admin = await prisma.user.create({
    data: {
      passwordHash: pw,
      fullName: "Operations Admin",
      email: "admin@subsel.demo",
      role: "ADMIN",
    },
  });
  const floor = await prisma.user.create({
    data: {
      passwordHash: pw,
      fullName: "Karthik Floor Lead",
      email: "floor@subsel.demo",
      role: "WAREHOUSE",
      warehouseId: chennaiFC.id,
    },
  });
  const hubUser = await prisma.user.create({
    data: {
      passwordHash: pw,
      fullName: "Suresh Hub Supervisor",
      email: "hub@subsel.demo",
      role: "HUB",
      hubId: chennaiHub.id,
    },
  });
  const raviUser = await prisma.user.create({
    data: {
      passwordHash: pw,
      fullName: "Ravi Kumar",
      email: "ravi@subsel.demo",
      phone: "90030 44120",
      role: "COURIER",
    },
  });
  const meenaUser = await prisma.user.create({
    data: {
      passwordHash: pw,
      fullName: "Meena Rajan",
      email: "meena@subsel.demo",
      phone: "94430 88901",
      role: "COURIER",
    },
  });

  const ravi = await prisma.courier.create({
    data: {
      userId: raviUser.id,
      zone: "Chennai South",
      vehicleNumber: "TN-09-BX-4412",
      homeHubId: velachery.id,
    },
  });
  await prisma.courier.create({
    data: {
      userId: meenaUser.id,
      zone: "Thanjavur",
      vehicleNumber: "TN-45-AC-8890",
      homeHubId: thanjavurHub.id,
    },
  });

  const aureliUser = await prisma.user.create({
    data: {
      passwordHash: pw,
      fullName: "Aureli Studio",
      email: "aureli@subsel.demo",
      role: "VENDOR",
    },
  });
  const coastalUser = await prisma.user.create({
    data: {
      passwordHash: pw,
      fullName: "Coastal Goods Co.",
      email: "coastal@subsel.demo",
      role: "VENDOR",
    },
  });
  const aureli = await prisma.vendor.create({
    data: {
      userId: aureliUser.id,
      businessName: "Aureli Studio Pvt Ltd",
      gstin: "33AAACA1234F1Z5",
      commissionPercent: 12,
      status: "APPROVED",
      approvedAt: hoursAgo(24 * 60),
      approvedById: admin.id,
      pickupAddress: "22, Anna Salai, Chennai 600002",
      storeDescription: "Linen shirts, knitwear, leather goods and kidswear",
    },
  });
  const coastal = await prisma.vendor.create({
    data: {
      userId: coastalUser.id,
      businessName: "Coastal Goods Co.",
      gstin: "33AABCC5678K1Z2",
      commissionPercent: 10,
      status: "APPROVED",
      approvedAt: hoursAgo(24 * 45),
      approvedById: admin.id,
      pickupAddress: "8, Medical College Road, Thanjavur 613004",
      storeDescription: "Footwear, audio and home goods",
    },
  });

  // A new seller application waiting for admin approval (demo)
  const lotusUser = await prisma.user.create({
    data: {
      passwordHash: pw,
      fullName: "Lakshmi Sundaram",
      email: "lotus@subsel.demo",
      phone: "98940 55120",
      role: "VENDOR",
    },
  });
  await prisma.vendor.create({
    data: {
      userId: lotusUser.id,
      businessName: "Lotus Handlooms",
      gstin: "33AAFCL9012M1Z8",
      status: "PENDING",
      pickupAddress: "14, Weavers Street, Kumbakonam 612001",
      storeDescription:
        "Handwoven cotton and silk sarees, stoles and dhotis from Kumbakonam weavers",
    },
  });

  // ── Categories
  const catData = [
    {
      slug: "men",
      name: "Men",
      tagline: "Tailoring, knitwear & footwear",
      imageUrl: "/assets/cat-men-DnwSovaf.jpg",
    },
    {
      slug: "women",
      name: "Women",
      tagline: "Editorial layers for every season",
      imageUrl: "/assets/cat-women-cU_9HMCT.jpg",
    },
    {
      slug: "children",
      name: "Children",
      tagline: "Soft, durable, playful",
      imageUrl: "/assets/cat-children-CR0xgnYV.jpg",
    },
    {
      slug: "electronics",
      name: "Electronics",
      tagline: "Sound, screens & everyday tech",
      imageUrl: "/assets/cat-electronics-Dpfn04Dd.jpg",
    },
    {
      slug: "accessories",
      name: "Accessories",
      tagline: "Leather, steel & small goods",
      imageUrl: "/assets/cat-accessories-BjiqwQD5.jpg",
    },
    {
      slug: "home",
      name: "Home",
      tagline: "Objects for slower mornings",
      imageUrl: "/assets/cat-home-CXOvODvK.jpg",
    },
  ];
  const cats: Record<string, string> = {};
  for (const [i, c] of catData.entries()) {
    const row = await prisma.category.create({
      data: { ...c, sortOrder: i, imageUrl: c.imageUrl },
    });
    cats[c.slug] = row.id;
  }

  // ── Products (exact prototype catalogue)
  // ── Products: 5 live listings in every category (prisma/catalog.json)
  type SeedProduct = {
    slug: string;
    name: string;
    brand: string;
    cat: string;
    vendor: "A" | "C";
    mrp: number;
    price: number;
    rating: number;
    reviews: number;
    image: string;
    wh: "CHN" | "TNJ";
    short: string;
    desc: string;
    specs: [string, string][];
    variants: [string, string, number][];
    featured?: boolean;
    new?: boolean;
  };
  const WH: Record<string, string> = { CHN: chennaiFC.id, TNJ: thanjavurFC.id };
  const VENDOR: Record<string, string> = { A: aureli.id, C: coastal.id };
  const variantIds: Record<string, string> = {};

  async function createListing(
    p: SeedProduct,
    status: "ACTIVE" | "PENDING_REVIEW",
  ) {
    const brand = await prisma.brand.upsert({
      where: { name: p.brand },
      create: { name: p.brand },
      update: {},
    });
    const productImageUrl = resolveProductImageUrl(p.name, p.image);
    const product = await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        shortDescription: p.short,
        description: p.desc,
        categoryId: cats[p.cat],
        brandId: brand.id,
        vendorId: VENDOR[p.vendor],
        mrp: p.mrp,
        sellingPrice: p.price,
        ratingAvg: p.rating,
        ratingCount: p.reviews,
        isFeatured: !!p.featured,
        isNewArrival: !!p.new,
        status,
        images: { create: [{ url: productImageUrl, alt: p.name }] },
        specs: {
          create: p.specs.map(([key, value], i) => ({
            key,
            value,
            sortOrder: i,
          })),
        },
      },
    });
    for (const [sku, label, stock] of p.variants) {
      const variant = await prisma.productVariant.create({
        data: { productId: product.id, sku, label },
      });
      variantIds[sku] = variant.id;
      await prisma.inventory.create({
        data: {
          variantId: variant.id,
          warehouseId: WH[p.wh],
          available: stock,
        },
      });
    }
    return product;
  }

  for (const p of catalog.products as unknown as SeedProduct[])
    await createListing(p, "ACTIVE");
  // one listing still waiting for admin review, so the approval flow can be demonstrated
  await createListing(
    catalog.pendingListing as unknown as SeedProduct,
    "PENDING_REVIEW",
  );
  console.log(
    `  ${catalog.products.length} live products across ${Object.keys(cats).length} categories`,
  );

  // ── One delivered order, matching the prototype's admin console
  const orderNo = `ORD-${ymd()}-000120`;
  const shipNo = `SHIP-${ymd()}-000450`;
  const order = await prisma.order.create({
    data: {
      orderNumber: orderNo,
      userId: priya.id,
      shippingAddress: {
        name: "Priya Narayanan",
        phone: "98400 12345",
        line1: "14, 3rd Cross Street, Vijaya Nagar",
        line2: "Near Velachery MRTS",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600042",
      },
      subtotal: 18999,
      discountTotal: 0,
      taxTotal: 3420,
      shippingFee: 0,
      grandTotal: 22419,
      paymentMethod: "UPI",
      paymentStatus: "PAID",
      status: "DELIVERED",
      placedAt: hoursAgo(52),
      payments: {
        create: {
          method: "UPI",
          gateway: "demo-gateway",
          gatewayTxnId: "pay_demo_seed01",
          amount: 22419,
          status: "SUCCESS",
          paidAt: hoursAgo(52),
        },
      },
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
          {
            sequence: 1,
            hubId: chennaiHub.id,
            status: "DEPARTED",
            receivedAt: hoursAgo(47),
            sortedAt: hoursAgo(46.5),
            departedAt: hoursAgo(46),
          },
          {
            sequence: 2,
            hubId: velachery.id,
            status: "DEPARTED",
            receivedAt: hoursAgo(44),
            sortedAt: hoursAgo(43.5),
            departedAt: hoursAgo(43),
          },
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
      imageUrl:
        "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80",
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
    where: {
      variantId_warehouseId: {
        variantId: variantIds["KES-ANC-BLK"],
        warehouseId: chennaiFC.id,
      },
    },
    data: { shipped: 1 },
  });

  const scans: [string, string, number, string | null, string | null][] = [
    ["PICK", chennaiFC.name, 50, floor.id, "Picked 1 × KES-ANC-BLK"],
    ["PACK", chennaiFC.name, 49.5, floor.id, "Packing confirmed"],
    ["LABEL", chennaiFC.name, 49, floor.id, "QR shipping label generated"],
    ["HANDOVER", chennaiFC.name, 48.5, floor.id, "Handed to line-haul courier"],
    ["HUB_INTAKE", chennaiHub.name, 47, hubUser.id, "Received at hub"],
    ["HUB_SORT", chennaiHub.name, 46.5, hubUser.id, "Sorted to next leg"],
    [
      "HUB_DISPATCH",
      chennaiHub.name,
      46,
      hubUser.id,
      "Dispatched to Velachery Delivery Hub",
    ],
    ["HUB_INTAKE", velachery.name, 44, hubUser.id, "Received at hub"],
    ["HUB_SORT", velachery.name, 43.5, hubUser.id, "Sorted to last-mile bay"],
    [
      "OUT_FOR_DELIVERY",
      velachery.name,
      43,
      hubUser.id,
      "Released to last-mile courier",
    ],
    [
      "DELIVERED",
      "Customer doorstep, Chennai",
      40,
      raviUser.id,
      "Delivered, OTP verified",
    ],
  ];
  for (const [type, loc, h, by, remarks] of scans) {
    await prisma.scanEvent.create({
      data: {
        shipmentId: shipment.id,
        type: type as never,
        locationLabel: loc,
        createdAt: hoursAgo(h),
        scannedById: by,
        qrVerified: true,
        remarks,
      },
    });
  }
  await prisma.deliveryAttempt.create({
    data: {
      shipmentId: shipment.id,
      courierId: ravi.id,
      attemptNumber: 1,
      status: "DELIVERED",
      qrVerified: true,
      podType: "OTP",
      podValue: "OTP verified",
      attemptedAt: hoursAgo(40),
    },
  });

  // Verified reviews from other customers (ratings stay as seeded; these are the written ones)
  const arun = await prisma.user.create({
    data: {
      passwordHash: pw,
      fullName: "Arun Kumar",
      email: "arun@subsel.demo",
      role: "CUSTOMER",
    },
  });
  const divya = await prisma.user.create({
    data: {
      passwordHash: pw,
      fullName: "Divya Srinivasan",
      email: "divya@subsel.demo",
      role: "CUSTOMER",
    },
  });
  const productIds = Object.fromEntries(
    (await prisma.product.findMany({ select: { id: true, slug: true } })).map(
      (p) => [p.slug, p.id],
    ),
  );
  const reviews: [string, string, number, string, number][] = [
    [
      arun.id,
      "nike-pegasus-run",
      5,
      "Very comfortable on long runs. True to size and the grip is good on wet roads too.",
      96,
    ],
    [
      divya.id,
      "nike-pegasus-run",
      4,
      "Light and cushioned. Took a week to break in but now it is my daily pair.",
      170,
    ],
    [
      divya.id,
      "relaxed-knit-sweater",
      5,
      "Soft, not itchy at all, and the colour is exactly as shown. Delivered in two days.",
      60,
    ],
    [
      arun.id,
      "anc-headphones",
      5,
      "Noise cancelling is excellent on the bus. Battery easily lasts the week.",
      210,
    ],
    [
      divya.id,
      "adidas-essential-tee",
      4,
      "Thick cotton and holds its shape after washing. Slightly long on me.",
      130,
    ],
  ];
  for (const [userId, slug, rating, comment, h] of reviews) {
    await prisma.review.create({
      data: {
        userId,
        productId: productIds[slug],
        rating,
        comment,
        createdAt: hoursAgo(h),
      },
    });
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
  console.log(
    "  Seller    lotus@subsel.demo      → /vendor/login (application pending, approve it in Admin → Sellers)",
  );
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
