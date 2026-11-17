import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false, // Ensure deterministic execution across integration and db state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["list"],
    ["json", { outputFile: "test-results/summary.json" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // 1. Frontend-only mocked test suite
    {
      name: "mock-frontend",
      testDir: "./e2e/mock",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    // 2. Real API & Full-Stack integration suite
    {
      name: "real-desktop",
      testDir: "./e2e/real",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    // 3. Security & Penetration Suite
    {
      name: "security",
      testDir: "./e2e/security",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    // 4. Mobile Android Viewport
    {
      name: "mobile-android",
      testDir: "./e2e/visual-responsive",
      use: {
        ...devices["Pixel 7"],
      },
    },
    // 5. Mobile iPhone Viewport
    {
      name: "mobile-ios",
      testDir: "./e2e/visual-responsive",
      use: {
        ...devices["iPhone 14"],
      },
    },
    // 6. Tablet Viewport
    {
      name: "tablet-ipad",
      testDir: "./e2e/visual-responsive",
      use: {
        ...devices["iPad (gen 7)"],
      },
    },
    // 7. Route API Testing & Swagger Pipeline Suite
    {
      name: "api-tests",
      testDir: "./e2e/api",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
