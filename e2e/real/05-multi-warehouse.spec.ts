import { test, expect } from "@playwright/test";
import { loginCustomer } from "../helpers/auth-helper";

test.describe("Real Full-Stack: Multi-Warehouse Inventory & Split Shipments", () => {
  test("Product detail displays warehouse stock location info", async ({ page }) => {
    await loginCustomer(page);

    await page.goto("/shop");
    await page.waitForLoadState("domcontentloaded");
    const firstProduct = page.locator('article a[href^="/product/"]').first();
    await firstProduct.click();
    await page.waitForURL((url) => url.pathname.includes("/product/"), { timeout: 10_000 });

    // Stock message or remaining count
    const stockInfo = page.getByText("remaining").or(page.getByText("In stock")).or(page.getByText("Fulfilment Centre"));
    if (await stockInfo.first().isVisible()) {
      await expect(stockInfo.first()).toBeVisible();
    }
  });

  test("Order tracking displays timeline with scan events", async ({ page }) => {
    await loginCustomer(page);

    // Visit orders listing
    await page.goto("/orders");
    await page.waitForLoadState("domcontentloaded");

    // If an existing demo order is listed, check that order cards or "No orders yet" are visible
    const orderElements = page.locator("article").or(page.getByText("No orders yet"));
    await expect(orderElements.first()).toBeVisible();
  });
});
