import { handle, parseBody } from "@/lib/api";
import { registerSeller, sellerRegisterSchema } from "@/lib/services/sellers";

// POST /api/vendor/register — seller application (status PENDING until an admin approves)
export const POST = handle(async (req) => registerSeller(await parseBody(req, sellerRegisterSchema)));

export const dynamic = "force-dynamic";
