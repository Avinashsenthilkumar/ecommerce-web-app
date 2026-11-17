import { test, expect } from "@playwright/test";
import { recordApiTestResult } from "./swagger-enricher";
import { loginAdmin } from "../helpers/auth-helper";

test.describe("API: Admin Operations (/api/admin/*)", () => {
  test("GET /api/admin/overview - Operations overview metrics and queues", async ({ page }) => {
    await loginAdmin(page);

    const start = Date.now();
    const res = await page.request.get("/api/admin/overview");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.queue).toBeDefined();

    recordApiTestResult("/api/admin/overview", "get", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("GET /api/admin/settings - Retrieve store settings and rules", async ({ page }) => {
    await loginAdmin(page);

    const start = Date.now();
    const res = await page.request.get("/api/admin/settings");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    recordApiTestResult("/api/admin/settings", "get", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/admin/settings - Save store rules", async ({ page }) => {
    await loginAdmin(page);

    const start = Date.now();
    const res = await page.request.post("/api/admin/settings", {
      data: {
        values: {
          gstRatePercent: "18",
          discountRatePercent: "5",
          freeShippingFrom: "999",
          shippingFee: "99",
        },
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    recordApiTestResult("/api/admin/settings", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("GET /api/admin/analytics/report - Download platform sales report JSON", async ({ page }) => {
    await loginAdmin(page);

    const start = Date.now();
    const res = await page.request.get("/api/admin/analytics/report?period=month&year=2026&format=json");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);

    recordApiTestResult("/api/admin/analytics/report", "get", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/admin/sellers/{id} - Execute seller approval/suspension action", async ({ page }) => {
    await loginAdmin(page);

    const start = Date.now();
    const res = await page.request.post("/api/admin/sellers/sample-seller-id", {
      data: { action: "approve" },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 400, 404]).toContain(status);

    recordApiTestResult("/api/admin/sellers/{id}", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/admin/listings/{id} - Review and approve product listing", async ({ page }) => {
    await loginAdmin(page);

    const start = Date.now();
    const res = await page.request.post("/api/admin/listings/sample-listing-id", {
      data: { action: "approve" },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 400, 404]).toContain(status);

    recordApiTestResult("/api/admin/listings/{id}", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/admin/orders/{id} - Execute order lifecycle action", async ({ page }) => {
    await loginAdmin(page);

    const start = Date.now();
    const res = await page.request.post("/api/admin/orders/sample-order-id", {
      data: { action: "confirm" },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 400, 404]).toContain(status);

    recordApiTestResult("/api/admin/orders/{id}", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/admin/returns/{id} - Approve or reject return request", async ({
    page,
  }) => {
    await loginAdmin(page);

    const start = Date.now();
    const res = await page.request.post("/api/admin/returns/sample-return-id", {
      data: { action: "approve" },
    });
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 400, 404]).toContain(status);

    recordApiTestResult("/api/admin/returns/{id}", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/admin/refunds/{id} - Advance refund to next stage", async ({
    page,
  }) => {
    await loginAdmin(page);

    const start = Date.now();
    const res = await page.request.post("/api/admin/refunds/sample-refund-id");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 400, 404]).toContain(status);

    recordApiTestResult("/api/admin/refunds/{id}", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });
});
