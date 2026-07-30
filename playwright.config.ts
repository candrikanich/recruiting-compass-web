import { defineConfig, devices } from "@playwright/test";
import { resolve } from "path";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: "html",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 30000, // 30s per test — player auth state cached globally via storageState

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3003",
    trace: "on-first-retry",
    // Every test browser starts pre-authenticated as player.
    // Auth tests (login/signup/password-reset) override with:
    //   test.use({ storageState: undefined });
    storageState: resolve(process.cwd(), "tests/e2e/.auth/player.json"),
  },

  projects: [
    // Always run Chromium
    {
      name: "chromium",
      testIgnore: /cross-account-logout/,
      use: { ...devices["Desktop Chrome"] },
    },
    // cross-account-logout.spec.ts drives a real UI login/logout as the
    // shared player/admin TEST_ACCOUNTS — supabase.auth.signOut() defaults
    // to global scope, which revokes that account's refresh token
    // server-side for every session, not just this test's own browser
    // context. Any other worker concurrently holding a player.json/admin.json
    // storageState session gets bounced mid-test ("session expired" cascade).
    // Isolated into its own project so `npm run test:e2e` (scripts/run-e2e.sh)
    // can run it as a strictly sequential second phase, after the main
    // project fully finishes — never concurrently. NOT wired via Playwright's
    // `dependencies` option: that skips a dependent project entirely if the
    // depended-on project has any failing test, which would silently stop
    // this file from running on unrelated flakes.
    {
      name: "cross-account-logout",
      testMatch: /cross-account-logout/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Only run Firefox/WebKit with FULL_TESTS=1 (not in standard CI — too slow with 1 worker)
    ...(process.env.FULL_TESTS
      ? [
          {
            name: "firefox",
            testIgnore: /cross-account-logout/,
            use: { ...devices["Desktop Firefox"] },
          },
          {
            name: "webkit",
            testIgnore: /cross-account-logout/,
            use: { ...devices["Desktop Safari"] },
          },
        ]
      : []),
  ],

  // Skip local server when BASE_URL points to an external environment (e.g. staging smoke)
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: process.env.CI ? "npm run preview" : "npm run dev",
        url: "http://localhost:3003",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        env: process.env.CI ? { PORT: "3003" } : {},
      },
});
