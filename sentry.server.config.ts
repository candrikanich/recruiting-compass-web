import * as Sentry from "@sentry/nuxt";

Sentry.init({
  dsn: process.env.NUXT_PUBLIC_SENTRY_DSN || "",

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.2,

  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],

  enableLogs: true,

  debug: false,

  beforeSend(event, hint) {
    const err = hint?.originalException as { statusCode?: number } | null;
    const status = err?.statusCode;
    // Drop expected HTTP errors (4xx) — these are intentional responses, not bugs.
    // 5xx errors are unexpected and should still be reported.
    if (status && status >= 400 && status < 500) {
      return null;
    }
    return event;
  },
});
