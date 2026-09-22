import { z } from "zod";
import { handle, parseBody } from "@/lib/api";
import { requireCustomer } from "@/lib/auth";
import { addAddress, listAddresses } from "@/lib/services/account";
import { addressSchema } from "@/lib/services/orders";

// GET /api/account/addresses
export const GET = handle(async () => {
  const user = await requireCustomer();
  return listAddresses(user.id);
});

// POST /api/account/addresses  { address, isDefault? }
export const POST = handle(async (req) => {
  const user = await requireCustomer();
  const b = await parseBody(req, z.object({ address: addressSchema, isDefault: z.boolean().optional() }));
  return addAddress(user.id, b.address, b.isDefault);
});

export const dynamic = "force-dynamic";
