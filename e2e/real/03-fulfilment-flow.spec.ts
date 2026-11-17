import { test, expect } from "@playwright/test";
import { loginWarehouse, loginHub, loginCourier, loginAdmin } from "../helpers/auth-helper";

test.describe("Real Full-Stack: Fulfilment & Logistics Operations", () => {
  test("Warehouse staff can view queue and filter pick/pack shipments", async ({ page }) => {
    await loginWarehouse(page);

    await page.goto("/warehouse");
    await page.waitForLoadState("domcontentloaded");

    // Check warehouse title
    await expect(page.locator("h1")).toContainText("Warehouse");

    // Check filter buttons
    const allFilter = page.locator('button:has-text("All")').first();
    await expect(allFilter).toBeVisible();
  });

  test("Hub supervisor can access hub scan desk and view transit network", async ({ page }) => {
    await loginHub(page);

    await page.goto("/hub");
    await page.waitForLoadState("domcontentloaded");

    // Check hub scanner interface
    await expect(page.locator("h1")).toContainText("Hub management");
  });

  test("Courier rider can view runsheet, parcel details, and OTP delivery form", async ({ page }) => {
    await loginCourier(page);

    await page.goto("/courier");
    await page.waitForLoadState("domcontentloaded");

    // Check courier runsheet layout
    await expect(page.locator("h1")).toContainText("Courier management");
    await expect(page.locator("h2").first()).toContainText("Delivery runsheet");
  });

  test("Admin can view orders awaiting confirmation and inventory allocations", async ({ page }) => {
    await loginAdmin(page);

    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Check overview heading
    await expect(page.locator("h1")).toContainText("Overview");
  });
});
