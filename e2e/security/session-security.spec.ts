import { test, expect } from "@playwright/test";
import { loginCustomer, logout } from "../helpers/auth-helper";

test.describe("Security: Session Management & Cookie Hardening", () => {
  test("Session cookie has HttpOnly flag and Lax SameSite policy", async ({ page, context }) => {
    await loginCustomer(page);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "subsel_session");

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite?.toLowerCase()).toBe("lax");
    expect(sessionCookie?.path).toBe("/");
  });

  test("Forged or tampered session token does not grant authenticated access", async ({ page, context }) => {
    // Inject a completely bogus session cookie
    await context.addCookies([
      {
        name: "subsel_session",
        value: "tampered-fake-token-value-1234567890abcdef",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    // Attempt visiting protected customer account page
    await page.goto("/account");
    // System should treat user as unauthenticated and redirect to /login
    await page.waitForURL((url) => url.pathname.includes("/login"));
    expect(page.url()).toContain("/login");
  });

  test("Logging out destroys session and clears cookie", async ({ page, context }) => {
    await loginCustomer(page);
    await logout(page);

    // Verify visiting /account now redirects to login
    await page.goto("/account");
    await page.waitForURL((url) => url.pathname.includes("/login"));
    expect(page.url()).toContain("/login");
  });
});
