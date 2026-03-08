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
    const result = await handler(makeEvent({ subject: "bug", message: "The scores page crashes." }))
    expect(result).toEqual({ success: true })
  })

  it("returns { success: true } for a feature request", async () => {
    const result = await handler(makeEvent({ subject: "feature", message: "I want CSV export." }))
    expect(result).toEqual({ success: true })
  })

  it("throws 400 when subject is missing", async () => {
    await expect(handler(makeEvent({ message: "hello" }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it("throws 400 when subject is not a valid category", async () => {
    await expect(handler(makeEvent({ subject: "spam", message: "hello" }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it("throws 400 when message is empty", async () => {
    await expect(handler(makeEvent({ subject: "bug", message: "" }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it("throws 400 when message exceeds 5000 characters", async () => {
    await expect(
      handler(makeEvent({ subject: "general", message: "x".repeat(5001) }))
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it("throws 500 when sendEmail fails", async () => {
    mockState.sendEmailResult = { success: false, error: "Resend down" }
    await expect(
      handler(makeEvent({ subject: "question", message: "How do phases work?" }))
    ).rejects.toMatchObject({ statusCode: 500 })
  })

  it("returns { success: true } when user has no email", async () => {
    mockState.userEmail = ""
    const result = await handler(makeEvent({ subject: "general", message: "No email user feedback." }))
    expect(result).toEqual({ success: true })
  })
})
