import { prisma, type Tx } from "../prisma";
import { ApiError } from "../api";
import { deliveryOtp, qrToken, refundNumber, shipmentNumber, trackingNumber } from "../codes";
import { moveStock } from "./inventory";
import { recomputeOrderStatus } from "./orders";
import type { CurrentUser } from "../auth";

const TX = { timeout: 20000 };

// ─────────────── Admin: order lifecycle ───────────────

export async function confirmOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Order not found.");
  if (order.status !== "PLACED") throw new ApiError(409, `Order is already ${order.status.toLowerCase()}.`);
  return prisma.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
}

export async function cancelOrder(orderId: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order) throw new ApiError(404, "Order not found.");
    if (!["PLACED", "CONFIRMED"].includes(order.status)) {
      throw new ApiError(409, "Only orders that are not yet allocated can be cancelled.");
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });

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
    throw new ApiError(409, `No delivery route is configured from ${wh?.name ?? "this warehouse"}.`);
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
        items: { include: { variant: { include: { inventory: { include: { warehouse: true } } } } } },
      },
    });
    if (!order) throw new ApiError(404, "Order not found.");
    if (order.status !== "CONFIRMED") throw new ApiError(409, "Confirm the order before allocating stock.");

    const plan = new Map<string, typeof order.items>();
    for (const item of order.items) {
      const candidates = item.variant.inventory.filter(
        (inv) => inv.warehouse.isActive && inv.available >= item.quantity,
      );
      if (candidates.length === 0) {
        throw new ApiError(409, `Not enough stock for ${item.sku} in any single warehouse.`);
      }
      candidates.sort(
        (a, b) =>
          Number(plan.has(b.warehouseId)) - Number(plan.has(a.warehouseId)) || b.available - a.available,
      );
      const wh = candidates[0].warehouseId;
      plan.set(wh, [...(plan.get(wh) ?? []), item]);
    }

    // COD cash per parcel: each parcel's share of (grand total − shipping), shipping on the first,
    // rounding remainder on the last, so all parcels add up to exactly the order total.
    const isCod = order.paymentMethod === "COD";
    const groups = [...plan.entries()];
    const ratio = order.subtotal > 0 ? (order.grandTotal - order.shippingFee) / order.subtotal : 1;
    const codShares = groups.map(([, items], i) => Math.round(items.reduce((s, it) => s + it.lineTotal, 0) * ratio) + (i === 0 ? order.shippingFee : 0));
    codShares[codShares.length - 1] += order.grandTotal - codShares.reduce((a, b) => a + b, 0);

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
          legs: { create: route.map((h, i) => ({ sequence: i + 1, hubId: h.id })) },
        },
      });

      for (const item of items) {
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
        await tx.orderItem.update({
          where: { id: item.id },
          data: { allocatedWarehouseId: warehouseId, shipmentId: shipment.id },
        });
      }
    }

    await tx.order.update({ where: { id: orderId }, data: { status: "ALLOCATED" } });
    return { shipments: plan.size };
  }, TX);
}

// ─────────────── Warehouse floor ───────────────

export async function getWarehouseFloor() {
  const [shipments, inv] = await Promise.all([
    prisma.shipment.findMany({
      where: { status: { in: ["ALLOCATED", "PICKED", "PACKED", "LABELLED"] } },
      orderBy: { createdAt: "asc" },
      include: {
        items: { orderBy: { sku: "asc" } },
        warehouse: { select: { name: true } },
        order: { select: { orderNumber: true, shippingAddress: true } },
        legs: { orderBy: { sequence: "asc" }, include: { hub: { select: { name: true } } } },
      },
    }),
    prisma.inventory.aggregate({ _sum: { reserved: true, packed: true } }),
  ]);

  const pickPack = shipments.filter((s) => s.status === "ALLOCATED" || s.status === "PICKED");
  const dispatch = shipments.filter((s) => s.status === "PACKED" || s.status === "LABELLED");
  return {
    pickPack,
    dispatch,
    stats: {
      ordersOnFloor: new Set(pickPack.map((s) => s.orderId)).size,
      reservedUnits: inv._sum.reserved ?? 0,
      packedUnits: inv._sum.packed ?? 0,
      labelsPending: shipments.filter((s) => s.status === "PACKED").length,
    },
  };
}

