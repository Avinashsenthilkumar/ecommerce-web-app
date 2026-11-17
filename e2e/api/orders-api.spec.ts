import { test, expect } from "@playwright/test";
import { recordApiTestResult } from "./swagger-enricher";
import { loginCustomer } from "../helpers/auth-helper";

test.describe("API: Orders & Checkout (/api/orders/*)", () => {
  let sampleOrderNumber: string | null = null;

  test("GET /api/orders - List customer orders", async ({ page }) => {
    await loginCustomer(page);

    const start = Date.now();
    const res = await page.request.get("/api/orders");
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0) {
      sampleOrderNumber = body.data[0].orderNumber;
    }

    recordApiTestResult("/api/orders", "get", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/orders - Place order from cart", async ({ page }) => {
    await loginCustomer(page);

    // Ensure item in cart
    const prodRes = await page.request.get("/api/products?page=1");
    const prodJson = await prodRes.json();
    const list = Array.isArray(prodJson?.data) ? prodJson.data : prodJson?.data?.products || [];
    const variantId = list?.[0]?.variants?.[0]?.id || "cmv5qiswp002d3gk2nrgelg9s";
    await page.request.post("/api/cart", {
      data: { variantId, quantity: 1 },
    });

    const start = Date.now();
    const res = await page.request.post("/api/orders", {
      headers: { "Idempotency-Key": crypto.randomUUID() },
      data: {
        address: {
          name: "Priya Narayanan",
          phone: "9840012345",
          line1: "14, 3rd Cross Street",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600042",
        },
        paymentMethod: "COD",
      },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect([200, 400, 409]).toContain(status);
    if (status === 200) {
      expect(body.ok).toBe(true);
      sampleOrderNumber = body.data.orderNumber;
    }

    recordApiTestResult("/api/orders", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/orders - Retry with the same idempotency key returns the original payment", async ({ page }) => {
    await loginCustomer(page);

    const prodRes = await page.request.get("/api/products?page=1");
    const prodJson = await prodRes.json();
    const list = Array.isArray(prodJson?.data) ? prodJson.data : prodJson?.data?.products || [];
    const variantId = list?.[0]?.variants?.[0]?.id;
    expect(variantId).toBeTruthy();
    await page.request.post("/api/cart", {
      data: { variantId, quantity: 1 },
    });

    const idempotencyKey = crypto.randomUUID();
    const request = () =>
      page.request.post("/api/orders", {
        headers: { "Idempotency-Key": idempotencyKey },
        data: {
          address: {
            name: "Priya Narayanan",
            phone: "9840012345",
            line1: "14, 3rd Cross Street",
            city: "Chennai",
            state: "Tamil Nadu",
            pincode: "600042",
          },
          paymentMethod: "UPI",
        },
      });

    const [first, retry] = await Promise.all([request(), request()]);
    expect(first.status()).toBe(200);
    expect(retry.status()).toBe(200);
    const [firstBody, retryBody] = await Promise.all([first.json(), retry.json()]);
    expect(firstBody.ok).toBe(true);
    expect(retryBody.data.orderNumber).toBe(firstBody.data.orderNumber);

    const detail = await page.request.get(`/api/orders/${firstBody.data.orderNumber}`);
    const detailBody = await detail.json();
    expect(detailBody.data.payments.filter((payment: { status: string }) => payment.status === "SUCCESS")).toHaveLength(1);
  });

  test("GET /api/orders/{orderNumber} - Retrieve order details", async ({ page }) => {
    await loginCustomer(page);

    if (!sampleOrderNumber) {
      const ordersRes = await page.request.get("/api/orders");
      const ordersJson = await ordersRes.json();
      sampleOrderNumber = ordersJson.data?.[0]?.orderNumber;
    }

    if (!sampleOrderNumber) {
      test.skip();
      return;
    }

    const start = Date.now();
    const res = await page.request.get(`/api/orders/${sampleOrderNumber}`);
    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    recordApiTestResult("/api/orders/{orderNumber}", "get", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });

  test("POST /api/orders/{orderNumber}/cancel - Cancel order", async ({ page }) => {
    await loginCustomer(page);

    if (!sampleOrderNumber) {
      test.skip();
      return;
    }

    const start = Date.now();
    const res = await page.request.post(`/api/orders/${sampleOrderNumber}/cancel`, {
      data: { reason: "Changed mind" },
    });

    const status = res.status();
    const body = await res.json().catch(() => ({}));
    const duration = Date.now() - start;

    // Cancellation is allowed if unallocated (200), or rejected with 400/409 if already allocated/shipped
    expect([200, 400, 409]).toContain(status);

    recordApiTestResult("/api/orders/{orderNumber}/cancel", "post", {
      status,
      durationMs: duration,
      responseBody: body,
    });
  });
});
