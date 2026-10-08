import { prisma } from "../prisma";

export async function getAdminSalesAnalytics() {
  const [products, items] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        sellingPrice: true,
        vendor: { select: { businessName: true } },
        variants: {
          select: {
            inventory: {
              select: {
                available: true,
                warehouse: { select: { isActive: true } },
              },
            },
          },
        },
      },
    }),
    prisma.orderItem.findMany({
      where: { order: { status: { not: "CANCELLED" } } },
      select: {
        quantity: true,
        lineTotal: true,
        variant: { select: { productId: true } },
        order: { select: { id: true, placedAt: true } },
      },
      orderBy: { order: { placedAt: "asc" } },
    }),
  ]);

  const productSales = new Map<
    string,
    { unitsSold: number; revenue: number; orders: Set<string> }
  >();
  const orderGroups = new Map<string, { orders: Set<string>; unitsSold: number; revenue: number }>();
  const totalOrders = new Set<string>();
  let unitsSold = 0;
  let revenue = 0;
  const weekKey = (date: Date) => {
    const start = new Date(date);
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    start.setUTCHours(0, 0, 0, 0);
    return start.toISOString().slice(0, 10);
  };

  const addToPeriod = (key: string, orderId: string, quantity: number, lineTotal: number) => {
    const bucket = orderGroups.get(key) ?? { orders: new Set<string>(), unitsSold: 0, revenue: 0 };
    bucket.orders.add(orderId);
    bucket.unitsSold += quantity;
    bucket.revenue += lineTotal;
    orderGroups.set(key, bucket);
  };

  for (const item of items) {
    const product = productSales.get(item.variant.productId) ?? {
      unitsSold: 0,
      revenue: 0,
      orders: new Set<string>(),
    };
    product.unitsSold += item.quantity;
    product.revenue += item.lineTotal;
    product.orders.add(item.order.id);
    productSales.set(item.variant.productId, product);
    totalOrders.add(item.order.id);
    unitsSold += item.quantity;
    revenue += item.lineTotal;

    const date = item.order.placedAt;
    addToPeriod(`year:${date.getUTCFullYear()}`, item.order.id, item.quantity, item.lineTotal);
    addToPeriod(`month:${date.toISOString().slice(0, 7)}`, item.order.id, item.quantity, item.lineTotal);
    addToPeriod(`day:${date.toISOString().slice(0, 10)}`, item.order.id, item.quantity, item.lineTotal);
    addToPeriod(`week:${weekKey(date)}`, item.order.id, item.quantity, item.lineTotal);
  }

  const today = new Date();
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const currentWeek = new Date(utcToday);
  currentWeek.setUTCDate(currentWeek.getUTCDate() - ((currentWeek.getUTCDay() + 6) % 7));
  const periodKeys = {
    daily: Array.from({ length: 14 }, (_, index) =>
      new Date(utcToday - (13 - index) * 86_400_000).toISOString().slice(0, 10),
    ),
    weekly: Array.from({ length: 12 }, (_, index) => {
      const start = new Date(currentWeek);
      start.setUTCDate(start.getUTCDate() - (11 - index) * 7);
      return start.toISOString().slice(0, 10);
    }),
    monthly: Array.from({ length: 12 }, (_, index) =>
      new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (11 - index), 1))
        .toISOString()
        .slice(0, 7),
    ),
  };
  const labelDate = (key: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-IN", { ...options, timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
  const trends = {
    daily: periodKeys.daily.map((key) => ({
      label: labelDate(key, { month: "short", day: "numeric" }),
      unitsSold: orderGroups.get(`day:${key}`)?.unitsSold ?? 0,
      revenue: orderGroups.get(`day:${key}`)?.revenue ?? 0,
    })),
    weekly: periodKeys.weekly.map((key) => ({
      label: labelDate(key, { month: "short", day: "numeric" }),
      unitsSold: orderGroups.get(`week:${key}`)?.unitsSold ?? 0,
      revenue: orderGroups.get(`week:${key}`)?.revenue ?? 0,
    })),
    monthly: periodKeys.monthly.map((key) => ({
      label: labelDate(`${key}-01`, { month: "short", year: "2-digit" }),
      unitsSold: orderGroups.get(`month:${key}`)?.unitsSold ?? 0,
      revenue: orderGroups.get(`month:${key}`)?.revenue ?? 0,
    })),
  };
  const performance = products.map((product) => {
    const sales = productSales.get(product.id);
    const stock = product.variants.reduce(
      (sum, variant) =>
        sum +
        variant.inventory.reduce(
          (variantSum, inventory) =>
            variantSum + (inventory.warehouse.isActive ? inventory.available : 0),
          0,
        ),
      0,
    );
    return {
      id: product.id,
      name: product.name,
      status: product.status,
      seller: product.vendor.businessName,
      sellingPrice: product.sellingPrice,
      stock,
      unitsSold: sales?.unitsSold ?? 0,
      revenue: sales?.revenue ?? 0,
      orders: sales?.orders.size ?? 0,
    };
  }).sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold || a.name.localeCompare(b.name));

  return {
    stats: {
      products: products.length,
      activeProducts: products.filter((product) => product.status === "ACTIVE").length,
      unitsSold,
      orders: totalOrders.size,
      revenue,
      stock: performance.reduce((sum, product) => sum + product.stock, 0),
    },
    years: [...new Set(items.map((item) => item.order.placedAt.getUTCFullYear()))]
      .sort((a, b) => b - a),
    trends,
    products: performance,
  };
}

