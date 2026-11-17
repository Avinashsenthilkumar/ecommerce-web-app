import { prisma } from "../prisma";

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export async function trackOrder(orderNumber: string, phone: string) {
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 10 || normalizedPhone.length > 15) return null;
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim().toUpperCase() },
    select: {
      orderNumber: true,
      placedAt: true,
      status: true,
      paymentStatus: true,
      shippingAddress: true,
      items: {
        select: {
          productName: true,
          variantLabel: true,
          quantity: true,
        },
      },
      shipments: {
        orderBy: { createdAt: "asc" },
        select: {
          trackingNumber: true,
          status: true,
          deliveredAt: true,
          legs: {
            orderBy: { sequence: "asc" },
            select: {
              status: true,
              hub: { select: { name: true, type: true } },
            },
          },
          scans: {
            orderBy: { createdAt: "asc" },
            select: {
              type: true,
              locationLabel: true,
              remarks: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });
  if (!order) return null;

  const shippingAddress = order.shippingAddress;
  const address =
    shippingAddress && typeof shippingAddress === "object" && "phone" in shippingAddress
      ? shippingAddress.phone
      : null;
  if (
    typeof address !== "string" ||
    normalizePhone(address) !== normalizedPhone
  ) {
    return null;
  }

  return {
    orderNumber: order.orderNumber,
    placedAt: order.placedAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    items: order.items,
    shipments: order.shipments,
  };
}
