import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

// State objects read at call-time to avoid vi.mock hoisting issues
const mockState = {
  token: "valid-token" as string | number | undefined,
  email: "admin@example.com" as string | number | undefined,
  invitation: {
    invited_email: "admin@example.com",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    consumed_at: null as string | null,
  } as Record<string, unknown> | null,
};

const mockMaybeSingle = vi.fn(() =>
  Promise.resolve({ data: mockState.invitation, error: null }),
);
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })),
  })),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => ({
      token: mockState.token,
      email: mockState.email,
    })),
  };
});

vi.stubGlobal("defineEventHandler", (fn: Function) => fn);
vi.stubGlobal(
  "readBody",
  vi.fn(async () => ({ token: mockState.token, email: mockState.email })),
);
vi.stubGlobal("createError", createError);

import { useSupabaseAdmin } from "~/server/utils/supabase";

const { default: handler } =
  await import("~/server/api/auth/validate-admin-token.post");

describe("POST /api/auth/validate-admin-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.token = "valid-token";
    mockState.email = "admin@example.com";
    mockState.invitation = {
      invited_email: "admin@example.com",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      consumed_at: null,
    };
    vi.stubGlobal("createError", createError);
    mockMaybeSingle.mockImplementation(() =>
      Promise.resolve({ data: mockState.invitation, error: null }),
    );
    mockFrom.mockImplementation(
      () =>
        ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })),
          })),
        }) as any,
    );
    vi.mocked(useSupabaseAdmin).mockImplementation(
      () => ({ from: mockFrom }) as any,
    );
  });

  describe("happy path", () => {
    it("returns valid: true when the invitation is unconsumed, unexpired, and the email matches", async () => {
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toEqual({ valid: true });
    });

    it("matches email case-insensitively", async () => {
      mockState.email = "ADMIN@EXAMPLE.COM";

      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toEqual({ valid: true });
    });
  });

  describe("invalid token", () => {
    it("returns valid: false when no invitation row matches the token", async () => {
      mockState.invitation = null;

      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toEqual({
        valid: false,
        message: "Invalid admin registration token",
      });
    });

    it("returns valid: false when the invitation is already consumed", async () => {
      mockState.invitation!.consumed_at = new Date().toISOString();

      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result.valid).toBe(false);
    });

    it("returns valid: false when the invitation has expired", async () => {
      mockState.invitation!.expires_at = new Date(
        Date.now() - 60_000,
      ).toISOString();

      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result.valid).toBe(false);
    });

    it("returns valid: false when the email doesn't match the invited email", async () => {
      mockState.email = "someone-else@example.com";

      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result.valid).toBe(false);
    });
  });

  describe("missing input", () => {
    it("returns 400 when token is missing from body", async () => {
      mockState.token = undefined;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("returns 400 when token is an empty string", async () => {
      mockState.token = "";

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("returns 400 when token is not a string", async () => {
      mockState.token = 12345;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("returns 400 when email is missing from body", async () => {
      mockState.email = undefined;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe("error handling", () => {
    it("returns 500 when an unexpected error occurs", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Unexpected DB error");
      });

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    // Regression: Supabase returns query failures as { error }, it does not
    // throw. Review caught that this endpoint discarded that error and fell
    // through to the ordinary "invalid token" branch — a real DB/service
    // failure must classify as 500, not silently tell a valid recipient
    // their token is invalid.
    it("returns 500 (not valid: false) when the invitation lookup itself errors", async () => {
      mockMaybeSingle.mockImplementation(() =>
        Promise.resolve({ data: null, error: { message: "DB error" } }),
      );

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it("re-throws HTTP errors as-is", async () => {
      const httpError = createError({
        statusCode: 403,
        statusMessage: "Forbidden",
      });
      mockFrom.mockImplementation(() => {
        throw httpError;
      });

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });
});
