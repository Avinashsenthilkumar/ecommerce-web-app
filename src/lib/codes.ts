import { randomBytes, randomInt } from "crypto";
import type { Tx } from "./prisma";

async function nextSeq(tx: Tx, key: string) {
  const c = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return c.value;
}

const ymd = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");
const pad = (n: number) => String(n).padStart(6, "0");

export const orderNumber = async (tx: Tx) => `ORD-${ymd()}-${pad(await nextSeq(tx, "order"))}`;
export const shipmentNumber = async (tx: Tx) => `SHIP-${ymd()}-${pad(await nextSeq(tx, "shipment"))}`;
export const returnNumber = async (tx: Tx) => `RET-${ymd()}-${pad(await nextSeq(tx, "return"))}`;
export const refundNumber = async (tx: Tx) => `RFD-${ymd()}-${pad(await nextSeq(tx, "refund"))}`;

export const trackingNumber = () => `TRK-${randomInt(100000, 999999)}`;
export const qrToken = (shipmentNo: string) =>
  `SUBSEL:${shipmentNo}:${randomBytes(3).toString("hex").toUpperCase()}`;
export const deliveryOtp = () => String(randomInt(1000, 9999));
export const gatewayTxn = () => `pay_demo_${randomBytes(6).toString("hex")}`;
