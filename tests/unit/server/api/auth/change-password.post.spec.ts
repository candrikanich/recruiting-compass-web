import { describe, it, expect, vi, beforeEach } from "vitest"

const mockState = {
  userId: "user-123",
  userEmail: "user@example.com",
  signInError: null as object | null,
  updateError: null as object | null,
}

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId, email: mockState.userEmail })),
}))

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(async () => ({ error: mockState.signInError })),
      admin: {
        updateUserById: vi.fn(async () => ({ error: mockState.updateError })),
      },
    },
  })),
}))

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}))

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3")
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async (event: any) => event._body),
  }
})

const { default: handler } = await import("~/server/api/auth/change-password.post")

describe("POST /api/auth/change-password", () => {
  beforeEach(() => {
    mockState.signInError = null
    mockState.updateError = null
  })

  function makeEvent(body: unknown) {
    return { node: { req: {}, res: {} }, _body: body } as any
  }

  it("returns { success: true } with valid current and new password", async () => {
    const result = await handler(makeEvent({ currentPassword: "OldPass1!", newPassword: "NewPass123!" }))

    expect(result).toEqual({ success: true })
  })

  it("throws 401 when signInWithPassword returns an error", async () => {
    mockState.signInError = { message: "Invalid login credentials" }

    await expect(
      handler(makeEvent({ currentPassword: "WrongPass!", newPassword: "NewPass123!" })),
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it("throws 400 when newPassword is fewer than 8 characters", async () => {
    await expect(
      handler(makeEvent({ currentPassword: "OldPass1!", newPassword: "short" })),
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})
