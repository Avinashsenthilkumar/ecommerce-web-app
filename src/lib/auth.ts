import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { ApiError } from "./api";

/**
 * Session authentication.
 * A random token lives in an httpOnly cookie; the database stores only its SHA-256 hash.
 * Customers sign in at /login, sellers at /vendor/login, operations staff at /staff/login.
 */
export const SESSION_COOKIE = "subsel_session";
const SESSION_DAYS = 30;

export const STAFF_ROLES: Role[] = ["ADMIN", "WAREHOUSE", "HUB", "COURIER"];

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: "Customer",
  VENDOR: "Seller",
  ADMIN: "Admin",
  WAREHOUSE: "Warehouse",
  HUB: "Hub",
  COURIER: "Courier",
};

export const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: "/",
  VENDOR: "/vendor",
  ADMIN: "/admin",
  WAREHOUSE: "/warehouse",
  HUB: "/hub",
  COURIER: "/courier",
};

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookies().delete(SESSION_COOKIE);
}

/** The signed-in user, or null. */
export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { vendor: true, courier: true } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.status !== "ACTIVE") return null;
  return session.user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Sign in to continue.");
  return user;
}

/** Shopping actions (cart, checkout, orders, wishlist) need a customer account. */
export async function requireCustomer() {
  const user = await requireUser();
  if (user.role !== "CUSTOMER") throw new ApiError(403, "Sign in with a customer account to shop.");
  return user;
}

/** Throws 401/403 unless the user has one of the roles. Admin passes every staff check. */
export async function requireRole(roles: Role[], opts: { allowAdmin?: boolean } = {}) {
  const user = await requireUser();
  const allowAdmin = opts.allowAdmin ?? true;
  if (roles.includes(user.role) || (allowAdmin && user.role === "ADMIN")) return user;
  throw new ApiError(403, `This action needs the ${roles.map((r) => ROLE_LABEL[r]).join(" or ")} role.`);
}

/** For operations pages: redirects to the right login, reports whether the role may view the page. */
export async function staffGate(need: Role) {
  const user = await getCurrentUser();
  if (!user) redirect(need === "VENDOR" ? "/vendor/login" : `/staff/login?next=${ROLE_HOME[need]}`);
  const allowed = user.role === need || (need !== "VENDOR" && user.role === "ADMIN");
  return { user, allowed };
}

/** Only allow same-site relative redirects after login. */
export function safeNext(next: string | null | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
