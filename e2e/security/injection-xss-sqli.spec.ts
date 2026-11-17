import { test, expect } from "@playwright/test";

test.describe("Security: Injection Attacks (XSS & SQLi)", () => {
  test("XSS script injection in catalog search query is escaped in the DOM", async ({ page }) => {
    let dialogAppeared = false;
    page.on("dialog", (dialog) => {
      dialogAppeared = true;
      void dialog.dismiss();
    });

    const xssPayload = '<script>alert("XSS")</script>';
    await page.goto(`/shop?q=${encodeURIComponent(xssPayload)}`);

    // Verify script does not execute
    await page.waitForTimeout(500);
    expect(dialogAppeared).toBe(false);

    // Verify search term is rendered as text, not executed as script
    const searchHeader = page.locator("h1");
    if (await searchHeader.isVisible()) {
      const text = await searchHeader.innerText();
      expect(text).toContain(xssPayload);
    }
  });

  test("HTML injection via img onerror payload is neutralized", async ({ page }) => {
    let xssTriggered = false;
    page.on("dialog", () => {
      xssTriggered = true;
    });

    const imgPayload = '"><img src=x onerror=alert(1)>';
    await page.goto(`/shop?q=${encodeURIComponent(imgPayload)}`);

    await page.waitForTimeout(500);
    expect(xssTriggered).toBe(false);
  });

  test("SQL injection attempt in search query does not cause unhandled database error", async ({ page }) => {
    const sqliPayload = "' OR '1'='1' --";
    const response = await page.goto(`/shop?q=${encodeURIComponent(sqliPayload)}`);

    // Must return 200 OK without crashing the server or throwing a 500 error
    expect(response?.status()).toBe(200);

    // Verify page rendered safely
    await expect(page.locator("body")).toBeVisible();
    const bodyContent = await page.content();
    expect(bodyContent).not.toContain("PrismaClientKnownRequestError");
    expect(bodyContent).not.toContain("syntax error at or near");
  });

  test("Union-based SQL injection attempt in search query is safely handled", async ({ page }) => {
    const unionPayload = "' UNION SELECT id, passwordHash, email FROM \"User\" --";
    const response = await page.goto(`/shop?q=${encodeURIComponent(unionPayload)}`);

    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toBeVisible();
    const productCards = page.locator('article, a[href^="/product/"]');
    expect(await productCards.count()).toBe(0);
  });
});
