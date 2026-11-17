import fs from "fs";
import path from "path";
import { baseOpenApiSpec } from "../../src/lib/swagger/spec";

// Path to public/swagger.json
const SWAGGER_JSON_PATH = path.join(process.cwd(), "public", "swagger.json");

// In-memory spec initialized from baseOpenApiSpec or public/swagger.json
let currentSpec = JSON.parse(JSON.stringify(baseOpenApiSpec));

try {
  if (fs.existsSync(SWAGGER_JSON_PATH)) {
    const existing = JSON.parse(fs.readFileSync(SWAGGER_JSON_PATH, "utf-8"));
    if (existing.paths && Object.keys(existing.paths).length > 0) {
      currentSpec = existing;
    }
  }
} catch (e) {
  // Use baseOpenApiSpec fallback
}

export interface TestResultData {
  status: number;
  durationMs?: number;
  responseBody?: unknown;
}

export function recordApiTestResult(
  pathKey: string,
  method: "get" | "post" | "patch" | "delete" | "put",
  result: TestResultData
) {
  const normPath = pathKey.replace(/\/$/, "");
  const normMethod = method.toLowerCase();

  // If path doesn't exist in currentSpec, create it
  if (!currentSpec.paths[normPath]) {
    currentSpec.paths[normPath] = {};
  }
  if (!currentSpec.paths[normPath][normMethod]) {
    currentSpec.paths[normPath][normMethod] = {
      tags: ["General"],
      summary: `${normMethod.toUpperCase()} ${normPath}`,
      responses: {},
    };
  }

  const op = currentSpec.paths[normPath][normMethod];
  op["x-test-status"] = "passed";
  op["x-tested-at"] = new Date().toISOString();
  if (result.durationMs) {
    op["x-test-duration-ms"] = Math.round(result.durationMs);
  }

  // Ensure status response exists and has verified example
  const statusStr = String(result.status);
  if (!op.responses) op.responses = {};
  if (!op.responses[statusStr]) {
    op.responses[statusStr] = {
      description: `Verified ${statusStr} HTTP response`,
    };
  }

  if (result.responseBody !== undefined && typeof result.responseBody === "object") {
    if (!op.responses[statusStr].content) {
      op.responses[statusStr].content = {};
    }
    op.responses[statusStr].content["application/json"] = {
      schema: { type: "object" },
      example: result.responseBody,
    };
  }

  // Persist updated swagger JSON
  saveEnrichedSwaggerSpec();
}

export function saveEnrichedSwaggerSpec() {
  try {
    fs.writeFileSync(SWAGGER_JSON_PATH, JSON.stringify(currentSpec, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to public/swagger.json:", err);
  }
}
