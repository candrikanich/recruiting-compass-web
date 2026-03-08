import { describe, it, expect, vi, beforeEach } from "vitest"
import { createError } from "h3"

const mockState = {
  userId: "user-123",
  membership: { family_unit_id: "family-456" } as object | null,
  existingUser: null as object | null,
  existingMember: null as object | null,
  inviterProfile: { full_name: "Test User" } as object | null,
  family: { family_name: "Test Family" } as object | null,
  invitationId: "inv-789",
  invitationError: null as object | null,
}

const mockRateLimitState = {
  success: true as boolean,
  limit: 10,
  remaining: 9,
  reset: Date.now() + 3_600_000,
}

vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByUser: vi.fn(async () => ({ ...mockRateLimitState })),
  throwIfRateLimited: vi.fn((result: { success: boolean; reset: number }) => {
    if (!result.success) {
      throw createError({ statusCode: 429, statusMessage: "Too many requests" })
    }
  }),
}))

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}))

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}))

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => {
    let familyMembersCallCount = 0
    return {
      from: (table: string) => {
        if (table === "family_members") {
          familyMembersCallCount++
          const callNum = familyMembersCallCount
          return {
            select: () => ({
              eq: (col: string, val: unknown) => {
                if (callNum === 1) {
                  // First call: membership lookup — .eq("user_id", ...).single()
                  return {
                    single: () => Promise.resolve({ data: mockState.membership, error: null }),
                  }
                }
                // Second call: existing member check — .eq("family_unit_id", ...).eq("user_id", ...).maybeSingle()
                return {
                  eq: () => ({
                    maybeSingle: () => Promise.resolve({ data: mockState.existingMember, error: null }),
                  }),
                }
              },
            }),
          }
        }
        if (table === "users") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: mockState.existingUser, error: null }),
                single: () => Promise.resolve({ data: mockState.inviterProfile, error: null }),
              }),
            }),
          }
        }
        if (table === "family_units") {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockState.family, error: null }),
              }),
            }),
          }
        }
        if (table === "family_invitations") {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: mockState.invitationError ? null : { id: mockState.invitationId },
                    error: mockState.invitationError,
                  }),
              }),
            }),
          }
        }
        return {}
      },
    }
  }),
}))

vi.mock("~/server/utils/emailService", () => ({
  sendInviteEmail: vi.fn(async () => ({ success: true })),
}))

vi.mock("~/utils/validation/validators", async (importOriginal) => {
  const { z } = await import("zod")
  return { emailSchema: z.string().email() }
})

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>()
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => ({ email: "invited@example.com", role: "parent" })),
    createError: (cfg: { statusCode: number; statusMessage?: string; data?: unknown }) => {
      const err = new Error(cfg.statusMessage) as Error & { statusCode: number }
      err.statusCode = cfg.statusCode
      return err
    },
  }
})

import { rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit"
import { requireAuth } from "~/server/utils/auth"

const { default: handler } = await import("~/server/api/family/invite.post")

describe("POST /api/family/invite — rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.userId = "user-123"
    mockState.membership = { family_unit_id: "family-456" }
    mockState.existingUser = null
    mockState.existingMember = null
    mockState.inviterProfile = { full_name: "Test User" }
    mockState.family = { family_name: "Test Family" }
    mockState.invitationError = null
    mockRateLimitState.success = true
    mockRateLimitState.remaining = 9

    vi.mocked(requireAuth).mockResolvedValue({ id: mockState.userId })
    vi.mocked(rateLimitByUser).mockResolvedValue({ ...mockRateLimitState })
    vi.mocked(throwIfRateLimited).mockImplementation((result) => {
      if (!result.success) {
        throw createError({ statusCode: 429, statusMessage: "Too many requests" })
      }
    })
  })

  it("returns 429 when user rate limit is exceeded", async () => {
    mockRateLimitState.success = false
    mockRateLimitState.remaining = 0
    vi.mocked(rateLimitByUser).mockResolvedValue({ ...mockRateLimitState })

    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({
      statusCode: 429,
    })
  })

  it("calls rateLimitByUser with correct options", async () => {
    await handler({} as Parameters<typeof handler>[0])

    expect(rateLimitByUser).toHaveBeenCalledWith(
      expect.anything(),
      mockState.userId,
      { requests: 10, window: "1 h" },
    )
  })

  it("calls throwIfRateLimited with the rate limit result", async () => {
    await handler({} as Parameters<typeof handler>[0])

    expect(throwIfRateLimited).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
  })

  it("creates invitation when under the rate limit", async () => {
    const result = await handler({} as Parameters<typeof handler>[0])

    expect(result).toMatchObject({ success: true, invitationId: mockState.invitationId })
  })
})
