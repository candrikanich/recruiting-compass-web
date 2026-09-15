import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateUser, mockIssueToken, mockSendVerification } = vi.hoisted(
  () => ({
    mockCreateUser: vi.fn(async () => ({
      data: { user: { id: "user-1", email: "player@example.com" } },
      error: null as { message: string } | null,
    })),
    mockIssueToken: vi.fn(async () => ({
      token: "tok-1",
      expiresAt: "2026-09-15T00:00:00.000Z",
    })),
    mockSendVerification: vi.fn(async () => ({ success: true })),
  }),
);

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    auth: { admin: { createUser: mockCreateUser } },
  })),
}));
vi.mock("~/server/utils/emailVerificationTokens", () => ({
  issueVerificationToken: mockIssueToken,
}));
vi.mock("~/server/utils/emailService", () => ({
  sendVerificationEmail: mockSendVerification,
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

import { createVerifiedAccount } from "~/server/utils/accountCreation";

describe("createVerifiedAccount", () => {
  beforeEach(() => {
    mockCreateUser.mockClear();
    mockIssueToken.mockClear();
    mockSendVerification.mockClear();
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "player@example.com" } },
      error: null,
    });
  });

  it("auto-confirms the account, issues a token, and sends the verification email", async () => {
    const result = await createVerifiedAccount({} as never, {
      email: "player@example.com",
      password: "correct-horse-1",
      userMetadata: { full_name: "Pat Player", role: "player" },
    });

    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "player@example.com",
        email_confirm: true,
        user_metadata: { full_name: "Pat Player", role: "player" },
      }),
    );
    expect(mockSendVerification).toHaveBeenCalledWith(
      expect.objectContaining({ to: "player@example.com", token: "tok-1" }),
    );
    expect(result).toEqual({ ok: true, userId: "user-1" });
  });

  it("skips token issuance and email when skipVerificationEmail is set", async () => {
    const result = await createVerifiedAccount({} as never, {
      email: "player@example.com",
      password: "correct-horse-1",
      userMetadata: {},
      skipVerificationEmail: true,
    });

    expect(mockIssueToken).not.toHaveBeenCalled();
    expect(mockSendVerification).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, userId: "user-1" });
  });

  it("returns a generic failure for a duplicate email, indistinguishable from any other creation failure", async () => {
    // No distinct statusCode/message/code — a distinguishing response is an
    // account-existence-enumeration oracle Supabase's own signUp() itself
    // avoids.
    mockCreateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "A user with this email address has already been registered" },
    } as never);

    const result = await createVerifiedAccount({} as never, {
      email: "player@example.com",
      password: "correct-horse-1",
      userMetadata: {},
    });

    expect(result).toEqual({
      ok: false,
      statusCode: 400,
      statusMessage: "Unable to create account. Please try again.",
    });
  });

  it("still reports success when token issuance throws after account creation already succeeded", async () => {
    mockIssueToken.mockRejectedValueOnce(
      new Error("Failed to issue verification token: connection reset"),
    );

    const result = await createVerifiedAccount({} as never, {
      email: "player@example.com",
      password: "correct-horse-1",
      userMetadata: {},
    });

    expect(mockSendVerification).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, userId: "user-1" });
  });

  it("returns the same generic failure shape for an unrelated creation error", async () => {
    mockCreateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Something else went wrong" },
    } as never);

    const result = await createVerifiedAccount({} as never, {
      email: "player@example.com",
      password: "correct-horse-1",
      userMetadata: {},
    });

    expect(result).toEqual({
      ok: false,
      statusCode: 400,
      statusMessage: "Unable to create account. Please try again.",
    });
  });
});
