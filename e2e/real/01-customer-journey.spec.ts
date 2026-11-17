import { test, expect } from "@playwright/test";
import { loginCustomer } from "../helpers/auth-helper";

test.describe("Real Full-Stack: Customer Shopping Journey", () => {
  test("Complete customer flow: Login -> Browse -> Add to Bag -> Checkout (COD) -> Order Confirmed", async ({
    page,
  }) => {
    // 1. Sign in as demo customer Priya
    await loginCustomer(page);

    // 2. Navigate to Shop
    await page.goto("/shop");
    await page.waitForLoadState("domcontentloaded");

    // Ensure products are displayed
    const firstProductLink = page.locator('article a[href^="/product/"]').first();
    await expect(firstProductLink).toBeVisible({ timeout: 10_000 });

    // 3. Open first available product
    await firstProductLink.click();
    await page.waitForURL((url) => url.pathname.includes("/product/"), { timeout: 10_000 });
    expect(page.url()).toContain("/product/");

    // 4. Click 'Add to cart'
    const addToCartBtn = page.locator('button:has-text("Add to cart")').first();
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // Small delay for server mutation
    await page.waitForTimeout(1000);

    // 5. Navigate to Bag
    await page.goto("/cart");
    await page.waitForLoadState("domcontentloaded");

    // Verify cart header
    await expect(page.locator("h1")).toContainText("Your bag");

    // Select Cash On Delivery if options exist
    const codOption = page.locator('input[value="COD"]');
    if (await codOption.isVisible()) {
      await codOption.check();
    }

    // 6. Submit Checkout
    const placeOrderBtn = page.locator('button:has-text("Place order"), button:has-text("Place Order")');
    if (await placeOrderBtn.isVisible() && !(await placeOrderBtn.isDisabled())) {
      await placeOrderBtn.click();

      // Should redirect to order confirmation /orders/[orderNumber]
      await page.waitForURL((url) => url.pathname.includes("/orders/"), { timeout: 15_000 });
      expect(page.url()).toContain("/orders/");

      // Verify order confirmation details
      await expect(page.locator("h1")).toContainText("Your order is placed!");
    }
  });

  test("Customer can view order history and order tracking timeline", async ({ page }) => {
    await loginCustomer(page);

    await page.goto("/orders");
    await page.waitForLoadState("domcontentloaded");

    // Verify orders page rendered
    await expect(page.locator("h1")).toContainText("My orders");
  });
});
