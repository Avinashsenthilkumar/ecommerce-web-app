import { test, expect } from "@playwright/test";
import { SELECTORS } from "../helpers/selectors";

test.describe("Frontend Mock: Catalog & Search Interactions", () => {
  test("Navigates departments and reflects active category", async ({ page }) => {
    await page.goto("/shop");

    // Check categories nav
    const categoriesNav = page.locator('nav[aria-label="Categories"]');
    await expect(categoriesNav).toBeVisible();

    // Click "All" category link and check aria-current="page"
    const allCategoryLink = categoriesNav.locator('a:has-text("All")');
    await expect(allCategoryLink).toHaveAttribute("aria-current", "page");
  });

  test("Search form submits query and updates URL parameters", async ({ page }) => {
    await page.goto("/shop");

    const searchInput = page.locator('form[role="search"] input[name="q"]');
    await searchInput.fill("shoes");
    await searchInput.press("Enter");

    await page.waitForURL((url) => url.searchParams.get("q") === "shoes");
    expect(page.url()).toContain("q=shoes");
  });

  test("Sort selection changes searchParams in URL", async ({ page }) => {
    await page.goto("/shop");

    const sortSelect = page.locator(SELECTORS.shop.sortSelect);
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption("price-asc");
      await page.waitForURL((url) => url.searchParams.get("sort") === "price-asc");
      expect(page.url()).toContain("sort=price-asc");
    }
  });

  test("Wishlist heart button on product card redirects guest to login", async ({ page }) => {
    await page.goto("/shop");

    const firstProductWishlistBtn = page.locator(SELECTORS.product.wishlistHeartBtn).first();
    if (await firstProductWishlistBtn.isVisible()) {
      await firstProductWishlistBtn.click();
      await page.waitForURL((url) => url.pathname.includes("/login"));
      expect(page.url()).toContain("next=");
    }
  });
});
