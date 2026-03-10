import type { FullConfig } from "@playwright/test";
import { execSync } from "child_process";
import { config } from "dotenv";
import { resolve } from "path";
import { createTestAccounts } from "./seed/helpers/supabase-admin";

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
    console.warn("   CRUD tests may fail if accounts/onboarding are not set up");
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
