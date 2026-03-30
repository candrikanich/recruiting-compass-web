import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-123",
  userEmail: "user@example.com",
  signInError: null as object | null,
  updateError: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: mockState.userId,
    email: mockState.userEmail,
  })),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    auth: {
      admin: {
        updateUserById: vi.fn(async () => ({ error: mockState.updateError })),
      },
    },
  })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(async () => ({ error: mockState.signInError })),
    },
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async (event: any) => event._body),
  };
});

const { default: handler } =
  await import("~/server/api/auth/change-email.post");

describe("POST /api/auth/change-email", () => {
  beforeEach(() => {
    mockState.signInError = null;
    mockState.updateError = null;
    mockState.userEmail = "user@example.com";
  });

  function makeEvent(body: unknown) {
    return { node: { req: {}, res: {} }, _body: body } as any;
  }

  it("returns { success: true } with valid new email and correct password", async () => {
    const result = await handler(
      makeEvent({
        newEmail: "newemail@example.com",
        currentPassword: "CorrectPass1!",
      }),
    );

    expect(result).toEqual({
      success: true,
      message: "Verification email sent to new address",
    });
  });

  it("throws 401 when signInWithPassword returns an error", async () => {
    mockState.signInError = { message: "Invalid login credentials" };

    await expect(
      handler(
        makeEvent({
          newEmail: "newemail@example.com",
          currentPassword: "WrongPass!",
        }),
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("throws 400 when newEmail is not a valid email address", async () => {
    await expect(
      handler(
        makeEvent({
          newEmail: "not-an-email",
          currentPassword: "CorrectPass1!",
        }),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 500 when updateUserById returns an error", async () => {
    mockState.updateError = { message: "DB error" };

    await expect(
      handler(
        makeEvent({
          newEmail: "newemail@example.com",
          currentPassword: "CorrectPass1!",
        }),
      ),
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it("throws 401 when user has no email", async () => {
    mockState.userEmail = "";

    await expect(
      handler(
        makeEvent({
          newEmail: "newemail@example.com",
          currentPassword: "CorrectPass1!",
        }),
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
