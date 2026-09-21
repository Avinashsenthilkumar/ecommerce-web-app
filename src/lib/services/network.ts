import { prisma, type Tx } from "../prisma";
import { ApiError } from "../api";
import { matchesCode } from "./fulfilment";
import { recomputeOrderStatus } from "./orders";
import type { CurrentUser } from "../auth";

const TX = { timeout: 20000 };

async function findByCode(tx: Tx, code: string) {
  const c = code.trim();
  return tx.shipment.findFirst({
    where: {
      OR: [
        { qrCode: { equals: c, mode: "insensitive" } },
        { trackingNumber: { equals: c, mode: "insensitive" } },
        { shipmentNumber: { equals: c, mode: "insensitive" } },
      ],
    },
    include: { legs: { orderBy: { sequence: "asc" }, include: { hub: true } } },
  });
}

// ─────────────── Hub network ───────────────

export async function getHubOverview() {
  const [hubs, network, outForDelivery, awaitingIntake] = await Promise.all([
    prisma.hub.findMany({
      orderBy: { type: "asc" },
      include: { _count: { select: { currentShipments: { where: { status: "AT_HUB" } } } } },
    }),
    prisma.shipment.findMany({
      where: { status: { in: ["IN_TRANSIT", "AT_HUB"] } },
      orderBy: { dispatchedAt: "asc" },
      include: {
        warehouse: { select: { name: true } },
        order: { select: { orderNumber: true } },
        legs: { orderBy: { sequence: "asc" }, include: { hub: { select: { id: true, name: true } } } },
      },
    }),
    prisma.shipment.count({ where: { status: "OUT_FOR_DELIVERY" } }),
    prisma.shipmentLeg.count({ where: { status: "INBOUND" } }),
  ]);
  return {
    hubs,
    network,
    stats: {
      inNetwork: network.length,
      awaitingIntake,
      outForDelivery,
      hubsOnline: hubs.filter((h) => h.isOnline).length,
    },
  };
}

export type NetworkShipment = Awaited<ReturnType<typeof getHubOverview>>["network"][number];

/** The next scan a parcel expects: intake → sort → dispatch at its active hub. */
export function nextHubAction(s: NetworkShipment) {
  const leg = s.legs.find((l) => ["INBOUND", "RECEIVED", "SORTED"].includes(l.status));
  if (!leg) return null;
  const isLast = leg.sequence === s.legs.length;
  const label =
    leg.status === "INBOUND" ? "Scan intake" : leg.status === "RECEIVED" ? "Scan to sort" : isLast ? "Release to courier" : "Scan dispatch";
  return { hubId: leg.hubId, hubName: leg.hub.name, label, legStatus: leg.status };
}

/**
 * A single scan at a hub. The server decides what the scan means from the leg state:
 * INBOUND → received, RECEIVED → sorted, SORTED → dispatched (or released to a courier at the delivery hub).
 */
