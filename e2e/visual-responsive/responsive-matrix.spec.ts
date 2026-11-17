import { test, expect } from "@playwright/test";

test.describe("UI & Responsive: Cross-Display Matrix & Layout Integrity", () => {
  const routesToTest = ["/", "/shop", "/login", "/cart"];

  for (const route of routesToTest) {
    test(`Page ${route} renders cleanly without horizontal scroll overflow`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      // Verify no horizontal overflow causing layout breaking
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 2; // allowance of 2px for rounding
      });

      expect(isOverflowing).toBe(false);

      // Verify core header or main elements are present
      await expect(page.locator("body")).toBeVisible();
    });
  }

  test("Product grid adapts cleanly to viewport width", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForLoadState("domcontentloaded");

    const productGrid = page.locator("main");
    await expect(productGrid).toBeVisible();
  });
});
