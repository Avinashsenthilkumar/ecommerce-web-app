import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { baseOpenApiSpec } from "@/lib/swagger/spec";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicPath = path.join(process.cwd(), "public", "swagger.json");
  try {
    if (fs.existsSync(publicPath)) {
      const content = fs.readFileSync(publicPath, "utf-8");
      const json = JSON.parse(content);
      if (json.paths && Object.keys(json.paths).length > 0) {
        return NextResponse.json(json);
      }
    }
  } catch (e) {
    console.error("Failed to read public/swagger.json, falling back to base spec:", e);
  }

  return NextResponse.json(baseOpenApiSpec);
}
