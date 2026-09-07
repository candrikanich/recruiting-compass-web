import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const REQUIRED_KEYS = [
  "NUXT_PUBLIC_SUPABASE_URL",
  "NUXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NUXT_ADMIN_TOKEN_SECRET",
  "CRON_SECRET",
];

async function loadPlugin(): Promise<() => void> {
  vi.resetModules();
  const mod = await import("~/server/plugins/validate-env");
  return mod.default as unknown as () => void;
}

describe("validate-env plugin", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of [...REQUIRED_KEYS, "RESEND_API_KEY", "VERCEL_ENV"]) {
      savedEnv[key] = process.env[key];
      process.env[key] = "value";
    }
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("boots fine with all required vars set and no RESEND_API_KEY outside production", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.VERCEL_ENV;

    const plugin = await loadPlugin();
    expect(() => plugin()).not.toThrow();
  });

  it("fails boot when a globally-required var is missing, regardless of environment", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const plugin = await loadPlugin();
    expect(() => plugin()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("fails boot when VERCEL_ENV=production and RESEND_API_KEY is missing", async () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.RESEND_API_KEY;

    const plugin = await loadPlugin();
    expect(() => plugin()).toThrow(/RESEND_API_KEY/);
  });

  it("boots fine when VERCEL_ENV=production and RESEND_API_KEY is set", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.RESEND_API_KEY = "re_live_key";

    const plugin = await loadPlugin();
    expect(() => plugin()).not.toThrow();
  });

  it("does not require RESEND_API_KEY in preview/CI/local (VERCEL_ENV unset or non-production)", async () => {
    process.env.VERCEL_ENV = "preview";
    delete process.env.RESEND_API_KEY;

    const plugin = await loadPlugin();
    expect(() => plugin()).not.toThrow();
  });
});
