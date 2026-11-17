import { createHash } from "crypto";
import { ApiError } from "./api";
import { prisma } from "./prisma";

type Bucket = { windowStart: number; count: number };

function clientAddress(request: Request) {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for");
  const address = forwarded
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);
  return address ?? request.headers.get("x-real-ip")?.trim() ?? "unknown";
}

export async function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
) {
  const addressHash = createHash("sha256")
    .update(clientAddress(request))
    .digest("hex");
  const key = `rate-limit:${scope}:${addressHash}`;
  const now = Date.now();
  const result = await prisma.$transaction(async (tx) => {
    await tx.setting.upsert({
      where: { key },
      create: { key, value: JSON.stringify({ windowStart: now, count: 0 }) },
      update: {},
    });
    await tx.$queryRaw`SELECT "key" FROM "Setting" WHERE "key" = ${key} FOR UPDATE`;
    const stored = await tx.setting.findUniqueOrThrow({ where: { key } });
    const bucket = JSON.parse(stored.value) as Bucket;
    if (
      !Number.isSafeInteger(bucket.windowStart) ||
      !Number.isSafeInteger(bucket.count) ||
      bucket.count < 0
    ) {
      throw new Error(`Invalid rate-limit bucket stored for ${scope}.`);
    }

    const active =
      now - bucket.windowStart < windowMs
        ? bucket
        : { windowStart: now, count: 0 };
    const next = { ...active, count: active.count + 1 };
    await tx.setting.update({
      where: { key },
      data: { value: JSON.stringify(next) },
    });
    return {
      allowed: active.count < limit,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((active.windowStart + windowMs - now) / 1000),
      ),
    };
  });

  if (!result.allowed) {
    throw new ApiError(
      429,
      `Too many requests. Try again in ${result.retryAfterSeconds} seconds.`,
    );
  }
}
