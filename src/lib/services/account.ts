import { prisma } from "../prisma";
import { ApiError } from "../api";
import type { AddressInput } from "./orders";

export function listAddresses(userId: string) {
  return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
}

export async function addAddress(userId: string, a: AddressInput, makeDefault = false) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId } });
    const isDefault = makeDefault || count === 0;
    if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.create({ data: { userId, ...a, isDefault } });
  });
}

async function own(userId: string, id: string) {
  const a = await prisma.address.findUnique({ where: { id } });
  if (!a || a.userId !== userId) throw new ApiError(404, "Address not found.");
  return a;
}

export async function setDefaultAddress(userId: string, id: string) {
  await own(userId, id);
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  return { id };
}

export async function deleteAddress(userId: string, id: string) {
  const a = await own(userId, id);
  await prisma.address.delete({ where: { id } });
  if (a.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return { id };
}