export async function getAdminSalesReport(
  period: "day" | "month" | "year",
  year?: number,
) {
  const [products, items] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        vendor: { select: { businessName: true } },
        variants: {
          select: {
            sku: true,
            inventory: {
              select: {
                available: true,
                warehouse: { select: { isActive: true } },
              },
            },
          },
        },
      },
    }),
    prisma.orderItem.findMany({
      where: { order: { status: { not: "CANCELLED" } } },
      select: {
        quantity: true,
        lineTotal: true,
        variant: {
          select: {
            sku: true,
            product: {
              select: {
                id: true,
                name: true,
                status: true,
                vendor: { select: { businessName: true } },
              },
            },
          },
        },
        order: { select: { id: true, placedAt: true } },
      },
      orderBy: { order: { placedAt: "asc" } },
    }),
  ]);
  const groups = new Map<string, { orders: Set<string>; units: number; revenue: number }>();
  const productGroups = new Map<
    string,
    {
      name: string;
      seller: string;
      sku: string;
      status: string;
      stock: number;
      orders: Set<string>;
      units: number;
      revenue: number;
    }
  >();

  for (const product of products) {
    for (const variant of product.variants) {
      const stock = variant.inventory.reduce(
        (sum, inventory) =>
          sum + (inventory.warehouse.isActive ? inventory.available : 0),
        0,
      );
      productGroups.set(`${product.id}:${variant.sku}`, {
        name: product.name,
        seller: product.vendor.businessName,
        sku: variant.sku,
        status: product.status,
        stock,
        orders: new Set<string>(),
        units: 0,
        revenue: 0,
      });
    }
  }

  for (const item of items) {
    const date = item.order.placedAt;
    if (year !== undefined && period !== "year" && date.getUTCFullYear() !== year) continue;
    const key = period === "year"
      ? String(date.getUTCFullYear())
      : period === "month"
        ? date.toISOString().slice(0, 7)
        : date.toISOString().slice(0, 10);
    const group = groups.get(key) ?? { orders: new Set<string>(), units: 0, revenue: 0 };
    group.orders.add(item.order.id);
    group.units += item.quantity;
    group.revenue += item.lineTotal;
    groups.set(key, group);

    const productKey = `${item.variant.product.id}:${item.variant.sku}`;
    const product = productGroups.get(productKey) ?? {
      name: item.variant.product.name,
      seller: item.variant.product.vendor.businessName,
      sku: item.variant.sku,
      status: item.variant.product.status,
      stock: 0,
      orders: new Set<string>(),
      units: 0,
      revenue: 0,
    };
    product.orders.add(item.order.id);
    product.units += item.quantity;
    product.revenue += item.lineTotal;
    productGroups.set(productKey, product);
  }

  let periods: Array<{ period: string; orders: number; unitsSold: number; revenue: number }>;
  if (period === "year") {
    periods = [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, group]) => ({
        period: label,
        orders: group.orders.size,
        unitsSold: group.units,
        revenue: group.revenue,
      }));
  } else {
    const now = new Date();
    const selectedYear = year ?? now.getUTCFullYear();
    const bucketCount = period === "month"
      ? selectedYear === now.getUTCFullYear() ? now.getUTCMonth() + 1 : 12
      : (selectedYear === now.getUTCFullYear()
          ? Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(selectedYear, 0, 1)) / 86_400_000) + 1
          : (Date.UTC(selectedYear + 1, 0, 1) - Date.UTC(selectedYear, 0, 1)) / 86_400_000);

    periods = Array.from({ length: bucketCount }, (_, index) => {
      const date = period === "month"
        ? new Date(Date.UTC(selectedYear, index, 1))
        : new Date(Date.UTC(selectedYear, 0, index + 1));
      const key = period === "month"
        ? `${selectedYear}-${String(index + 1).padStart(2, "0")}`
        : date.toISOString().slice(0, 10);
      const group = groups.get(key);
      return {
        period: key,
        orders: group?.orders.size ?? 0,
        unitsSold: group?.units ?? 0,
        revenue: group?.revenue ?? 0,
      };
    });
  }

  return {
    periods,
    products: [...productGroups.values()]
      .sort((a, b) => b.revenue - a.revenue || b.units - a.units)
      .map((product) => ({
        name: product.name,
        seller: product.seller,
        sku: product.sku,
        status: product.status,
        stock: product.stock,
        orders: product.orders.size,
        unitsSold: product.units,
        revenue: product.revenue,
      })),
  };
}

