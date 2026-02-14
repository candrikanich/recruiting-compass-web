/**
 * Sentry Client Configuration
 *
 * Captures client-side errors with correlation IDs for distributed tracing.
 * @see https://docs.sentry.io/platforms/javascript/guides/nuxt/
 */

import * as Sentry from "@sentry/nuxt";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    // Environment
    environment: process.env.NODE_ENV || "development",

    // Release tracking (if available)
    release: process.env.COMMIT_SHA || process.env.npm_package_version,

    // Sample rates
    tracesSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0, // 10% in prod
    replaysSessionSampleRate: 0.1, // Session replay sampling
    replaysOnErrorSampleRate: 1.0, // Always replay on error

    // Performance monitoring
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Before sending, add correlation context
    beforeSend(event) {
      // Add correlation ID from session storage
      if (typeof window !== "undefined") {
        const correlationId = sessionStorage.getItem("correlation-id");
        if (correlationId) {
          event.tags = {
            ...event.tags,
            correlation_id: correlationId,
          };
        }
      }

      // Add URL path as tag for easier filtering
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          event.tags = {
            ...event.tags,
            path: url.pathname,
          };
        } catch {
          // Invalid URL, skip
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Network errors
      "Network Error",
      "Failed to fetch",
      "Network request failed",
      // Vue specific
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed",
      // Browser extensions
      "chrome-extension",
      "webkit-masked-url",
    ],

    // Deny URLs from browser extensions
    denyUrls: [
      /^chrome-extension:/,
      /^moz-extension:/,
      /^safari-extension:/,
    ],
  });
} else {
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[Sentry] SENTRY_DSN not set - client-side error tracking disabled",
    );
  }
}
