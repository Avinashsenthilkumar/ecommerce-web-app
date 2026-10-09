import { prisma, type Tx } from "../prisma";
import { ApiError } from "../api";
import {
  deliveryOtp,
  qrToken,
  refundNumber,
  shipmentNumber,
  trackingNumber,
} from "../codes";
import { moveStock } from "./inventory";
import { recomputeOrderStatus } from "./orders";
import type { CurrentUser } from "../auth";

const TX = { timeout: 20000 };

// ─────────────── Admin: order lifecycle ───────────────

export async function confirmOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new ApiError(404, "Order not found.");
    if (order.status !== "PLACED")
      throw new ApiError(
        409,
        `Order is already ${order.status.toLowerCase()}.`,
      );
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "PLACED" },
      data: { status: "CONFIRMED" },
    });
    if (updated.count === 0)
      throw new ApiError(409, "Order status changed. Refresh and try again.");
    return tx.order.findUniqueOrThrow({ where: { id: orderId } });
  }, TX);
}

export async function cancelOrder(orderId: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { payments: true, items: true },
    });
    if (!order) throw new ApiError(404, "Order not found.");
    if (!["PLACED", "CONFIRMED"].includes(order.status)) {
      throw new ApiError(
        409,
        "Only orders that are not yet allocated can be cancelled.",
      );
    }
    const cancelled = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: "CANCELLED" },
    });
    if (cancelled.count === 0)
      throw new ApiError(409, "Order status changed. Refresh and try again.");

    for (const item of order.items) {
      if (!item.allocatedWarehouseId) continue;
      await moveStock(tx, {
        variantId: item.variantId,
        warehouseId: item.allocatedWarehouseId,
        from: "reserved",
        to: "available",
        qty: item.quantity,
        reason: "RELEASE",
        referenceType: "ORDER",
        referenceId: order.orderNumber,
        actorId: actor.id,
        note: "Reservation released after cancellation",
      });
    }

    const paid = order.payments.find((p) => p.status === "SUCCESS");
    if (paid) {
      await tx.refund.create({
        data: {
          refundNumber: await refundNumber(tx),
          orderId,
          paymentId: paid.id,
          amount: order.grandTotal,
          method: "ORIGINAL_SOURCE",
          reason: "Order cancelled",
          processedById: actor.id,
        },
      });
    }
    return { cancelled: true };
  }, TX);
}

/** Follows warehouse.firstHub → hub.nextHub … until a DELIVERY hub. */
async function buildRoute(tx: Tx, warehouseId: string) {
  const wh = await tx.warehouse.findUnique({ where: { id: warehouseId } });
  const route: { id: string; type: string; name: string }[] = [];
  let hubId = wh?.firstHubId ?? null;
  const seen = new Set<string>();
  while (hubId && !seen.has(hubId) && route.length < 10) {
    seen.add(hubId);
    const hub = await tx.hub.findUnique({ where: { id: hubId } });
    if (!hub) break;
    route.push(hub);
    if (hub.type === "DELIVERY") break;
    hubId = hub.nextHubId;
  }
  if (route.length === 0 || route[route.length - 1].type !== "DELIVERY") {
    throw new ApiError(
      409,
      `No delivery route is configured from ${wh?.name ?? "this warehouse"}.`,
    );
  }
  return route;
}

/**
 * Allocates stock for a confirmed order.
 * Each item goes to a warehouse that can cover its full quantity, preferring warehouses already
 * used by the order so the parcel count stays low. One shipment is created per warehouse (split).
 */
