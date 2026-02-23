/**
 * Startup environment variable validation
 *
 * Fails fast at server boot if any required env vars are missing or empty.
 * Prevents silent failures in production where missing secrets cause
 * undefined behavior (e.g., empty admin token secret accepts any value).
 */

export default defineNitroPlugin(() => {
  const required: Record<string, string> = {
    NUXT_PUBLIC_SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL ?? "",
    NUXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    NUXT_ADMIN_TOKEN_SECRET: process.env.NUXT_ADMIN_TOKEN_SECRET ?? "",
    CRON_SECRET: process.env.CRON_SECRET ?? "",
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `[startup] Missing required environment variables: ${missing.join(", ")}`,
    );
  }
});
