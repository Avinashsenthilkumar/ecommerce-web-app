import { test, expect } from "@playwright/test";
import { SELECTORS } from "../helpers/selectors";
import { DEMO_CREDENTIALS } from "../helpers/auth-helper";

test.describe("Security: Open Redirect Vulnerability Prevention", () => {
  test("Protocol-relative URL //attacker.com is blocked from external redirect", async ({ page }) => {
    await page.goto("/login?next=//attacker.com");

    await page.fill(SELECTORS.auth.emailInput, DEMO_CREDENTIALS.customer.email);
    await page.fill(SELECTORS.auth.passwordInput, DEMO_CREDENTIALS.customer.password);
    await page.click(SELECTORS.auth.submitButton);

    await page.waitForURL((url) => !url.pathname.includes("/login"));

    // Verify browser stayed on localhost and did not redirect to attacker.com
    expect(page.url()).not.toContain("attacker.com");
    expect(new URL(page.url()).hostname).toBe("localhost");
  });

  test("Absolute external URL is blocked on staff login redirect", async ({ page }) => {
    await page.goto("/staff/login?next=https://malicious-external-site.com");

    await page.fill(SELECTORS.auth.emailInput, DEMO_CREDENTIALS.admin.email);
    await page.fill(SELECTORS.auth.passwordInput, DEMO_CREDENTIALS.admin.password);
    await page.click(SELECTORS.auth.submitButton);

    await page.waitForURL((url) => !url.pathname.includes("/login"));

    expect(page.url()).not.toContain("malicious-external-site.com");
    expect(new URL(page.url()).hostname).toBe("localhost");
  });
});
