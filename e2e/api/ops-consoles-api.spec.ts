import { test, expect } from "@playwright/test";
import { recordApiTestResult } from "./swagger-enricher";
import { loginWarehouse, loginHub, loginCourier } from "../helpers/auth-helper";

test.describe("API: Fulfilment Logistics Consoles (/api/warehouse, /hub, /courier)", () => {
  test("GET /api/warehouse - Retrieve warehouse pick and pack queues", async ({ page }) => {
    await loginWarehouse(page);

    const start = Date.now();
    const res = await page.request.get("/api/warehouse");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    recordApiTestResult("/api/warehouse", "get", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/warehouse - Execute scan / pick action validation", async ({ page }) => {
    await loginWarehouse(page);

    const start = Date.now();
    const res = await page.request.post("/api/warehouse", {
      data: {
        action: "pick",
        shipmentId: "sample-shipment-id",
        code: "TEST-SKU-001",
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    // Expected 200 or 404/400 (shipment not found / invalid state)
    expect([200, 400, 404]).toContain(status);

    recordApiTestResult("/api/warehouse", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("GET /api/hub - Retrieve hub sorting and transit state", async ({ page }) => {
    await loginHub(page);

    const start = Date.now();
    const res = await page.request.get("/api/hub");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    recordApiTestResult("/api/hub", "get", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/hub - Scan transit parcel code", async ({ page }) => {
    await loginHub(page);

    const start = Date.now();
    const res = await page.request.post("/api/hub", {
      data: {
        hubId: "sample-hub-id",
        code: "PKG-20261117-0001",
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 400, 404]).toContain(status);

    recordApiTestResult("/api/hub", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("GET /api/courier - Retrieve courier runsheet and active parcels", async ({ page }) => {
    await loginCourier(page);

    const start = Date.now();
    const res = await page.request.get("/api/courier");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.runsheet).toBeDefined();

    recordApiTestResult("/api/courier", "get", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/courier - Delivery proof OTP verification action", async ({ page }) => {
    await loginCourier(page);

    const start = Date.now();
    const res = await page.request.post("/api/courier", {
      data: {
        action: "deliver",
        shipmentId: "sample-shipment-id",
        code: "PKG-20261117-0001",
        otp: "1234",
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 400, 404]).toContain(status);

    recordApiTestResult("/api/courier", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });
});
