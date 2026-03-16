import { describe, it, expect, vi, beforeEach } from "vitest"

const mockState = {
  userId: "user-123",
  userEmail: "athlete@example.com",
  sendEmailResult: { success: true } as { success: boolean; error?: string },
}

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId, email: mockState.userEmail })),
}))

vi.mock("~/server/utils/emailService", () => ({
  sendEmail: vi.fn(async () => mockState.sendEmailResult),
}))

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
  createLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}))

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3")
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async (event: any) => event._body),
  }
})

const { default: handler } = await import("~/server/api/feedback.post")

const validBody = {
  name: "Jane Athlete",
  email: "jane@example.com",
  feedbackType: "bug" as const,
  message: "The scores page crashes.",
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    mockState.userId = "user-123"
    mockState.sendEmailResult = { success: true }
    mockState.userEmail = "athlete@example.com"
  })

  function makeEvent(body: unknown) {
    return { node: { req: {}, res: {} }, _body: body } as any
  }

  it("returns { success: true } for a valid bug report", async () => {
    const result = await handler(makeEvent(validBody))
    expect(result).toEqual({ success: true })
  })

  it("returns { success: true } for a feature request", async () => {
    const result = await handler(makeEvent({ ...validBody, feedbackType: "feature", message: "I want CSV export." }))
    expect(result).toEqual({ success: true })
  })

  it("returns { success: true } for other feedback", async () => {
    const result = await handler(makeEvent({ ...validBody, feedbackType: "other", message: "General thoughts." }))
    expect(result).toEqual({ success: true })
  })

  it("returns { success: true } with optional page included", async () => {
    const result = await handler(makeEvent({ ...validBody, page: "/schools" }))
    expect(result).toEqual({ success: true })
  })

  it("throws 400 when feedbackType is missing", async () => {
    const { feedbackType: _, ...body } = validBody
    await expect(handler(makeEvent(body))).rejects.toMatchObject({ statusCode: 400 })
  })

  it("throws 400 when feedbackType is not a valid category", async () => {
    await expect(handler(makeEvent({ ...validBody, feedbackType: "spam" }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it("throws 400 when message exceeds 5000 characters", async () => {
    await expect(
      handler(makeEvent({ ...validBody, message: "x".repeat(5001) }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it("throws 400 when email is invalid", async () => {
    await expect(handler(makeEvent({ ...validBody, email: "not-an-email" }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it("throws 500 when sendEmail fails", async () => {
    mockState.sendEmailResult = { success: false, error: "Resend down" }
    await expect(handler(makeEvent(validBody))).rejects.toMatchObject({ statusCode: 500 })
  })
})