export async function allocateOrder(orderId: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: { inventory: { include: { warehouse: true } } },
            },
          },
        },
      },
    });
    if (!order) throw new ApiError(404, "Order not found.");
    if (order.status !== "CONFIRMED")
      throw new ApiError(409, "Confirm the order before allocating stock.");

    const allocated = await tx.order.updateMany({
      where: { id: orderId, status: "CONFIRMED" },
      data: { status: "ALLOCATED" },
    });
    if (allocated.count === 0)
      throw new ApiError(409, "Order status changed. Refresh and try again.");

    const plan = new Map<string, typeof order.items>();
    const reserveAtAllocation = new Set<string>();
    for (const item of order.items) {
      let warehouseId = item.allocatedWarehouseId;
      if (warehouseId) {
        const reservation = item.variant.inventory.find(
          (inv) => inv.warehouseId === warehouseId,
        );
        if (!reservation || reservation.reserved < item.quantity) {
          throw new ApiError(
            409,
            `The stock reservation for ${item.sku} is missing.`,
          );
        }
      } else {
        const candidates = item.variant.inventory.filter(
          (inv) => inv.warehouse.isActive && inv.available >= item.quantity,
        );
        candidates.sort(
          (a, b) =>
            Number(plan.has(b.warehouseId)) - Number(plan.has(a.warehouseId)) ||
            b.available - a.available,
        );
        if (candidates.length === 0) {
          throw new ApiError(
            409,
            `Not enough stock for ${item.sku} in any single warehouse.`,
          );
        }
        warehouseId = candidates[0].warehouseId;
        reserveAtAllocation.add(item.id);
      }
      plan.set(warehouseId, [...(plan.get(warehouseId) ?? []), item]);
    }

    // COD cash per parcel: each parcel's share of (grand total − shipping), shipping on the first,
    // rounding remainder on the last, so all parcels add up to exactly the order total.
    const isCod = order.paymentMethod === "COD";
    const groups = [...plan.entries()];
    const ratio =
      order.subtotal > 0
        ? (order.grandTotal - order.shippingFee) / order.subtotal
        : 1;
    const codShares = groups.map(
      ([, items], i) =>
        Math.round(items.reduce((s, it) => s + it.lineTotal, 0) * ratio) +
        (i === 0 ? order.shippingFee : 0),
    );
    codShares[codShares.length - 1] +=
      order.grandTotal - codShares.reduce((a, b) => a + b, 0);

    for (const [index, [warehouseId, items]] of groups.entries()) {
      const route = await buildRoute(tx, warehouseId);

      const shipment = await tx.shipment.create({
        data: {
          shipmentNumber: await shipmentNumber(tx),
          trackingNumber: trackingNumber(),
          deliveryOtp: deliveryOtp(),
          orderId,
          warehouseId,
          deliveryHubId: route[route.length - 1].id,
          paymentType: isCod ? "COD" : "PREPAID",
          codAmount: isCod ? codShares[index] : 0,
          legs: {
            create: route.map((h, i) => ({ sequence: i + 1, hubId: h.id })),
          },
        },
      });

      for (const item of items) {
        if (reserveAtAllocation.has(item.id)) {
          await moveStock(tx, {
            variantId: item.variantId,
            warehouseId,
            from: "available",
            to: "reserved",
            qty: item.quantity,
            reason: "ALLOCATION",
            referenceType: "SHIPMENT",
            referenceId: shipment.shipmentNumber,
            actorId: actor.id,
          });
        }
        await tx.orderItem.update({
          where: { id: item.id },
          data: { allocatedWarehouseId: warehouseId, shipmentId: shipment.id },
        });
      }
    }

    return { shipments: plan.size };
  }, TX);
}

// ─────────────── Warehouse floor ───────────────

export type QueuePriority = "HIGH" | "MEDIUM" | "NORMAL";

/** Hours a parcel may sit on the floor before it is late. */
export const PICK_SLA_HOURS = 24;
const DUE_SOON_HOURS = 8;

/**
 * Priority is derived from how long the order has been waiting, so it needs no
 * extra column and can never disagree with the data. Prepaid parcels break ties
 * ahead of COD because the money is already collected.
 */
export function queuePriority(placedAt: Date, now: Date = new Date()) {
  const ageHours = Math.max(0, (now.getTime() - placedAt.getTime()) / 3_600_000);
  const whole = Math.floor(ageHours);
  if (ageHours >= PICK_SLA_HOURS)
    return {
      level: "HIGH" as QueuePriority,
      ageHours,
      reason: `Waiting ${whole}h, past the ${PICK_SLA_HOURS}h pick SLA`,
    };
  if (ageHours >= DUE_SOON_HOURS)
    return {
      level: "MEDIUM" as QueuePriority,
      ageHours,
      reason: `Waiting ${whole}h, due within ${PICK_SLA_HOURS - whole}h`,
    };
  return { level: "NORMAL" as QueuePriority, ageHours, reason: "Within SLA" };
}

