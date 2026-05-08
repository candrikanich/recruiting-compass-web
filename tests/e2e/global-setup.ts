import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";
import { execSync } from "child_process";
import { config } from "dotenv";
import fs from "fs/promises";
import { resolve } from "path";
import { createTestAccounts } from "./seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "./config/test-accounts";

const AUTH_DIR = resolve(process.cwd(), "tests/e2e/.auth");

// Load .env so Supabase credentials are available in global-setup
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") }); // .env.local overrides

async function globalSetup(_config: FullConfig) {
  console.log("🧪 E2E Global Setup...");

  // Always provision test accounts (idempotent — safe to run every time).
  // Required for CRUD tests: accounts need onboarding_complete + family_unit.
  try {
    console.log("👤 Provisioning test accounts...");
    await createTestAccounts();
    console.log("✅ Test accounts ready");
  } catch (error) {
    console.warn("⚠️  Test account provisioning failed:", error);
    console.warn(
      "   CRUD tests may fail if accounts/onboarding are not set up",
    );
  }

  // Provision storageState for each test account.
  // This allows every test to start pre-authenticated — no per-test login needed.
  const browser = await chromium.launch();
  await fs.mkdir(AUTH_DIR, { recursive: true });
  try {
    for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
      console.log(`🔐 Capturing storageState for ${role}...`);
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        const baseUrl = process.env.BASE_URL || "http://localhost:3003";
        await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });

        // Fill form with blur events (Vue reactive validation requires blur to enable submit)
        await page.locator('input[type="email"]').fill(account.email);
        await page.locator('input[type="email"]').blur();
        await page.locator('input[type="password"]').fill(account.password);
        await page.locator('input[type="password"]').blur();

        // Wait for the submit button to become enabled
        await page
          .locator('[data-testid="login-button"]')
          .waitFor({ state: "visible" });
        await page.waitForFunction(
          () =>
            !document
              .querySelector('[data-testid="login-button"]')
              ?.hasAttribute("disabled"),
        );
        await page.click('[data-testid="login-button"]');
        await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

        await context.storageState({ path: `${AUTH_DIR}/${role}.json` });
        console.log(`  ✅ Saved ${role}.json`);
      } catch (error) {
        console.warn(
          `  ⚠️  Could not capture storageState for ${role}:`,
          error,
        );
        console.warn(
          `     Tests requiring pre-auth for ${role} may fall back to UI login`,
        );
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  // Full database seed (only in CI or when explicitly requested)
  const shouldSeed =
    process.env.CI === "true" || process.env.E2E_SEED === "true";

  if (shouldSeed) {
    console.log("🌱 Seeding test database...");
    try {
      // Fixed command string — not user input, safe to use execSync
      execSync("npm run db:seed:test", { stdio: "inherit" }); // pragma: allowlist secret
    } catch (error) {
      console.error("❌ Database seeding failed:", error);
      // Don't exit - tests can still run with existing data
    }
  } else {
    console.log("⏭️  Skipping full database seed (set E2E_SEED=true to seed)");
  }

  console.log("✅ Global setup complete");
}

export default globalSetup;
