import { describe, it, expect, vi, beforeEach } from "vitest"
import { createError } from "h3"

const mockRateLimitState = {
  success: true as boolean,
  limit: 10,
  remaining: 9,
  reset: Date.now() + 3_600_000,
}

vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByIp: vi.fn(async () => ({ ...mockRateLimitState })),
  throwIfRateLimited: vi.fn((result: { success: boolean; reset: number }) => {
    if (!result.success) {
      throw createError({ statusCode: 429, statusMessage: "Too many requests" })
    }
  }),
}))

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "user-abc" })),
}))

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}))

vi.mock("~/server/utils/validation", () => ({
  validateBody: vi.fn(async () => ({
    name: "Test User",
    email: "test@example.com",
    feedbackType: "bug",
    message: "Something broke",
    page: "/dashboard",
  })),
}))

vi.mock("~/server/utils/errorHandler", () => ({
  sanitizeExternalApiError: vi.fn((err: unknown) => ({
    statusCode: 500,
    statusMessage: "Email service error",
    data: {},
  })),
  createSafeErrorResponse: vi.fn((err: unknown) => ({
    statusCode: 500,
    statusMessage: "Internal server error",
    data: {},
  })),
}))

vi.mock("~/server/utils/auditLog", () => ({
  auditLog: vi.fn(async () => {}),
}))

vi.mock("~/utils/validation/schemas", () => ({
  feedbackSchema: {},
}))

vi.mock("~/utils/validation/sanitize", () => ({
  escapeHtml: (s: string) => s,
}))

vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })))

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>()
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRequestIP: vi.fn(() => "127.0.0.1"),
    createError: (cfg: { statusCode: number; statusMessage?: string; data?: unknown }) => {
      const err = new Error(cfg.statusMessage) as Error & { statusCode: number }
      err.statusCode = cfg.statusCode
      return err
    },
  }
})

vi.stubGlobal("defineEventHandler", (fn: Function) => fn)
vi.stubGlobal("createError", (cfg: { statusCode: number; statusMessage?: string; data?: unknown }) => {
  const err = new Error(cfg.statusMessage) as Error & { statusCode: number }
  err.statusCode = cfg.statusCode
  return err
})

import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit"

const { default: handler } = await import("~/server/api/feedback.post")

describe("POST /api/feedback — rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRateLimitState.success = true
    mockRateLimitState.remaining = 9

    vi.mocked(rateLimitByIp).mockResolvedValue({ ...mockRateLimitState })
    vi.mocked(throwIfRateLimited).mockImplementation((result) => {
      if (!result.success) {
        throw createError({ statusCode: 429, statusMessage: "Too many requests" })
      }
    })

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    })))

    vi.stubGlobal("process", {
      ...process,
      env: { ...process.env, RESEND_API_KEY: "test-key" },
    })
  })

  it("returns 429 when IP rate limit is exceeded", async () => {
    mockRateLimitState.success = false
    mockRateLimitState.remaining = 0
    vi.mocked(rateLimitByIp).mockResolvedValue({ ...mockRateLimitState })

    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({
      statusCode: 429,
    })
  })

  it("calls rateLimitByIp with correct options", async () => {
    await handler({} as Parameters<typeof handler>[0])

    expect(rateLimitByIp).toHaveBeenCalledWith(
      expect.anything(),
      { requests: 10, window: "1 h" },
    )
  })

  it("calls throwIfRateLimited with the rate limit result", async () => {
    await handler({} as Parameters<typeof handler>[0])

    expect(throwIfRateLimited).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
  })

  it("allows request through when under rate limit", async () => {
    const result = await handler({} as Parameters<typeof handler>[0])

    expect(result).toMatchObject({ success: true })
  })
})
