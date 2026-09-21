import { prisma } from "../prisma";

export async function getAdminDashboard() {
  const [paid, openOrders, shipmentsTotal, returnsTotal, refundsTotal, orders, returns, refunds, inventory, movements, shipments] =
    await Promise.all([
      prisma.order.aggregate({
        where: { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.order.count({ where: { status: { in: ["PLACED", "CONFIRMED"] } } }),
      prisma.shipment.count(),
      prisma.return.count(),
      prisma.refund.count(),
      prisma.order.findMany({
        orderBy: { placedAt: "desc" },
        take: 30,
        include: {
          user: { select: { fullName: true } },
          items: { select: { quantity: true } },
          shipments: { select: { shipmentNumber: true, status: true } },
        },
      }),
      prisma.return.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { fullName: true } },
          orderItem: { select: { productName: true, variantLabel: true, order: { select: { orderNumber: true } } } },
        },
      }),
      prisma.refund.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { order: { select: { orderNumber: true, user: { select: { fullName: true } } } } },
      }),
      prisma.inventory.findMany({
        orderBy: [{ warehouse: { name: "asc" } }, { variant: { sku: "asc" } }],
        include: { variant: { select: { sku: true, label: true, product: { select: { name: true } } } }, warehouse: { select: { name: true } } },
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

  const awaitingConfirmation = orders.filter((o) => o.status === "PLACED").length;
  const awaitingAllocation = await prisma.order.count({ where: { status: "CONFIRMED" } });
  const lowStock = inventory.filter((i) => i.available <= i.lowStockThreshold);

  return {
    stats: {
      revenue: paid._sum.grandTotal ?? 0,
      paidOrders: paid._count,
      openOrders,
      shipments: shipmentsTotal,
      returns: returnsTotal,
      refunds: refundsTotal,
    },
    queue: { awaitingConfirmation, awaitingAllocation, lowStock: lowStock.length },
    orders,
    returns,
    refunds,
    inventory,
    movements,
    shipments,
  };
}
