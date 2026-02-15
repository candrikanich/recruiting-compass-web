import * as Sentry from "@sentry/nuxt";

Sentry.init({
  dsn: process.env.NUXT_PUBLIC_SENTRY_DSN || "",

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.2,

  enableLogs: true,

  debug: process.env.NODE_ENV === "development",
});