export async function hubScan(hubId: string, code: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const hub = await tx.hub.findUnique({ where: { id: hubId } });
    if (!hub) throw new ApiError(404, "Hub not found.");
    const s = await findByCode(tx, code);
    if (!s) throw new ApiError(404, "No parcel matches that code.");

    const leg = s.legs.find((l) => l.hubId === hubId && ["INBOUND", "RECEIVED", "SORTED"].includes(l.status));
    if (!leg) {
      const planned = s.legs.find((l) => l.hubId === hubId);
      if (!planned) throw new ApiError(409, `${s.shipmentNumber} is not routed through ${hub.name}.`);
      if (planned.status === "PENDING") throw new ApiError(409, `${s.shipmentNumber} has not been dispatched to ${hub.name} yet.`);
      throw new ApiError(409, `${s.shipmentNumber} has already left ${hub.name}.`);
    }

    const now = new Date();
    const isLast = leg.sequence === s.legs.length;

    if (leg.status === "INBOUND") {
      await tx.shipmentLeg.update({ where: { id: leg.id }, data: { status: "RECEIVED", receivedAt: now } });
      await tx.shipment.update({ where: { id: s.id }, data: { status: "AT_HUB", currentHubId: hubId } });
      await tx.scanEvent.create({
        data: { shipmentId: s.id, type: "HUB_INTAKE", locationLabel: hub.name, scannedById: actor.id, qrVerified: true, remarks: "Received at hub" },
      });
      await recomputeOrderStatus(tx, s.orderId);
      return { action: "received", message: `${s.shipmentNumber} received at ${hub.name}.` };
    }

    if (leg.status === "RECEIVED") {
      await tx.shipmentLeg.update({ where: { id: leg.id }, data: { status: "SORTED", sortedAt: now } });
      await tx.scanEvent.create({
        data: { shipmentId: s.id, type: "HUB_SORT", locationLabel: hub.name, scannedById: actor.id, qrVerified: true, remarks: isLast ? "Sorted to last-mile bay" : "Sorted to next leg" },
      });
      return { action: "sorted", message: `${s.shipmentNumber} sorted at ${hub.name}.` };
    }

    // SORTED → dispatch
    if (isLast) {
      const couriers = await tx.courier.findMany({
        where: { homeHubId: hubId, isAvailable: true },
        include: { _count: { select: { shipments: { where: { status: "OUT_FOR_DELIVERY" } } } } },
      });
      if (couriers.length === 0) throw new ApiError(409, `No available courier is attached to ${hub.name}.`);
      couriers.sort((a, b) => a._count.shipments - b._count.shipments);
      const courier = couriers[0];

      await tx.shipmentLeg.update({ where: { id: leg.id }, data: { status: "DEPARTED", departedAt: now } });
      await tx.shipment.update({
        where: { id: s.id },
        data: { status: "OUT_FOR_DELIVERY", courierId: courier.id, currentHubId: null },
      });
      await tx.scanEvent.create({
        data: { shipmentId: s.id, type: "OUT_FOR_DELIVERY", locationLabel: hub.name, scannedById: actor.id, qrVerified: true, remarks: "Released to last-mile courier" },
      });
      await recomputeOrderStatus(tx, s.orderId);
      return { action: "out_for_delivery", message: `${s.shipmentNumber} is out for delivery.` };
    }

    const nextLeg = s.legs.find((l) => l.sequence === leg.sequence + 1)!;
    await tx.shipmentLeg.update({ where: { id: leg.id }, data: { status: "DEPARTED", departedAt: now } });
    await tx.shipmentLeg.update({ where: { id: nextLeg.id }, data: { status: "INBOUND" } });
    await tx.shipment.update({ where: { id: s.id }, data: { status: "IN_TRANSIT", currentHubId: null } });
    await tx.scanEvent.create({
      data: { shipmentId: s.id, type: "HUB_DISPATCH", locationLabel: hub.name, scannedById: actor.id, qrVerified: true, remarks: `Dispatched to ${nextLeg.hub.name}` },
    });
    return { action: "dispatched", message: `${s.shipmentNumber} dispatched to ${nextLeg.hub.name}.` };
  }, TX);
}

// ─────────────── Courier / last mile ───────────────

export async function getCourierBoard() {
  const [couriers, runsheet, pickups, delivered] = await Promise.all([
    prisma.courier.findMany({
      orderBy: { zone: "asc" },
      include: {
        user: { select: { fullName: true } },
        homeHub: { select: { name: true } },
        _count: { select: { shipments: { where: { status: "OUT_FOR_DELIVERY" } } } },
      },
    }),
    prisma.shipment.findMany({
      where: { status: "OUT_FOR_DELIVERY" },
      orderBy: { updatedAt: "asc" },
      include: {
        order: { select: { orderNumber: true, shippingAddress: true } },
        courier: { include: { user: { select: { fullName: true } } } },
        items: { select: { productName: true, variantLabel: true, quantity: true } },
        attempts: { orderBy: { attemptedAt: "desc" } },
      },
    }),
    prisma.return.findMany({
      where: { status: { in: ["PICKUP_SCHEDULED", "PICKED_UP"] } },
      orderBy: { createdAt: "asc" },
      include: {
        orderItem: { include: { order: { select: { orderNumber: true, shippingAddress: true } } } },
        pickupCourier: { include: { user: { select: { fullName: true } } } },
      },
    }),
    prisma.shipment.count({ where: { status: "DELIVERED" } }),
  ]);
  return {
    couriers,
    runsheet,
    pickups,
    stats: { onRunsheet: runsheet.length, returnPickups: pickups.length, delivered, riders: couriers.length },
  };
}

