import type { MovementReason, Prisma, StockBucket } from "@prisma/client";
import type { Tx } from "../prisma";
import { ApiError } from "../api";

export type Bucket = "available" | "reserved" | "picked" | "packed" | "shipped";

const BUCKET_ENUM: Record<Bucket, StockBucket> = {
  available: "AVAILABLE",
  reserved: "RESERVED",
  picked: "PICKED",
  packed: "PACKED",
  shipped: "SHIPPED",
};

type MoveInput = {
  variantId: string;
  warehouseId: string;
  from: Bucket | null; // null = stock entering the system (restock / return)
  to: Bucket | null; // null = stock leaving the system (adjustment)
  qty: number;
  reason: MovementReason;
  referenceType?: string;
  referenceId?: string;
  actorId?: string | null;
  note?: string;
};

/**
 * Moves units between inventory buckets atomically and writes a StockMovement row.
 * Fails with 409 if the source bucket does not hold enough units.
 */
export async function moveStock(tx: Tx, m: MoveInput) {
  if (m.qty <= 0) throw new ApiError(400, "Quantity must be at least 1.");

  let inv = await tx.inventory.findUnique({
    where: {
      variantId_warehouseId: {
        variantId: m.variantId,
        warehouseId: m.warehouseId,
      },
    },
    include: { variant: { select: { sku: true } } },
  });

  if (!inv) {
    if (m.from !== null)
      throw new ApiError(
        409,
        "This SKU has no stock record in that warehouse.",
      );
    inv = await tx.inventory.create({
      data: { variantId: m.variantId, warehouseId: m.warehouseId },
      include: { variant: { select: { sku: true } } },
    });
  }

  const data: Record<string, unknown> = {};
  if (m.from) data[m.from] = { decrement: m.qty };
  if (m.to) data[m.to] = { increment: m.qty };

  const where: Record<string, unknown> = { id: inv.id };
  if (m.from) where[m.from] = { gte: m.qty };

  const res = await tx.inventory.updateMany({
    where: where as Prisma.InventoryWhereInput,
    data: data as Prisma.InventoryUpdateManyMutationInput,
  });
  if (res.count === 0) {
    throw new ApiError(
      409,
      `Not enough ${m.from} stock for ${inv.variant.sku}.`,
    );
  }

  await tx.stockMovement.create({
    data: {
      variantId: m.variantId,
      warehouseId: m.warehouseId,
      fromBucket: m.from ? BUCKET_ENUM[m.from] : "NONE",
      toBucket: m.to ? BUCKET_ENUM[m.to] : "NONE",
      quantity: m.qty,
      reason: m.reason,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      performedById: m.actorId ?? null,
      note: m.note,
    },
  });
}

export function maxAvailableAtWarehouse(inv: { available: number }[]) {
  return inv.reduce((max, i) => Math.max(max, i.available), 0);
}
