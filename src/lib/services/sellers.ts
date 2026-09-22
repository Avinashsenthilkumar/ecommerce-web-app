import { z } from "zod";
import { prisma } from "../prisma";
import { ApiError } from "../api";
import { createSession, type CurrentUser } from "../auth";
import { hashPassword } from "../password";

// ─────────────── Seller registration (public) ───────────────

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const sellerRegisterSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name"),
  fullName: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().regex(/^[0-9+\s-]{10,15}$/, "Enter a valid mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .refine((v) => !v || GSTIN.test(v), "Enter a valid 15-character GSTIN, or leave it empty"),
  pickupAddress: z.string().trim().min(10, "Enter the full pickup address"),
  storeDescription: z.string().trim().min(10, "Tell us what you sell (at least 10 characters)").max(500),
});

/** Creates the seller account in PENDING state and signs them in to see their application status. */
export async function registerSeller(input: z.infer<typeof sellerRegisterSchema>) {
  if (await prisma.user.findUnique({ where: { email: input.email } })) {
    throw new ApiError(409, "An account with this email already exists.");
  }
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash: hashPassword(input.password),
      role: "VENDOR",
      vendor: {
        create: {
          businessName: input.businessName,
          gstin: input.gstin || null,
          pickupAddress: input.pickupAddress,
          storeDescription: input.storeDescription,
          status: "PENDING",
        },
      },
    },
  });
  await createSession(user.id);
  return { status: "PENDING" };
}

// ─────────────── Admin: seller approvals & listing moderation ───────────────

export async function getSellerAdmin() {
  const [sellers, listings] = await Promise.all([
    prisma.vendor.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        _count: { select: { products: true } },
      },
    }),
    prisma.product.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: {
        vendor: { select: { businessName: true } },
        brand: true,
        category: true,
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { id: "asc" }, include: { inventory: { include: { warehouse: { select: { name: true } } } } } },
      },
    }),
  ]);
  return {
    applications: sellers.filter((s) => s.status === "PENDING"),
    sellers: sellers.filter((s) => s.status !== "PENDING"),
    listings,
  };
}

async function findSeller(id: string) {
  const v = await prisma.vendor.findUnique({ where: { id } });
  if (!v) throw new ApiError(404, "Seller not found.");
  return v;
}

export async function setSellerStatus(id: string, action: "approve" | "reject" | "suspend" | "reinstate", admin: CurrentUser, reason?: string) {
  const v = await findSeller(id);
  const needReason = action === "reject" || action === "suspend";
  if (needReason && (!reason || reason.trim().length < 5)) throw new ApiError(422, "Give the seller a reason (at least 5 characters).");

  const allowed: Record<typeof action, string[]> = {
    approve: ["PENDING", "REJECTED"],
    reject: ["PENDING"],
    suspend: ["APPROVED"],
    reinstate: ["SUSPENDED"],
  };
  if (!allowed[action].includes(v.status)) throw new ApiError(409, `A ${v.status.toLowerCase()} seller cannot be ${action}d.`);

  const data =
    action === "approve" || action === "reinstate"
      ? { status: "APPROVED" as const, approvedAt: new Date(), approvedById: admin.id, rejectionReason: null }
      : { status: action === "reject" ? ("REJECTED" as const) : ("SUSPENDED" as const), rejectionReason: reason!.trim() };
  return prisma.vendor.update({ where: { id }, data });
}

export async function reviewListing(productId: string, action: "approve" | "reject", reason?: string) {
  const p = await prisma.product.findUnique({ where: { id: productId }, include: { vendor: true } });
  if (!p) throw new ApiError(404, "Listing not found.");
  if (p.status !== "PENDING_REVIEW") throw new ApiError(409, "This listing is not waiting for review.");
  if (action === "approve") {
    if (p.vendor.status !== "APPROVED") throw new ApiError(409, "Approve the seller before their listings.");
    return prisma.product.update({ where: { id: productId }, data: { status: "ACTIVE", reviewNote: null } });
  }
  if (!reason || reason.trim().length < 5) throw new ApiError(422, "Tell the seller what to fix (at least 5 characters).");
  return prisma.product.update({ where: { id: productId }, data: { status: "REJECTED", reviewNote: reason.trim() } });
}

/** Seller sends a rejected listing back for review. */
export async function resubmitListing(user: CurrentUser, productId: string) {
  const p = await prisma.product.findUnique({ where: { id: productId } });
  if (!p || p.vendorId !== user.vendor?.id) throw new ApiError(404, "Listing not found.");
  if (p.status !== "REJECTED") throw new ApiError(409, "Only rejected listings can be resubmitted.");
  return prisma.product.update({ where: { id: productId }, data: { status: "PENDING_REVIEW" } });
}
