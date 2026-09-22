import { handle } from "@/lib/api";
import { destroySession } from "@/lib/auth";

// POST /api/auth/logout
export const POST = handle(async () => {
  await destroySession();
  return { signedOut: true };
});

export const dynamic = "force-dynamic";
