/**
 * Nitro plugin for Sentry server-side context
 *
 * Adds request context (correlation ID, user, path) to the isolation scope
 * for every incoming request so later captures in the same request inherit it.
 */

import * as Sentry from "@sentry/nuxt";
import { getHeader } from "h3";
import type { H3Event } from "h3";
import {
  applySentryRequestContext,
  isSentryConfigured,
  resolveClientIp,
} from "~/server/utils/sentryContext";

export default defineNitroPlugin((nitroApp) => {
  // Match SDK init: NUXT_PUBLIC_SENTRY_DSN (documented) or SENTRY_DSN.
  if (!isSentryConfigured()) {
    return;
  }

  nitroApp.hooks.hook("request", (event) => {
    // Isolation scope lives for the request. withScope() would clone+discard
    // and the tags would never appear on later captureException calls.
    applySentryRequestContext(Sentry.getIsolationScope(), {
      requestId: event.context.requestId as string | undefined,
      path: event.path,
      method: event.method,
      user: event.context.user as { id: string; email?: string } | undefined,
      ip: getClientIP(event),
    });
  });

  // Capture Nitro errors
  nitroApp.hooks.hook("error", (error, { event }) => {
    Sentry.withScope((scope) => {
      if (event) {
        applySentryRequestContext(scope, {
          requestId: event.context.requestId as string | undefined,
          path: event.path,
          method: event.method,
          user: event.context.user as
            { id: string; email?: string } | undefined,
        });
      }

      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(String(error), "error");
      }
    });
  });
});

function getClientIP(event: H3Event): string {
  return resolveClientIp(
    getHeader(event, "x-forwarded-for"),
    event.node.req.socket.remoteAddress,
  );
}