export async function deliverShipment(
  shipmentId: string,
  input: { code: string; otp: string; codCollected?: number },
  actor: CurrentUser,
) {
  return prisma.$transaction(async (tx) => {
    const s = await tx.shipment.findUnique({
      where: { id: shipmentId },
      include: { attempts: true, order: { include: { payments: true } } },
    });
    if (!s) throw new ApiError(404, "Shipment not found.");
    if (s.status !== "OUT_FOR_DELIVERY" || !s.courierId) throw new ApiError(409, "This parcel is not out for delivery.");
    if (!matchesCode(s, input.code)) throw new ApiError(422, "Scanned code does not match this parcel.");
    if (input.otp.trim() !== s.deliveryOtp) {
      throw new ApiError(422, "OTP does not match. Ask the customer for the 4-digit code on their order page.");
    }
    const isCod = s.paymentType === "COD";
    if (isCod && input.codCollected !== s.codAmount) {
      throw new ApiError(422, `Collect exactly ₹${s.codAmount.toLocaleString("en-IN")} in cash before marking delivered.`);
    }

    const addr = s.order.shippingAddress as { city?: string };
    await tx.deliveryAttempt.create({
      data: {
        shipmentId: s.id,
        courierId: s.courierId,
        attemptNumber: s.attempts.length + 1,
        status: "DELIVERED",
        qrVerified: true,
        codCollected: isCod ? s.codAmount : 0,
        podType: "OTP",
        podValue: "OTP verified",
      },
    });
    await tx.shipment.update({ where: { id: s.id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
    await tx.scanEvent.create({
      data: {
        shipmentId: s.id,
        type: "DELIVERED",
        locationLabel: `Customer doorstep, ${addr.city ?? ""}`.trim(),
        scannedById: actor.id,
        qrVerified: true,
        remarks: isCod ? `Delivered, ₹${s.codAmount} cash collected` : "Delivered, OTP verified",
      },
    });

    if (isCod) {
      await tx.payment.create({
        data: { orderId: s.orderId, method: "COD", gateway: "cash", amount: s.codAmount, status: "SUCCESS", paidAt: new Date() },
      });
      const paid = s.order.payments.filter((p) => p.status === "SUCCESS").reduce((a, p) => a + p.amount, 0) + s.codAmount;
      if (paid >= s.order.grandTotal) {
        await tx.order.update({ where: { id: s.orderId }, data: { paymentStatus: "PAID" } });
      }
    }
    await recomputeOrderStatus(tx, s.orderId);
    return { status: "DELIVERED" };
  }, TX);
}

export async function failDelivery(shipmentId: string, reason: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const s = await tx.shipment.findUnique({ where: { id: shipmentId }, include: { attempts: true } });
    if (!s) throw new ApiError(404, "Shipment not found.");
    if (s.status !== "OUT_FOR_DELIVERY" || !s.courierId) throw new ApiError(409, "This parcel is not out for delivery.");
    const attemptNumber = s.attempts.length + 1;
    await tx.deliveryAttempt.create({
      data: { shipmentId: s.id, courierId: s.courierId, attemptNumber, status: "FAILED", failureReason: reason },
    });
    await tx.scanEvent.create({
      data: { shipmentId: s.id, type: "DELIVERY_FAILED", locationLabel: "Customer address", scannedById: actor.id, remarks: reason },
    });
    if (attemptNumber >= 3) {
      await tx.shipment.update({ where: { id: s.id }, data: { status: "FAILED" } });
      await recomputeOrderStatus(tx, s.orderId);
    }
    return { attemptNumber };
  }, TX);
}
