import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockLimit } = vi.hoisted(() => {
  const mockLimit = vi.fn()
  return { mockLimit }
})

vi.mock("@upstash/ratelimit", () => {
  // Must use a regular function (not arrow) to be newable via `new Ratelimit(...)`
  function MockRatelimit() {
    return { limit: mockLimit }
  }
  MockRatelimit.slidingWindow = vi.fn().mockReturnValue("sliding-window-limiter")
  return { Ratelimit: MockRatelimit }
})

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: vi.fn().mockReturnValue({}),
  },
}))

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>()
  return {
    ...actual,
    getRequestIP: vi.fn().mockReturnValue("127.0.0.1"),
    createError: vi.fn().mockImplementation((opts) => ({ ...opts, _isH3Error: true })),
  }
})

import { rateLimitByIp, rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit"
import { getRequestIP, createError } from "h3"

describe("rateLimitByIp", () => {
  beforeEach(() => {
    mockLimit.mockClear()
    vi.mocked(getRequestIP).mockReturnValue("127.0.0.1")
  })

  it("returns success result when under limit", async () => {
    const now = Date.now()
    mockLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: now + 3600000 })

    const result = await rateLimitByIp({} as never, { requests: 5, window: "1 h" })

    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it("uses IP address as rate limit key", async () => {
    mockLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() })

    await rateLimitByIp({} as never, { requests: 5, window: "1 h" })

    expect(mockLimit).toHaveBeenCalledWith("127.0.0.1")
  })

  it("falls back to 'unknown' when IP is not available", async () => {
    vi.mocked(getRequestIP).mockReturnValue(undefined)
    mockLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() })

    await rateLimitByIp({} as never, { requests: 5, window: "1 h" })

    expect(mockLimit).toHaveBeenCalledWith("unknown")
  })
})

describe("rateLimitByUser", () => {
  beforeEach(() => {
    mockLimit.mockClear()
  })

  it("uses userId as rate limit key", async () => {
    mockLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() })

    await rateLimitByUser({} as never, "user-abc", { requests: 10, window: "1 h" })

    expect(mockLimit).toHaveBeenCalledWith("user-abc")
  })
})

describe("throwIfRateLimited", () => {
  beforeEach(() => {
    vi.mocked(createError).mockImplementation((opts) => ({ ...opts, _isH3Error: true } as never))
  })

  it("does not throw when success is true", () => {
    expect(() =>
      throwIfRateLimited({ success: true, reset: Date.now() + 60000 }),
    ).not.toThrow()
  })

  it("throws 429 when rate limit exceeded", () => {
    expect(() =>
      throwIfRateLimited({ success: false, reset: Date.now() + 60000 }),
    ).toThrow()

    expect(createError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 429 }),
    )
  })
})
