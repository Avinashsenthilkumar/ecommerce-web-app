import { prisma } from "../prisma";
import { ApiError } from "../api";
import { refundNumber } from "../codes";
import { moveStock } from "./inventory";
import type { CurrentUser } from "../auth";

const TX = { timeout: 20000 };

export async function approveReturn(returnId: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const r = await tx.return.findUnique({ where: { id: returnId }, include: { orderItem: { include: { shipment: true } } } });
    if (!r) throw new ApiError(404, "Return not found.");
    if (r.status !== "REQUESTED") throw new ApiError(409, "This return has already been reviewed.");

    let courierId = r.orderItem.shipment?.courierId ?? null;
    if (!courierId && r.orderItem.shipment?.deliveryHubId) {
      const c = await tx.courier.findFirst({ where: { homeHubId: r.orderItem.shipment.deliveryHubId, isAvailable: true } });
      courierId = c?.id ?? null;
    }
    if (!courierId) throw new ApiError(409, "No courier is available for the pickup.");

    return tx.return.update({
      where: { id: returnId },
      data: { status: "PICKUP_SCHEDULED", pickupCourierId: courierId, approvedById: actor.id, approvedAt: new Date() },
    });
  }, TX);
}

export async function rejectReturn(returnId: string, actor: CurrentUser, note?: string) {
  const r = await prisma.return.findUnique({ where: { id: returnId } });
  if (!r) throw new ApiError(404, "Return not found.");
  if (r.status !== "REQUESTED") throw new ApiError(409, "This return has already been reviewed.");
  return prisma.return.update({
    where: { id: returnId },
    data: { status: "REJECTED", approvedById: actor.id, approvedAt: new Date(), qcNotes: note ?? "Rejected by admin" },
  });
}

export async function pickupReturn(returnId: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const r = await tx.return.findUnique({ where: { id: returnId } });
    if (!r) throw new ApiError(404, "Return not found.");
    if (r.status !== "PICKUP_SCHEDULED") throw new ApiError(409, "This return is not waiting for pickup.");
    await tx.return.update({ where: { id: returnId }, data: { status: "PICKED_UP", pickedUpAt: new Date() } });
    await tx.scanEvent.create({
      data: { returnId, type: "RETURN_PICKUP", locationLabel: "Customer address", scannedById: actor.id, remarks: `${r.returnNumber} collected` },
    });
    return { status: "PICKED_UP" };
  }, TX);
}

/** Quality check at intake. Pass → stock goes back to Available and a refund is raised. */
export async function qcReturn(returnId: string, pass: boolean, notes: string | undefined, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const r = await tx.return.findUnique({
      where: { id: returnId },
      include: { orderItem: { include: { order: { include: { payments: true } } } } },
    });
    if (!r) throw new ApiError(404, "Return not found.");
    if (r.status !== "PICKED_UP") throw new ApiError(409, "Collect the parcel before the quality check.");

    const item = r.orderItem;
    if (pass) {
      if (!item.allocatedWarehouseId) throw new ApiError(409, "Original warehouse unknown for this item.");
      await moveStock(tx, {
        variantId: item.variantId,
        warehouseId: item.allocatedWarehouseId,
        from: null,
        to: "available",
        qty: r.quantity,
        reason: "RETURN",
        referenceType: "RETURN",
        referenceId: r.returnNumber,
        actorId: actor.id,
        note: "Restocked after QC pass",
      });
      const payment = item.order.payments.find((p) => p.status === "SUCCESS");
      if (payment) {
        await tx.refund.create({
          data: {
            refundNumber: await refundNumber(tx),
            orderId: item.orderId,
            returnId: r.id,
            paymentId: payment.id,
            amount: Math.round(
              item.unitPrice * r.quantity * (item.order.subtotal > 0 ? (item.order.grandTotal - item.order.shippingFee) / item.order.subtotal : 1),
            ),
            method: item.order.paymentMethod === "COD" ? "BANK_TRANSFER" : "ORIGINAL_SOURCE",
            reason: r.reason,
            processedById: actor.id,
          },
        });
      }
    }

    await tx.return.update({
      where: { id: returnId },
      data: {
        status: pass ? "QC_PASSED" : "QC_FAILED",
        qcNotes: notes || (pass ? "Item in resaleable condition" : "Failed quality check"),
        restockWarehouseId: pass ? item.allocatedWarehouseId : null,
      },
    });
    await tx.scanEvent.create({
      data: { returnId, type: "RETURN_QC", locationLabel: "Returns intake", scannedById: actor.id, remarks: pass ? "QC passed" : "QC failed" },
    });
    return { status: pass ? "QC_PASSED" : "QC_FAILED" };
  }, TX);
}

/** INITIATED → PROCESSING → COMPLETED. Completion updates the order's payment status. */
export async function advanceRefund(refundId: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const rf = await tx.refund.findUnique({ where: { id: refundId }, include: { order: { include: { payments: true, refunds: true } } } });
    if (!rf) throw new ApiError(404, "Refund not found.");
    if (rf.status === "INITIATED") {
      await tx.refund.update({ where: { id: refundId }, data: { status: "PROCESSING", processedById: actor.id } });
      return { status: "PROCESSING" };
    }
    if (rf.status !== "PROCESSING") throw new ApiError(409, "This refund is already closed.");

    await tx.refund.update({ where: { id: refundId }, data: { status: "COMPLETED", completedAt: new Date(), processedById: actor.id } });
    const refunded = rf.order.refunds.filter((x) => x.status === "COMPLETED").reduce((s, x) => s + x.amount, 0) + rf.amount;
    const paid = rf.order.payments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0);
    await tx.order.update({
      where: { id: rf.orderId },
      data: { paymentStatus: refunded >= paid ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    });
    return { status: "COMPLETED" };
  }, TX);
}
