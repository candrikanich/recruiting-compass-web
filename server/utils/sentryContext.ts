/**
 * Shared Sentry helpers for server capture + request context.
 *
 * Two production bugs this module exists to prevent:
 * 1. DSN name mismatch — SDK init reads NUXT_PUBLIC_SENTRY_DSN (the only
 *    name in .env.example), but the Nitro plugin and errorHandler used to
 *    gate on SENTRY_DSN. When only the documented var is set, handled errors
 *    never reach Sentry and request tags never attach.
 * 2. withScope in a request hook — Sentry.withScope clones a scope, runs the
 *    callback, then discards it. Setting tags there does not persist for
 *    later captures. Request context must go on the isolation scope.
 */

export interface SentryScopeLike {
  setTag: (key: string, value: string) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
  setUser: (user: { id: string; email?: string; ip_address?: string }) => void;
}

export interface SentryRequestContext {
  requestId?: string;
  path?: string;
  method?: string;
  user?: { id: string; email?: string };
  ip?: string;
}

/**
 * Resolve the Sentry DSN from either accepted env name.
 * Prefers NUXT_PUBLIC_SENTRY_DSN (documented, used by the client SDK).
 */
export function resolveSentryDsn(): string {
  return (
    process.env.NUXT_PUBLIC_SENTRY_DSN?.trim() ||
    process.env.SENTRY_DSN?.trim() ||
    ""
  );
}

export function isSentryConfigured(): boolean {
  return resolveSentryDsn().length > 0;
}

/** Handled-error capture is production-only so local/dev noise stays out. */
export function shouldCaptureInSentry(): boolean {
  return process.env.NODE_ENV === "production" && isSentryConfigured();
}

/**
 * Leftmost X-Forwarded-For hop, falling back to the socket address.
 * Used only as Sentry user context, not as an auth decision.
 */
export function resolveClientIp(
  forwardedFor: string | undefined,
  socketAddress: string | undefined,
): string {
  if (forwardedFor) {
    for (const hop of forwardedFor.split(",")) {
      const ip = hop.trim();
      if (ip) return ip;
    }
  }
  return socketAddress || "unknown";
}

/**
 * Attach request/user tags to a *persistent* scope (isolation or current).
 * Do not pass a withScope callback scope — that clone is discarded.
 */
export function applySentryRequestContext(
  scope: SentryScopeLike,
  ctx: SentryRequestContext,
): void {
  if (ctx.requestId) {
    scope.setTag("correlation_id", ctx.requestId);
  }
  if (ctx.path) {
    scope.setTag("path", ctx.path);
  }
  if (ctx.method) {
    scope.setTag("method", ctx.method);
  }

  if (ctx.requestId || ctx.path || ctx.method) {
    scope.setContext("request", {
      request_id: ctx.requestId,
      path: ctx.path,
      method: ctx.method,
    });
  }

  if (ctx.user) {
    scope.setUser({
      id: ctx.user.id,
      email: ctx.user.email,
      ip_address: ctx.ip,
    });
  }
}
