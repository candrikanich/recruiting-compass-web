import type { FullConfig } from "@playwright/test";
import type { Browser } from "@playwright/test";
import { chromium } from "@playwright/test";
import { execSync } from "child_process";
import { config } from "dotenv";
import fs from "fs/promises";
import { resolve } from "path";
import {
  createTestAccounts,
  getSupabaseAdmin,
  purgeLeakedTestSchools,
} from "./seed/helpers/supabase-admin";
import { mintStorageState } from "./seed/helpers/auth-session";
import { TEST_ACCOUNTS } from "./config/test-accounts";

/** Run `fn`, retrying on failure with linear backoff. Returns on first success. */
async function withRetry<T>(
  label: string,
  attempts: number,
  fn: (attempt: number) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`  ⚠️  ${label} attempt ${attempt}/${attempts} failed: ${msg}`);
      if (attempt < attempts) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }
  throw lastError;
}

/**
 * Fallback path: capture storageState by driving the real /login UI.
 * Only used if direct token minting fails. Kept because it exercises the same
 * code path a user does, so it catches login-flow regressions the mint path
 * would silently skip.
 */
async function captureViaUi(
  browser: Browser,
  baseUrl: string,
  email: string,
  password: string,
  outPath: string,
): Promise<void> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
    // Wait for hydration to settle so the click hits a wired-up handler,
    // not a static pre-hydration form that would native-submit and reload.
    await page.waitForLoadState("networkidle");

    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="email"]').blur();
    await page.locator('input[type="password"]').fill(password);
    await page.locator('input[type="password"]').blur();

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

    await context.storageState({ path: outPath });
  } finally {
    await context.close();
  }
}

const AUTH_DIR = resolve(process.cwd(), "tests/e2e/.auth");

// Load .env so Supabase credentials are available in global-setup
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") }); // .env.local overrides

async function globalSetup(_config: FullConfig) {
  console.log("🧪 E2E Global Setup...");

  // Fail fast on Node < 22. The Supabase client requires a native global
  // WebSocket (added in Node 22); on Node 20 it throws during server auth,
  // surfacing as confusing 401s on every request rather than a clear cause.
  // CI pins Node 24 (.nvmrc); this guard protects local runs.
  if (typeof globalThis.WebSocket === "undefined") {
    throw new Error(
      `E2E requires Node >= 22 (native WebSocket). Detected ${process.version}. ` +
        `Run \`nvm use\` (see .nvmrc) then retry.`,
    );
  }

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

  // Sweep up schools leaked by suites that create-without-teardown. Left
  // unchecked these accumulate (hit 712 once) and bloat the dashboard.
  try {
    const purged = await purgeLeakedTestSchools(getSupabaseAdmin());
    if (purged > 0) console.log(`🧹 Purged ${purged} leaked test school(s)`);
  } catch (error) {
    console.warn("⚠️  Leaked-school purge failed (non-fatal):", error);
  }

  // Provision storageState for each test account so every test starts
  // pre-authenticated — no per-test login needed.
  //
  // Primary path mints the session token directly via the Supabase password
  // grant (server-side, no browser) and writes the storageState file. This is
  // deterministic and fast. If minting fails, we fall back to driving the real
  // /login UI. Each path is retried. If an account still can't be provisioned,
  // we throw to abort the run — continuing with stale/empty storageState
  // produces 30-minute hangs as every test 401s on Supabase.
  const baseUrl = process.env.BASE_URL || "http://localhost:3003";
  const browser = await chromium.launch();
  await fs.mkdir(AUTH_DIR, { recursive: true });
  const failures: { role: string; error: unknown }[] = [];
  try {
    for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
      const outPath = `${AUTH_DIR}/${role}.json`;
      console.log(`🔐 Provisioning storageState for ${role}...`);
      try {
        await withRetry(`mint ${role}`, 3, async () => {
          const state = await mintStorageState(
            baseUrl,
            account.email,
            account.password,
          );
          await fs.writeFile(outPath, JSON.stringify(state));
        });
        console.log(`  ✅ Minted ${role}.json`);
      } catch (mintError) {
        const msg =
          mintError instanceof Error ? mintError.message : String(mintError);
        console.warn(
          `  ↪︎ mint failed for ${role} (${msg}); falling back to UI login`,
        );
        try {
          await withRetry(`UI login ${role}`, 2, () =>
            captureViaUi(
              browser,
              baseUrl,
              account.email,
              account.password,
              outPath,
            ),
          );
          console.log(`  ✅ Saved ${role}.json (UI fallback)`);
        } catch (uiError) {
          console.error(`  ❌ Failed to provision ${role}:`, uiError);
          failures.push({ role, error: uiError });
        }
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    const roles = failures.map((f) => f.role).join(", ");
    throw new Error(
      `globalSetup: failed to provision storageState for ${failures.length} account(s): ${roles}. ` +
        `Aborting to avoid a full test run with stale auth — the silent fall-through has caused 30-minute CI hangs in the past.`,
    );
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