export async function getAdminDashboard() {
  const [paid, openOrders, awaitingConfirmation, awaitingAllocation, shipmentsTotal, returnsTotal, refundsTotal, orders, returns, refunds, inventory, movements, shipments] =
    await Promise.all([
      prisma.order.aggregate({
        where: { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.order.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
      prisma.order.count({ where: { status: "PLACED" } }),
      prisma.order.count({ where: { status: "CONFIRMED" } }),
      prisma.shipment.count(),
      prisma.return.count(),
      prisma.refund.count(),
      prisma.order.findMany({
        where: { status: { in: ["PLACED", "CONFIRMED"] } },
        orderBy: { placedAt: "asc" },
        take: 30,
        include: {
          user: { select: { fullName: true } },
          items: { select: { quantity: true } },
          shipments: { select: { shipmentNumber: true, status: true } },
        },
      }),
      prisma.return.findMany({
        where: { status: "REQUESTED" },
        orderBy: { createdAt: "asc" },
        take: 30,
        include: {
          user: { select: { fullName: true } },
          orderItem: { select: { productName: true, variantLabel: true, order: { select: { orderNumber: true } } } },
        },
      }),
      prisma.refund.findMany({
        where: { status: { in: ["INITIATED", "PROCESSING"] } },
        orderBy: { createdAt: "asc" },
        take: 30,
        include: { order: { select: { orderNumber: true, user: { select: { fullName: true } } } } },
      }),
      prisma.inventory.findMany({
        orderBy: [{ warehouse: { name: "asc" } }, { variant: { sku: "asc" } }],
        include: { variant: { select: { sku: true, label: true, product: { select: { name: true } } } }, warehouse: { select: { name: true, isActive: true } } },
      }),
      prisma.stockMovement.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { variant: { select: { sku: true } }, warehouse: { select: { name: true } } },
      }),
      prisma.shipment.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          warehouse: { select: { name: true } },
          legs: { orderBy: { sequence: "asc" }, include: { hub: { select: { name: true } } } },
        },
      }),
    ]);

  const lowStock = inventory.filter(
    (i) => i.warehouse.isActive && i.available <= i.lowStockThreshold,
  );
  const [sellerApplications, listingsToReview, pendingReturns, pendingRefunds] = await Promise.all([
    prisma.vendor.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.return.count({ where: { status: "REQUESTED" } }),
    prisma.refund.count({ where: { status: { in: ["INITIATED", "PROCESSING"] } } }),
  ]);

  return {
    stats: {
      revenue: paid._sum.grandTotal ?? 0,
      paidOrders: paid._count,
      openOrders,
      shipments: shipmentsTotal,
      returns: returnsTotal,
      refunds: refundsTotal,
    },
    queue: {
      awaitingConfirmation,
      awaitingAllocation,
      lowStock: lowStock.length,
      sellerApplications,
      listingsToReview,
      pendingReturns,
      pendingRefunds,
    },
    orders,
    returns,
    refunds,
    inventory,
    movements,
    shipments,
  };
}
