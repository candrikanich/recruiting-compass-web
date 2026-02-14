/**
 * Sentry Server Configuration
 *
 * Captures server-side errors with request context.
 * @see https://docs.sentry.io/platforms/javascript/guides/nuxt/
 */

import * as Sentry from "@sentry/nuxt";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    // Environment
    environment: process.env.NODE_ENV || "development",

    // Release tracking
    release: process.env.COMMIT_SHA || process.env.npm_package_version,

    // Sample rates
    tracesSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Enable profiling for performance insights
    profilesSampleRate: 0.1,

    // Before sending, add request context
    beforeSend(event) {
      // Add request context from current event
      // Note: In Nitro, we need to access via AsyncLocalStorage or similar
      // For now, we rely on the Nitro plugin to set context
      return event;
    },

    // Configure scope for server context
    initialScope: {
      tags: {
        runtime: "server",
        node_version: process.version,
      },
    },
  });
} else {
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[Sentry] SENTRY_DSN not set - server-side error tracking disabled",
    );
  }
}
