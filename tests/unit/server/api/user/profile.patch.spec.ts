import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-123",
  updateError: null as object | null,
};

const mockEq = vi.fn(() => ({ error: mockState.updateError }));

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: mockEq,
      })),
    })),
  })),
}));

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    readBody: vi.fn(async (event: any) => event._body),
  };
});

const { default: handler } = await import("~/server/api/user/profile.patch");

function makeEvent(body: unknown) {
  return { node: { req: {}, res: {} }, _body: body } as any;
}

describe("PATCH /api/user/profile", () => {
  beforeEach(() => {
    mockState.userId = "user-123";
    mockState.updateError = null;
    mockEq.mockClear();
    mockEq.mockImplementation(() => ({ error: mockState.updateError }));
  });

  it("returns { success: true } with valid fields", async () => {
    const result = await handler(
      makeEvent({ full_name: "Jane Doe", phone: "555-1234" }),
    );
    expect(result).toEqual({ success: true });
    expect(mockEq).toHaveBeenCalledWith("id", "user-123");
  });

  it("throws 400 when full_name is empty string", async () => {
    await expect(handler(makeEvent({ full_name: "" }))).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws 400 when body is empty object", async () => {
    await expect(handler(makeEvent({}))).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "At least one field must be provided",
    });
  });

  it("throws 400 when date_of_birth has invalid format", async () => {
    await expect(
      handler(makeEvent({ date_of_birth: "03/08/2026" })),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws 500 on DB error", async () => {
    mockState.updateError = { message: "DB failure" };
    await expect(
      handler(makeEvent({ full_name: "Jane Doe" })),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
