/**
 * Nitro plugin for Sentry server-side context
 *
 * Adds request context (correlation ID, user, path) to Sentry scope
 * for every incoming request.
 */

import * as Sentry from "@sentry/nuxt";
import { getHeader } from "h3";
import type { H3Event } from "h3";

export default defineNitroPlugin((nitroApp) => {
  // Only run if Sentry is configured
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  nitroApp.hooks.hook("request", (event) => {
    // Set up Sentry scope for this request
    Sentry.withScope((scope) => {
      // Add correlation ID
      const requestId = event.context.requestId as string | undefined;
      if (requestId) {
        scope.setTag("correlation_id", requestId);
        scope.setContext("request", {
          request_id: requestId,
          path: event.path,
          method: event.method,
        });
      }

      // Add user context if available
      const user = event.context.user as
        | { id: string; email?: string }
        | undefined;
      if (user) {
        scope.setUser({
          id: user.id,
          email: user.email,
          ip_address: getClientIP(event),
        });
      }

      // Add URL as tag for filtering
      scope.setTag("path", event.path);
      scope.setTag("method", event.method);
    });
  });

  // Capture Nitro errors
  nitroApp.hooks.hook("error", (error, { event }) => {
    Sentry.withScope((scope) => {
      // Add request context
      if (event) {
        const requestId = event.context.requestId as string | undefined;
        if (requestId) {
          scope.setTag("correlation_id", requestId);
        }

        scope.setContext("request", {
          path: event.path,
          method: event.method,
          request_id: requestId,
        });

        const user = event.context.user as
          | { id: string; email?: string }
          | undefined;
        if (user) {
          scope.setUser({
            id: user.id,
            email: user.email,
          });
        }
      }

      // Capture the error
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(String(error), "error");
      }
    });
  });
});

/**
 * Get client IP from request
 */
function getClientIP(event: H3Event): string {
  const forwarded = getHeader(event, "x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return event.node.req.socket.remoteAddress || "unknown";
}
