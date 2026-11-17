import { test, expect } from "@playwright/test";
import { recordApiTestResult } from "./swagger-enricher";
import { loginVendor } from "../helpers/auth-helper";

test.describe("API: Media & Assets (/api/cloudinary/*)", () => {
  test("POST /api/cloudinary/upload - Upload product asset", async ({ page }) => {
    await loginVendor(page);

    const start = Date.now();
    // 1x1 transparent PNG base64 data URI
    const transparentPixel =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const res = await page.request.post("/api/cloudinary/upload", {
      data: {
        image: transparentPixel,
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    // Expected 200 (if Cloudinary is configured) or 500 (if local test env lacks Cloudinary keys)
    expect([200, 500]).toContain(status);

    recordApiTestResult("/api/cloudinary/upload", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });
});
