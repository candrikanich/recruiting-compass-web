import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// #914: this middleware moved from an in-memory Map (per-instance, doesn't
// share state across concurrent Vercel function instances) to the same
// Upstash-backed limiter server/utils/rateLimit.ts's rateLimitByIp/
// rateLimitByUser already use. These tests prove the middleware calls
// through to that shared limiter rather than reintroducing local state.
const { mockLimit } = vi.hoisted(() => ({ mockLimit: vi.fn() }));

vi.mock("@upstash/ratelimit", () => {
  function MockRatelimit() {
    return { limit: mockLimit };
  }
  MockRatelimit.slidingWindow = vi.fn().mockReturnValue("sliding-window");
  return { Ratelimit: MockRatelimit };
});

vi.mock("@upstash/redis", () => ({ Redis: vi.fn() }));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.stubGlobal("defineEventHandler", (fn: unknown) => fn);
vi.stubGlobal(
  "createError",
  (opts: Record<string, unknown>) => ({ ...opts, _isH3Error: true }),
);

const headers: Record<string, unknown> = {};
vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    setHeader: vi.fn((_event: unknown, name: string, value: unknown) => {
      headers[name] = value;
    }),
    getHeader: vi.fn(() => undefined),
    getCookie: vi.fn(() => undefined),
  };
});

const { default: rateLimitMiddleware } = await import(
  "~/server/middleware/rate-limit"
);

function fakeEvent(path: string) {
  return {
    path,
    node: { req: { socket: { remoteAddress: "127.0.0.1" } } },
  } as never;
}

describe("rate-limit middleware (#914)", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockLimit.mockClear();
    for (const key of Object.keys(headers)) delete headers[key];
    process.env.NODE_ENV = "production";
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("is a no-op outside production (no limiter call)", async () => {
    process.env.NODE_ENV = "test";
    await rateLimitMiddleware(fakeEvent("/api/auth/signup"));
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it("calls the shared Upstash limiter, not local state, for an auth-path request", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60000,
    });

    await rateLimitMiddleware(fakeEvent("/api/auth/signup"));

    expect(mockLimit).toHaveBeenCalledTimes(1);
    expect(headers["X-RateLimit-Limit"]).toBe("5");
  });

  it("uses the looser api-path limit for a non-auth API route", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });

    await rateLimitMiddleware(fakeEvent("/api/schools"));

    expect(headers["X-RateLimit-Limit"]).toBe("60");
  });

  it("throws 429 when the shared limiter reports exceeded", async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 30000,
    });

    await expect(
      rateLimitMiddleware(fakeEvent("/api/auth/signup")),
    ).rejects.toMatchObject({ statusCode: 429 });
  });
});
