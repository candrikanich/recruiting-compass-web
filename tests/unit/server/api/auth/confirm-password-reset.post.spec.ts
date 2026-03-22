import { describe, it, expect, vi, beforeEach } from "vitest"
import { createError } from "h3"

// State objects read at call-time to avoid vi.mock hoisting issues
const mockBodyState = { password: "SecurePass1" as string }
const mockSessionState = {
  session: { user: { id: "user-1" } } as object | null,
  sessionError: null as object | null,
}
const mockUpdateState = { error: null as object | null }
const mockValidationState = { shouldFail: false, failMessage: "Password does not meet requirements" }

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock("~/utils/validation/schemas", () => ({
  resetPasswordSchema: {
    safeParse: vi.fn(() => {
      if (mockValidationState.shouldFail) {
        return {
          success: false,
          error: {
            errors: [{ message: mockValidationState.failMessage }],
          },
        }
      }
      return {
        success: true,
        data: { password: mockBodyState.password, confirmPassword: mockBodyState.password },
      }
    }),
  },
}))

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>()
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: async () => ({ password: mockBodyState.password }),
  }
})

vi.stubGlobal("defineEventHandler", (fn: Function) => fn)
vi.stubGlobal("readBody", async () => ({ password: mockBodyState.password }))
vi.stubGlobal("createError", createError)

const { default: handler } = await import(
  "~/server/api/auth/confirm-password-reset.post"
)

function makeEvent() {
  return {
    context: {
      supabase: {
        auth: {
          getSession: async () => ({
            data: { session: mockSessionState.session },
            error: mockSessionState.sessionError,
          }),
          updateUser: async () => ({ error: mockUpdateState.error }),
        },
      },
    },
  } as unknown as Parameters<typeof handler>[0]
}

describe("POST /api/auth/confirm-password-reset", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBodyState.password = "SecurePass1"
    mockSessionState.session = { user: { id: "user-1" } }
    mockSessionState.sessionError = null
    mockUpdateState.error = null
    mockValidationState.shouldFail = false
    mockValidationState.failMessage = "Password does not meet requirements"
  })

  describe("happy path", () => {
    it("returns success: true with confirmation message", async () => {
      const result = await handler(makeEvent())

      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining("Password has been reset"),
      })
    })

    it("calls updateUser with the validated password", async () => {
      const updateSpy = vi.fn(async () => ({ error: null }))
      const event = {
        context: {
          supabase: {
            auth: {
              getSession: async () => ({
                data: { session: { user: { id: "user-1" } } },
                error: null,
              }),
              updateUser: updateSpy,
            },
          },
        },
      } as unknown as Parameters<typeof handler>[0]

      await handler(event)

      expect(updateSpy).toHaveBeenCalledWith({ password: "SecurePass1" })
    })
  })

  describe("session validation", () => {
    it("returns 401 when there is no active session", async () => {
      mockSessionState.session = null

      await expect(handler(makeEvent())).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it("returns 401 when getSession returns an error", async () => {
      mockSessionState.session = null
      mockSessionState.sessionError = { message: "Session error" }

      await expect(handler(makeEvent())).rejects.toMatchObject({
        statusCode: 401,
      })
    })
  })

  describe("password validation", () => {
    it("returns 400 when password fails validation", async () => {
      mockValidationState.shouldFail = true
      mockValidationState.failMessage = "Password must be at least 8 characters"

      await expect(handler(makeEvent())).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it("includes validation error message in the 400 response", async () => {
      mockValidationState.shouldFail = true
      mockValidationState.failMessage = "Password must contain at least one uppercase letter"

      const err = await handler(makeEvent()).catch((e) => e)
      expect(err.statusCode).toBe(400)
      expect(err.statusMessage).toContain("uppercase")
    })

    it("uses fallback message when error has no message", async () => {
      mockValidationState.shouldFail = true
      mockValidationState.failMessage = ""

      const err = await handler(makeEvent()).catch((e) => e)
      expect(err.statusCode).toBe(400)
    })
  })

  describe("Supabase updateUser errors", () => {
    it("returns 401 when update error mentions invalid token", async () => {
      mockUpdateState.error = { message: "invalid token provided" }

      await expect(handler(makeEvent())).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it("returns 410 when update error mentions expired link", async () => {
      mockUpdateState.error = { message: "token has expired" }

      await expect(handler(makeEvent())).rejects.toMatchObject({
        statusCode: 410,
      })
    })

    it("returns 400 for generic updateUser error", async () => {
      mockUpdateState.error = { message: "some unexpected error" }

      await expect(handler(makeEvent())).rejects.toMatchObject({
        statusCode: 400,
      })
    })
  })

  describe("unexpected errors", () => {
    it("returns 500 on unexpected thrown error from session", async () => {
      const event = {
        context: {
          supabase: {
            auth: {
              getSession: () => Promise.reject(new Error("Network failure")),
              updateUser: vi.fn(),
            },
          },
        },
      } as unknown as Parameters<typeof handler>[0]

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 500,
      })
    })

    it("re-throws existing HTTP errors from updateUser", async () => {
      const httpError = createError({ statusCode: 400, statusMessage: "Bad Request" })
      const event = {
        context: {
          supabase: {
            auth: {
              getSession: async () => ({
                data: { session: { user: { id: "user-1" } } },
                error: null,
              }),
              updateUser: () => Promise.reject(httpError),
            },
          },
        },
      } as unknown as Parameters<typeof handler>[0]

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })
  })
})