export type FloorShipment = Awaited<ReturnType<typeof getWarehouseFloor>>["pickPack"][number];

async function loadShipment(tx: Tx, id: string) {
  const s = await tx.shipment.findUnique({
    where: { id },
    include: { items: true, warehouse: true, legs: { orderBy: { sequence: "asc" } } },
  });
  if (!s) throw new ApiError(404, "Shipment not found.");
  return s;
}

export function matchesCode(s: { qrCode: string | null; trackingNumber: string; shipmentNumber: string }, code: string) {
  const c = code.trim().toUpperCase();
  return [s.qrCode, s.trackingNumber, s.shipmentNumber].some((v) => v && v.toUpperCase() === c);
}

/** One scan = one unit picked. Moves 1 unit reserved → picked. */
export async function scanPick(shipmentId: string, skuInput: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const s = await loadShipment(tx, shipmentId);
    if (s.status !== "ALLOCATED") throw new ApiError(409, "This shipment is already picked.");
    const sku = skuInput.trim().toUpperCase();
    const item = s.items.find((i) => i.sku.toUpperCase() === sku && i.pickedQty < i.quantity);
    if (!item) {
      const known = s.items.some((i) => i.sku.toUpperCase() === sku);
      throw new ApiError(422, known ? `${sku} is already fully picked.` : `${sku} is not part of this shipment.`);
    }

    await tx.orderItem.update({ where: { id: item.id }, data: { pickedQty: { increment: 1 } } });
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

    const refreshed = await tx.orderItem.findMany({ where: { shipmentId: s.id } });
    const done = refreshed.every((i) => i.pickedQty >= i.quantity);
    if (done) await tx.shipment.update({ where: { id: s.id }, data: { status: "PICKED" } });
    await recomputeOrderStatus(tx, s.orderId);
    return { picked: item.pickedQty + 1, of: item.quantity, shipmentPicked: done };
  }, TX);
}

export async function confirmPack(shipmentId: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const s = await loadShipment(tx, shipmentId);
    if (s.status !== "PICKED") throw new ApiError(409, "Scan every item before packing.");
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
    await tx.shipment.update({ where: { id: s.id }, data: { status: "PACKED" } });
    await tx.scanEvent.create({
      data: { shipmentId: s.id, type: "PACK", locationLabel: s.warehouse.name, scannedById: actor.id, qrVerified: true, remarks: "Packing confirmed" },
    });
    await recomputeOrderStatus(tx, s.orderId);
    return { status: "PACKED" };
  }, TX);
}

export async function generateLabel(shipmentId: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const s = await loadShipment(tx, shipmentId);
    if (s.status !== "PACKED") throw new ApiError(409, "Pack the shipment before generating its label.");
    const updated = await tx.shipment.update({
      where: { id: s.id },
      data: { status: "LABELLED", qrCode: qrToken(s.shipmentNumber), labelGeneratedAt: new Date() },
    });
    await tx.scanEvent.create({
      data: { shipmentId: s.id, type: "LABEL", locationLabel: s.warehouse.name, scannedById: actor.id, remarks: "QR shipping label generated" },
    });
    return { qrCode: updated.qrCode };
  }, TX);
}

/** Courier handover: QR must be scanned. Moves packed → shipped and opens the first hub leg. */
export async function handoverShipment(shipmentId: string, code: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const s = await loadShipment(tx, shipmentId);
    if (s.status !== "LABELLED") throw new ApiError(409, "Generate the QR label before handover.");
    if (!matchesCode(s, code)) throw new ApiError(422, "Scanned code does not match this parcel's label.");

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
    if (firstLeg) await tx.shipmentLeg.update({ where: { id: firstLeg.id }, data: { status: "INBOUND" } });
    await tx.shipment.update({ where: { id: s.id }, data: { status: "IN_TRANSIT", dispatchedAt: new Date() } });
    await tx.scanEvent.create({
      data: { shipmentId: s.id, type: "HANDOVER", locationLabel: s.warehouse.name, scannedById: actor.id, qrVerified: true, remarks: "Handed to line-haul courier" },
    });
    await recomputeOrderStatus(tx, s.orderId);
    return { status: "IN_TRANSIT" };
  }, TX);
}
