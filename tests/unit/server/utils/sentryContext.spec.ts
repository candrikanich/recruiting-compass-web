import { describe, it, expect, afterEach } from "vitest";
import {
  resolveSentryDsn,
  isSentryConfigured,
  shouldCaptureInSentry,
  resolveClientIp,
  applySentryRequestContext,
  type SentryScopeLike,
} from "~/server/utils/sentryContext";

function mockScope(): SentryScopeLike & {
  tags: Record<string, string>;
  contexts: Record<string, Record<string, unknown>>;
  user: Record<string, unknown> | null;
} {
  const tags: Record<string, string> = {};
  const contexts: Record<string, Record<string, unknown>> = {};
  let user: Record<string, unknown> | null = null;
  return {
    tags,
    contexts,
    get user() {
      return user;
    },
    setTag(key, value) {
      tags[key] = value;
    },
    setContext(name, context) {
      contexts[name] = context;
    },
    setUser(next) {
      user = next;
    },
  };
}

describe("resolveSentryDsn", () => {
  const originalPublic = process.env.NUXT_PUBLIC_SENTRY_DSN;
  const originalPrivate = process.env.SENTRY_DSN;

  afterEach(() => {
    if (originalPublic === undefined) delete process.env.NUXT_PUBLIC_SENTRY_DSN;
    else process.env.NUXT_PUBLIC_SENTRY_DSN = originalPublic;
    if (originalPrivate === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = originalPrivate;
  });

  it("prefers NUXT_PUBLIC_SENTRY_DSN (the documented / client name)", () => {
    process.env.NUXT_PUBLIC_SENTRY_DSN = "https://public@o.ingest.sentry.io/1";
    process.env.SENTRY_DSN = "https://private@o.ingest.sentry.io/2";
    expect(resolveSentryDsn()).toBe("https://public@o.ingest.sentry.io/1");
  });

  it("falls back to SENTRY_DSN when the public var is unset", () => {
    delete process.env.NUXT_PUBLIC_SENTRY_DSN;
    process.env.SENTRY_DSN = "https://private@o.ingest.sentry.io/2";
    expect(resolveSentryDsn()).toBe("https://private@o.ingest.sentry.io/2");
  });

  it("treats whitespace-only values as unset and falls through", () => {
    process.env.NUXT_PUBLIC_SENTRY_DSN = "   ";
    process.env.SENTRY_DSN = " https://private@o.ingest.sentry.io/2 ";
    expect(resolveSentryDsn()).toBe("https://private@o.ingest.sentry.io/2");
  });

  it("returns empty string when neither var is set", () => {
    delete process.env.NUXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    expect(resolveSentryDsn()).toBe("");
    expect(isSentryConfigured()).toBe(false);
  });
});

describe("shouldCaptureInSentry", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalPublic = process.env.NUXT_PUBLIC_SENTRY_DSN;
  const originalPrivate = process.env.SENTRY_DSN;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalPublic === undefined) delete process.env.NUXT_PUBLIC_SENTRY_DSN;
    else process.env.NUXT_PUBLIC_SENTRY_DSN = originalPublic;
    if (originalPrivate === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = originalPrivate;
  });

  it("is true in production when the public DSN is set (SENTRY_DSN unset)", () => {
    process.env.NODE_ENV = "production";
    process.env.NUXT_PUBLIC_SENTRY_DSN = "https://public@o.ingest.sentry.io/1";
    delete process.env.SENTRY_DSN;
    expect(shouldCaptureInSentry()).toBe(true);
  });

  it("is false in development even with a DSN (avoid local noise)", () => {
    process.env.NODE_ENV = "development";
    process.env.NUXT_PUBLIC_SENTRY_DSN = "https://public@o.ingest.sentry.io/1";
    expect(shouldCaptureInSentry()).toBe(false);
  });

  it("is false in production with no DSN", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NUXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    expect(shouldCaptureInSentry()).toBe(false);
  });
});

describe("resolveClientIp", () => {
  it("uses the leftmost X-Forwarded-For hop", () => {
    expect(resolveClientIp("1.1.1.1, 2.2.2.2", "9.9.9.9")).toBe("1.1.1.1");
  });

  it("falls back to the socket address when the header is missing", () => {
    expect(resolveClientIp(undefined, "9.9.9.9")).toBe("9.9.9.9");
  });

  it("returns unknown when both are missing", () => {
    expect(resolveClientIp(undefined, undefined)).toBe("unknown");
  });

  it("skips an empty first hop and uses the next one", () => {
    expect(resolveClientIp("  , 2.2.2.2", "9.9.9.9")).toBe("2.2.2.2");
  });
});

describe("applySentryRequestContext", () => {
  it("persists tags/context/user on the provided scope (isolation-scope contract)", () => {
    const scope = mockScope();
    applySentryRequestContext(scope, {
      requestId: "req-1",
      path: "/api/schools",
      method: "GET",
      user: { id: "user-1", email: "a@b.com" },
      ip: "1.1.1.1",
    });

    expect(scope.tags).toEqual({
      correlation_id: "req-1",
      path: "/api/schools",
      method: "GET",
    });
    expect(scope.contexts.request).toEqual({
      request_id: "req-1",
      path: "/api/schools",
      method: "GET",
    });
    expect(scope.user).toEqual({
      id: "user-1",
      email: "a@b.com",
      ip_address: "1.1.1.1",
    });
  });

  it("does not set user when unauthenticated", () => {
    const scope = mockScope();
    applySentryRequestContext(scope, {
      path: "/login",
      method: "POST",
    });
    expect(scope.user).toBeNull();
    expect(scope.tags.path).toBe("/login");
  });

  it("is a no-op on an empty context", () => {
    const scope = mockScope();
    applySentryRequestContext(scope, {});
    expect(scope.tags).toEqual({});
    expect(scope.contexts).toEqual({});
    expect(scope.user).toBeNull();
  });
});
