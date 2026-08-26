import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLimit } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  return { mockLimit };
});

vi.mock("@upstash/ratelimit", () => {
  // Must use a regular function (not arrow) to be newable via `new Ratelimit(...)`
  function MockRatelimit() {
    return { limit: mockLimit };
  }
  MockRatelimit.slidingWindow = vi
    .fn()
    .mockReturnValue("sliding-window-limiter");
  return { Ratelimit: MockRatelimit };
});

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    getRequestIP: vi.fn().mockReturnValue("127.0.0.1"),
    createError: vi
      .fn()
      .mockImplementation((opts) => ({ ...opts, _isH3Error: true })),
  };
});

import {
  rateLimitByIp,
  rateLimitByUser,
  rateLimitByKey,
  throwIfRateLimited,
} from "~/server/utils/rateLimit";
import { getRequestIP, createError } from "h3";

describe("rateLimitByIp", () => {
  beforeEach(() => {
    mockLimit.mockClear();
    vi.mocked(getRequestIP).mockReturnValue("127.0.0.1");
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  it("returns success result when under limit", async () => {
    const now = Date.now();
    mockLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: now + 3600000,
    });

    const result = await rateLimitByIp({} as never, {
      requests: 5,
      window: "1 h",
    });

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("uses IP address as rate limit key", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now(),
    });

    await rateLimitByIp({} as never, { requests: 5, window: "1 h" });

    expect(mockLimit).toHaveBeenCalledWith("127.0.0.1");
  });

  it("falls back to 'unknown' when IP is not available", async () => {
    vi.mocked(getRequestIP).mockReturnValue(undefined);
    mockLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now(),
    });

    await rateLimitByIp({} as never, { requests: 5, window: "1 h" });

    expect(mockLimit).toHaveBeenCalledWith("unknown");
  });
});

describe("rateLimitByUser", () => {
  beforeEach(() => {
    mockLimit.mockClear();
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  it("uses userId as rate limit key", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
    });

    await rateLimitByUser({} as never, "user-abc", {
      requests: 10,
      window: "1 h",
    });

    expect(mockLimit).toHaveBeenCalledWith("user-abc");
  });
});

describe("rateLimitByKey", () => {
  beforeEach(() => {
    mockLimit.mockClear();
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  it("uses caller-supplied key as rate limit key", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now(),
    });

    await rateLimitByKey({} as never, "contact:abc123", {
      requests: 20,
      window: "1 h",
    });

    expect(mockLimit).toHaveBeenCalledWith("contact:abc123");
  });

  it("returns success result when under limit", async () => {
    const now = Date.now();
    mockLimit.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: now + 3600000,
    });

    const result = await rateLimitByKey({} as never, "interest:xyz789", {
      requests: 20,
      window: "1 h",
    });

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(19);
  });

  it("returns BYPASS_RESULT when Upstash env is missing", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await rateLimitByKey({} as never, "contact:abc123", {
      requests: 20,
      window: "1 h",
    });

    expect(result.success).toBe(true);
    expect(result.limit).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.reset).toBe(0);
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it("returns BYPASS_RESULT when limiter throws", async () => {
    mockLimit.mockRejectedValue(new Error("Redis connection failed"));

    const result = await rateLimitByKey({} as never, "contact:abc123", {
      requests: 20,
      window: "1 h",
    });

    expect(result.success).toBe(true);
    expect(result.limit).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.reset).toBe(0);
  });
});

describe("throwIfRateLimited", () => {
  beforeEach(() => {
    vi.mocked(createError).mockImplementation(
      (opts) => ({ ...opts, _isH3Error: true }) as never,
    );
  });

  it("does not throw when success is true", () => {
    expect(() =>
      throwIfRateLimited({ success: true, reset: Date.now() + 60000 }),
    ).not.toThrow();
  });

  it("throws 429 when rate limit exceeded", () => {
    expect(() =>
      throwIfRateLimited({ success: false, reset: Date.now() + 60000 }),
    ).toThrow();

    expect(createError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 429 }),
    );
  });
});
