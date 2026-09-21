import { z } from "zod";
import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma, type Tx } from "../prisma";
import { ApiError } from "../api";
import { gatewayTxn, orderNumber, returnNumber } from "../codes";
import { cartInclude, cartTotals, lineUnitPrice } from "./cart";
import { sumAvailable } from "./inventory";
import type { CurrentUser } from "../auth";

export const RETURN_WINDOW_DAYS = 7;

export const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter the receiver's name"),
  phone: z.string().trim().regex(/^[0-9+\s-]{10,15}$/, "Enter a valid phone number"),
  line1: z.string().trim().min(3, "Enter the house / street"),
  line2: z.string().trim().optional().default(""),
  city: z.string().trim().min(2, "Enter the city"),
  state: z.string().trim().min(2, "Enter the state"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits"),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const placeOrderSchema = z.object({
  address: addressSchema,
  paymentMethod: z.enum(["UPI", "CARD", "NETBANKING", "COD"]),
});

/** Creates an order from the user's cart. UPI / card payments are simulated as successful. */
export async function placeOrder(userId: string, input: z.infer<typeof placeOrderSchema>) {
  return prisma.$transaction(
    async (tx) => {
      const cart = await tx.cart.findUnique({ where: { userId }, include: cartInclude });
      if (!cart || cart.items.length === 0) throw new ApiError(400, "Your cart is empty.");

      for (const line of cart.items) {
        const stock = sumAvailable(line.variant.inventory);
        if (line.quantity > stock) {
          throw new ApiError(409, `${line.variant.product.name} (${line.variant.label}) has only ${stock} left.`);
        }
      }

      const totals = cartTotals(cart.items);
      const prepaid = input.paymentMethod !== "COD";

      const order = await tx.order.create({
        data: {
          orderNumber: await orderNumber(tx),
          userId,
          shippingAddress: input.address,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          shippingFee: totals.shippingFee,
          grandTotal: totals.grandTotal,
          paymentMethod: input.paymentMethod,
          paymentStatus: prepaid ? "PAID" : "PENDING",
          items: {
            create: cart.items.map((l) => ({
              variantId: l.variantId,
              productName: l.variant.product.name,
              variantLabel: l.variant.label,
              sku: l.variant.sku,
              imageUrl: l.variant.product.images[0]?.url ?? null,
              quantity: l.quantity,
              unitMrp: l.variant.product.mrp,
              unitPrice: lineUnitPrice(l),
              lineTotal: lineUnitPrice(l) * l.quantity,
            })),
          },
          // COD payments are recorded by the courier at the doorstep
          payments: prepaid
            ? {
                create: {
                  method: input.paymentMethod,
                  gateway: "demo-gateway",
                  gatewayTxnId: gatewayTxn(),
                  amount: totals.grandTotal,
                  status: "SUCCESS",
                  paidAt: new Date(),
                },
              }
            : undefined,
        },
      });

      // Remember the address for next time
      const a = input.address;
      const existing = await tx.address.findFirst({ where: { userId, line1: a.line1, pincode: a.pincode } });
      if (!existing) {
        const count = await tx.address.count({ where: { userId } });
        await tx.address.create({ data: { userId, ...a, isDefault: count === 0 } });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return { orderNumber: order.orderNumber, id: order.id };
    },
    { timeout: 15000 },
  );
}

export const orderDetailInclude = {
  items: { include: { returns: { orderBy: { createdAt: "desc" } } } },
  payments: { orderBy: { createdAt: "asc" } },
  refunds: { orderBy: { createdAt: "asc" } },
  shipments: {
    orderBy: { createdAt: "asc" },
    include: {
      warehouse: { select: { name: true } },
      legs: { orderBy: { sequence: "asc" }, include: { hub: { select: { name: true, type: true } } } },
      scans: { orderBy: { createdAt: "asc" } },
      courier: { include: { user: { select: { fullName: true, phone: true } } } },
    },
  },
} satisfies Prisma.OrderInclude;

export type OrderDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

export function listOrdersForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    include: orderDetailInclude,
  });
}

export async function getOrderForUser(orderNumber: string, user: CurrentUser) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: orderDetailInclude });
  if (!order) return null;
  if (order.userId !== user.id && user.role !== "ADMIN") return null;
  return order;
}

export function getDefaultAddress(userId: string) {
  return prisma.address.findFirst({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
}

export const returnRequestSchema = z.object({
  orderItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  reason: z.enum(["Size or fit issue", "Damaged or defective", "Wrong item received", "Not as described", "Changed my mind"]),
  comment: z.string().max(500).optional(),
});

export async function requestReturn(user: CurrentUser, input: z.infer<typeof returnRequestSchema>) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.findUnique({
      where: { id: input.orderItemId },
      include: { order: true, shipment: true, returns: true },
    });
    if (!item || item.order.userId !== user.id) throw new ApiError(404, "Order item not found.");
    if (!item.shipment || item.shipment.status !== "DELIVERED" || !item.shipment.deliveredAt) {
      throw new ApiError(409, "Returns open once the item is delivered.");
    }
    const ageDays = (Date.now() - item.shipment.deliveredAt.getTime()) / 86_400_000;
    if (ageDays > RETURN_WINDOW_DAYS) throw new ApiError(409, `The ${RETURN_WINDOW_DAYS}-day return window has closed.`);

    const alreadyReturning = item.returns
      .filter((r) => r.status !== "REJECTED" && r.status !== "QC_FAILED")
      .reduce((s, r) => s + r.quantity, 0);
    const remaining = item.quantity - alreadyReturning;
    if (input.quantity > remaining) {
      throw new ApiError(409, remaining === 0 ? "A return is already open for this item." : `You can return up to ${remaining}.`);
    }

    return tx.return.create({
      data: {
        returnNumber: await returnNumber(tx),
        orderItemId: item.id,
        userId: user.id,
        quantity: input.quantity,
        reason: input.reason,
        comment: input.comment,
      },
    });
  });
}

/** Derives the order status from its shipments. Called after every fulfilment step. */
export async function recomputeOrderStatus(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { shipments: true, items: true } });
  if (!order || order.status === "CANCELLED" || order.shipments.length === 0) return;

  const s = order.shipments.map((x) => x.status);
  const moving = ["IN_TRANSIT", "AT_HUB", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"];
  let next: OrderStatus;
  if (s.every((x) => x === "DELIVERED")) next = "DELIVERED";
  else if (s.some((x) => moving.includes(x))) next = "SHIPPED";
  else if (s.some((x) => x !== "ALLOCATED") || order.items.some((i) => i.pickedQty > 0)) next = "PROCESSING";
  else next = "ALLOCATED";

  if (next !== order.status) await tx.order.update({ where: { id: orderId }, data: { status: next } });
}
