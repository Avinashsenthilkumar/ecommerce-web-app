import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { createSession, ROLE_HOME, STAFF_ROLES } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  portal: z.enum(["customer", "vendor", "staff"]).default("customer"),
});

// POST /api/auth/login  { email, password, portal }
export const POST = handle(async (req) => {
  const { email, password, portal } = await parseBody(req, schema);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) throw new ApiError(401, "Email or password is incorrect.");
  if (user.status !== "ACTIVE") throw new ApiError(403, "This account is blocked. Contact support.");

  if (portal === "customer" && user.role !== "CUSTOMER") {
    throw new ApiError(403, user.role === "VENDOR" ? "This is a seller account. Use Seller login." : "This is a staff account. Use Staff login.");
  }
  if (portal === "vendor" && user.role !== "VENDOR") throw new ApiError(403, "This is not a seller account.");
  if (portal === "staff" && !STAFF_ROLES.includes(user.role)) throw new ApiError(403, "This is not a staff account.");

  await createSession(user.id);
  return { name: user.fullName, role: user.role, home: ROLE_HOME[user.role] };
});