const PRIORITY_RANK: Record<QueuePriority, number> = { HIGH: 0, MEDIUM: 1, NORMAL: 2 };

type StockRow = {
  variantId: string;
  warehouseId: string;
  available: number;
  reserved: number;
  picked: number;
};

/**
 * Checks the shipment against the buckets it is about to draw from: a pick
 * needs reserved units, a pack needs picked units. Anything short is reported
 * instead of being discovered half-way through a bulk run.
 */
function stockIssues(
  s: {
    status: string;
    warehouseId: string;
    warehouse: { name: string };
    items: { sku: string; variantId: string; quantity: number; pickedQty: number }[];
  },
  stock: Map<string, StockRow>,
) {
  const issues: string[] = [];
  for (const item of s.items) {
    const row = stock.get(`${item.variantId}:${s.warehouseId}`);
    if (!row) {
      issues.push(`${item.sku}: no stock record at ${s.warehouse.name}`);
      continue;
    }
    if (s.status === "ALLOCATED") {
      const need = item.quantity - item.pickedQty;
      if (need > 0 && row.reserved < need)
        issues.push(`${item.sku}: needs ${need} reserved, ${row.reserved} on hand`);
    } else if (s.status === "PICKED" && row.picked < item.quantity) {
      issues.push(`${item.sku}: needs ${item.quantity} picked, ${row.picked} on hand`);
    }
  }
  return issues;
}

export async function getWarehouseFloor() {
  const [shipments, inv] = await Promise.all([
    prisma.shipment.findMany({
      where: { status: { in: ["ALLOCATED", "PICKED", "PACKED", "LABELLED"] } },
      orderBy: { createdAt: "asc" },
      include: {
        items: { orderBy: { sku: "asc" } },
        warehouse: { select: { name: true } },
        order: {
          select: {
            orderNumber: true,
            shippingAddress: true,
            status: true,
            placedAt: true,
            paymentMethod: true,
            shipments: { select: { id: true, status: true } },
          },
        },
        legs: {
          orderBy: { sequence: "asc" },
          include: { hub: { select: { name: true } } },
        },
      },
    }),
    prisma.inventory.aggregate({ _sum: { reserved: true, packed: true } }),
  ]);

  // One lookup for every variant/warehouse pair on the floor, so validating the
  // whole queue costs a single query rather than one per shipment.
  const pairs = [
    ...new Map(
      shipments.flatMap((s) =>
        s.items.map((i) => [
          `${i.variantId}:${s.warehouseId}`,
          { variantId: i.variantId, warehouseId: s.warehouseId },
        ]),
      ),
    ).values(),
  ];
  const stockRows = pairs.length
    ? await prisma.inventory.findMany({
        where: { OR: pairs },
        select: {
          variantId: true,
          warehouseId: true,
          available: true,
          reserved: true,
          picked: true,
        },
      })
    : [];
  const stock = new Map(stockRows.map((r) => [`${r.variantId}:${r.warehouseId}`, r]));

  const now = new Date();
  const enriched = shipments.map((s) => {
    const parcels = s.order.shipments;
    return {
      ...s,
      priority: queuePriority(s.order.placedAt, now),
      issues: stockIssues(s, stock),
      /** Where this parcel sits among the order's parcels. */
      orderProgress: {
        status: s.order.status,
        parcels: parcels.length,
        ready: parcels.filter((p) => !["ALLOCATED", "PICKED"].includes(p.status)).length,
      },
    };
  });

  const pickPack = enriched
    .filter((s) => s.status === "ALLOCATED" || s.status === "PICKED")
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority.level] - PRIORITY_RANK[b.priority.level] ||
        a.order.placedAt.getTime() - b.order.placedAt.getTime() ||
        Number(a.paymentType === "COD") - Number(b.paymentType === "COD"),
    );
  const dispatch = enriched.filter(
    (s) => s.status === "PACKED" || s.status === "LABELLED",
  );

  return {
    pickPack,
    dispatch,
    stats: {
      ordersOnFloor: new Set(pickPack.map((s) => s.orderId)).size,
      reservedUnits: inv._sum.reserved ?? 0,
      packedUnits: inv._sum.packed ?? 0,
      labelsPending: shipments.filter((s) => s.status === "PACKED").length,
      highPriority: pickPack.filter((s) => s.priority.level === "HIGH").length,
      blocked: pickPack.filter((s) => s.issues.length > 0).length,
    },
  };
}

