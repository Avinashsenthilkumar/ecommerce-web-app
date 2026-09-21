import { NextResponse } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Ctx = { params: Record<string, string> };

/** Wraps a route handler: returns { ok, data } or { ok:false, error } with the right status. */
export function handle(fn: (req: Request, ctx: Ctx) => Promise<unknown>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      const data = await fn(req, ctx);
      return NextResponse.json({ ok: true, data });
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
      }
      if (e instanceof ZodError) {
        const msg = e.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
        return NextResponse.json({ ok: false, error: msg }, { status: 422 });
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json({ ok: false, error: "A record with that value already exists." }, { status: 409 });
      }
      console.error(e);
      return NextResponse.json({ ok: false, error: "Something failed on the server. Check the logs." }, { status: 500 });
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseBody<T>(req: Request, schema: ZodType<T, ZodTypeDef, any>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be JSON.");
  }
  return schema.parse(json);
}

export function assert(cond: unknown, status: number, message: string): asserts cond {
  if (!cond) throw new ApiError(status, message);
}
