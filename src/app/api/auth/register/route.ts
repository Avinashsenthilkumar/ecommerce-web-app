import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().regex(/^[0-9+\s-]{10,15}$/, "Enter a valid mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// POST /api/auth/register — new customer account, signed in immediately
export const POST = handle(async (req) => {
  const b = await parseBody(req, schema);
  if (await prisma.user.findUnique({ where: { email: b.email } })) {
    throw new ApiError(409, "An account with this email already exists. Sign in instead.");
  }
  const user = await prisma.user.create({
    data: { fullName: b.fullName, email: b.email, phone: b.phone, passwordHash: hashPassword(b.password), role: "CUSTOMER" },
  });
  await createSession(user.id);
  return { name: user.fullName };
});