/** Product SKUs with stock at the signed-in warehouse, ready for barcode printing. */
export async function getWarehouseProductLabels(warehouseId?: string | null) {
  if (warehouseId === null) return [];

  const inventory = await prisma.inventory.findMany({
    where: {
      ...(warehouseId ? { warehouseId } : {}),
      OR: [
        { available: { gt: 0 } },
        { reserved: { gt: 0 } },
        { picked: { gt: 0 } },
        { packed: { gt: 0 } },
        { shipped: { gt: 0 } },
      ],
      variant: { product: { status: "ACTIVE" } },
    },
    include: {
      warehouse: { select: { name: true } },
      variant: {
        select: {
          id: true,
          sku: true,
          label: true,
          product: {
            select: {
              name: true,
              brand: { select: { name: true } },
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return inventory
    .map((stock) => ({
      id: stock.variant.id,
      sku: stock.variant.sku,
      variantLabel: stock.variant.label,
      productName: stock.variant.product.name,
      brandName: stock.variant.product.brand.name,
      categoryName: stock.variant.product.category.name,
      warehouseName: stock.warehouse.name,
      quantity:
        stock.available +
        stock.reserved +
        stock.picked +
        stock.packed +
        stock.shipped,
    }))
    .sort((a, b) =>
      a.productName.localeCompare(b.productName) || a.sku.localeCompare(b.sku),
    );
}

export type FloorShipment = Awaited<
  ReturnType<typeof getWarehouseFloor>
>["pickPack"][number];

async function loadShipment(tx: Tx, id: string) {
  const s = await tx.shipment.findUnique({
    where: { id },
    include: {
      items: true,
      warehouse: true,
      legs: { orderBy: { sequence: "asc" } },
    },
  });
  if (!s) throw new ApiError(404, "Shipment not found.");
  return s;
}

export function matchesCode(
  s: { qrCode: string | null; trackingNumber: string; shipmentNumber: string },
  code: string,
) {
  const c = code.trim().toUpperCase();
  return [s.qrCode, s.trackingNumber, s.shipmentNumber].some(
    (v) => v && v.toUpperCase() === c,
  );
}

/** One scan = one unit picked. Moves 1 unit reserved → picked. */
export async function scanPick(
  shipmentId: string,
  skuInput: string,
  actor: CurrentUser,
) {
  return prisma.$transaction(async (tx) => {
    const s = await loadShipment(tx, shipmentId);
    if (s.status !== "ALLOCATED")
      throw new ApiError(409, "This shipment is already picked.");
    const sku = skuInput.trim().toUpperCase();
    const item = s.items.find(
      (i) => i.sku.toUpperCase() === sku && i.pickedQty < i.quantity,
    );
    if (!item) {
      const known = s.items.some((i) => i.sku.toUpperCase() === sku);
      throw new ApiError(
        422,
        known
          ? `${sku} is already fully picked.`
          : `${sku} is not part of this shipment.`,
      );
    }

    await tx.orderItem.update({
      where: { id: item.id },
      data: { pickedQty: { increment: 1 } },
    });
    await moveStock(tx, {
      variantId: item.variantId,
      warehouseId: s.warehouseId,
      from: "reserved",
      to: "picked",
      qty: 1,
      reason: "PICK",
      referenceType: "SHIPMENT",
      referenceId: s.shipmentNumber,
      actorId: actor.id,
    });
    await tx.scanEvent.create({
      data: {
        shipmentId: s.id,
        type: "PICK",
        locationLabel: s.warehouse.name,
        scannedById: actor.id,
        qrVerified: true,
        remarks: `Picked 1 × ${item.sku}`,
      },
    });

    const refreshed = await tx.orderItem.findMany({
      where: { shipmentId: s.id },
    });
    const done = refreshed.every((i) => i.pickedQty >= i.quantity);
    if (done)
      await tx.shipment.update({
        where: { id: s.id },
        data: { status: "PICKED" },
      });
    await recomputeOrderStatus(tx, s.orderId);
    return {
      picked: item.pickedQty + 1,
      of: item.quantity,
      shipmentPicked: done,
    };
  }, TX);
}

export async function confirmPack(shipmentId: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const s = await loadShipment(tx, shipmentId);
    if (s.status !== "PICKED")
      throw new ApiError(409, "Scan every item before packing.");
    for (const i of s.items) {
      await moveStock(tx, {
        variantId: i.variantId,
        warehouseId: s.warehouseId,
        from: "picked",
        to: "packed",
        qty: i.quantity,
        reason: "PACK",
        referenceType: "SHIPMENT",
        referenceId: s.shipmentNumber,
        actorId: actor.id,
      });
    }
    await tx.shipment.update({
      where: { id: s.id },
      data: { status: "PACKED" },
    });
    await tx.scanEvent.create({
      data: {
        shipmentId: s.id,
        type: "PACK",
        locationLabel: s.warehouse.name,
        scannedById: actor.id,
        qrVerified: true,
        remarks: "Packing confirmed",
      },
    });
    await recomputeOrderStatus(tx, s.orderId);
    return { status: "PACKED" };
  }, TX);
}

export async function generateLabel(shipmentId: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const s = await loadShipment(tx, shipmentId);
    if (s.status !== "PACKED")
      throw new ApiError(409, "Pack the shipment before generating its label.");
    const updated = await tx.shipment.update({
      where: { id: s.id },
      data: {
        status: "LABELLED",
        qrCode: qrToken(s.shipmentNumber),
        labelGeneratedAt: new Date(),
      },
    });
    await tx.scanEvent.create({
      data: {
        shipmentId: s.id,
        type: "LABEL",
        locationLabel: s.warehouse.name,
        scannedById: actor.id,
        remarks: "QR shipping label generated",
      },
    });
    return { qrCode: updated.qrCode };
  }, TX);
}

/** Courier handover: QR must be scanned. Moves packed → shipped and opens the first hub leg. */
export async function handoverShipment(
  shipmentId: string,
  code: string,
  actor: CurrentUser,
) {
  return prisma.$transaction(async (tx) => {
    const s = await loadShipment(tx, shipmentId);
    if (s.status !== "LABELLED")
      throw new ApiError(409, "Generate the QR label before handover.");
    if (!matchesCode(s, code))
      throw new ApiError(
        422,
        "Scanned code does not match this parcel's label.",
      );

    for (const i of s.items) {
      await moveStock(tx, {
        variantId: i.variantId,
        warehouseId: s.warehouseId,
        from: "packed",
        to: "shipped",
        qty: i.quantity,
        reason: "DISPATCH",
        referenceType: "SHIPMENT",
        referenceId: s.shipmentNumber,
        actorId: actor.id,
      });
    }
    const firstLeg = s.legs[0];
    if (firstLeg)
      await tx.shipmentLeg.update({
        where: { id: firstLeg.id },
        data: { status: "INBOUND" },
      });
    await tx.shipment.update({
      where: { id: s.id },
      data: { status: "IN_TRANSIT", dispatchedAt: new Date() },
    });
    await tx.scanEvent.create({
      data: {
        shipmentId: s.id,
        type: "HANDOVER",
        locationLabel: s.warehouse.name,
        scannedById: actor.id,
        qrVerified: true,
        remarks: "Handed to line-haul courier",
      },
    });
    await recomputeOrderStatus(tx, s.orderId);
    return { status: "IN_TRANSIT" };
  }, TX);
}

// ─────────────── Bulk floor operations ───────────────

/** Most shipments one bulk request may touch, so a slip cannot run away. */
export const BULK_LIMIT = 50;

/**
 * Picks every outstanding unit on a shipment at once.
 *
 * Scanning unit by unit is right at a packing bench with a hardware scanner;
 * for a bulk order of twenty of the same SKU it is twenty scans of the same
 * barcode. This does the same bucket moves and writes one scan event recording
 * that it was a bulk pick, so the audit trail still says what happened.
 */
export async function pickAllItems(shipmentId: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const s = await loadShipment(tx, shipmentId);
    if (s.status !== "ALLOCATED")
      throw new ApiError(409, "This shipment is already picked.");

    const outstanding = s.items.filter((i) => i.pickedQty < i.quantity);
    if (outstanding.length === 0)
      throw new ApiError(409, "Nothing left to pick on this shipment.");

    let units = 0;
    for (const item of outstanding) {
      const qty = item.quantity - item.pickedQty;
      await moveStock(tx, {
        variantId: item.variantId,
        warehouseId: s.warehouseId,
        from: "reserved",
        to: "picked",
        qty,
        reason: "PICK",
        referenceType: "SHIPMENT",
        referenceId: s.shipmentNumber,
        actorId: actor.id,
        note: "Bulk pick",
      });
      await tx.orderItem.update({
        where: { id: item.id },
        data: { pickedQty: item.quantity },
      });
      units += qty;
    }

    await tx.shipment.update({ where: { id: s.id }, data: { status: "PICKED" } });
    await tx.scanEvent.create({
      data: {
        shipmentId: s.id,
        type: "PICK",
        locationLabel: s.warehouse.name,
        scannedById: actor.id,
        qrVerified: true,
        remarks: `Bulk picked ${units} unit(s) across ${outstanding.length} line(s)`,
      },
    });
    await recomputeOrderStatus(tx, s.orderId);
    return { units, message: `${s.shipmentNumber}: ${units} unit(s) picked.` };
  }, TX);
}

export type BulkAction = "pick" | "pack" | "label";
export type BulkResult = {
  id: string;
  shipmentNumber: string;
  ok: boolean;
  message: string;
};

/**
 * Runs one floor action over many shipments.
 *
 * Each shipment is its own transaction: a parcel that is short of stock fails
 * on its own and the rest of the batch still goes through, which is what a
 * floor supervisor wants. The caller gets a line per shipment either way.
 */
export async function runBulkFloorAction(
  action: BulkAction,
  shipmentIds: string[],
  actor: CurrentUser,
) {
  const ids = [...new Set(shipmentIds)].slice(0, BULK_LIMIT);
  if (ids.length === 0) throw new ApiError(400, "Select at least one shipment.");

  const known = await prisma.shipment.findMany({
    where: { id: { in: ids } },
    select: { id: true, shipmentNumber: true },
  });
  const numbers = new Map(known.map((s) => [s.id, s.shipmentNumber]));

  const results: BulkResult[] = [];
  for (const id of ids) {
    const shipmentNumber = numbers.get(id) ?? "Unknown shipment";
    try {
      if (!numbers.has(id)) throw new ApiError(404, "Shipment not found.");
      if (action === "pick") {
        const { units } = await pickAllItems(id, actor);
        results.push({ id, shipmentNumber, ok: true, message: `${units} unit(s) picked` });
      } else if (action === "pack") {
        await confirmPack(id, actor);
        results.push({ id, shipmentNumber, ok: true, message: "Packed" });
      } else {
        await generateLabel(id, actor);
        results.push({ id, shipmentNumber, ok: true, message: "Label generated" });
      }
    } catch (err) {
      results.push({
        id,
        shipmentNumber,
        ok: false,
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  }

  const done = results.filter((r) => r.ok).length;
  const failed = results.length - done;
  const verb = action === "pick" ? "picked" : action === "pack" ? "packed" : "labelled";
  return {
    results,
    done,
    failed,
    message: failed
      ? `${done} ${verb}, ${failed} need attention.`
      : `All ${done} shipment(s) ${verb}.`,
  };
}
