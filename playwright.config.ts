import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalSetup: "./tests/e2e/global-setup.ts",

  use: {
    baseURL: "http://localhost:3003",
    trace: "on-first-retry",
  },

  projects: [
    // Always run Chromium
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // Only run Firefox/WebKit in CI (or with FULL_TESTS=1)
    ...(process.env.CI || process.env.FULL_TESTS
      ? [
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
          },
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
          },
        ]
      : []),
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3003",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
