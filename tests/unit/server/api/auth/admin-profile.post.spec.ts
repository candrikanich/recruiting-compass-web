import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

// State objects read at call-time to avoid vi.mock hoisting issues
const mockBodyState = {
  email: "admin@example.com" as string,
  fullName: "Admin User",
  adminToken: "valid-token" as string | null,
};
const mockAuthState = {
  userId: "user-1",
  shouldFail: false,
  userMetadata: undefined as Record<string, unknown> | undefined,
};
const mockRpcState = {
  status: "consumed" as
    | "consumed"
    | "not_found"
    | "already_used"
    | "expired"
    | "email_mismatch",
  error: null as object | null,
};
const mockDbState = {
  error: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => {
    if (mockAuthState.shouldFail) {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }
    return {
      id: mockAuthState.userId,
      role: "athlete",
      user_metadata: mockAuthState.userMetadata,
    };
  }),
}));

const mockRpc = vi.fn(() =>
  Promise.resolve({
    data: [{ status: mockRpcState.status, invited_by: "some-admin-id" }],
    error: mockRpcState.error,
  }),
);
const mockFrom = vi.fn(() => ({
  update: vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ data: null, error: mockDbState.error })),
  })),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
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
      email: mockBodyState.email,
      fullName: mockBodyState.fullName,
      adminToken: mockBodyState.adminToken,
    })),
  };
});

vi.stubGlobal("defineEventHandler", (fn: Function) => fn);
vi.stubGlobal(
  "readBody",
  vi.fn(async () => ({
    email: mockBodyState.email,
    fullName: mockBodyState.fullName,
    adminToken: mockBodyState.adminToken,
  })),
);
vi.stubGlobal("createError", createError);

import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

const { default: handler } =
  await import("~/server/api/auth/admin-profile.post");

describe("POST /api/auth/admin-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBodyState.email = "admin@example.com";
    mockBodyState.fullName = "Admin User";
    mockBodyState.adminToken = "valid-token";
    mockAuthState.userId = "user-1";
    mockAuthState.shouldFail = false;
    mockAuthState.userMetadata = undefined;
    mockRpcState.status = "consumed";
    mockRpcState.error = null;
    mockDbState.error = null;
    vi.stubGlobal("createError", createError);
    vi.mocked(requireAuth).mockImplementation(async () => {
      if (mockAuthState.shouldFail) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
      }
      return {
        id: mockAuthState.userId,
        role: "athlete",
        user_metadata: mockAuthState.userMetadata,
      } as any;
    });
    mockRpc.mockImplementation(() =>
      Promise.resolve({
        data: [{ status: mockRpcState.status, invited_by: "some-admin-id" }],
        error: mockRpcState.error,
      }),
    );
    mockFrom.mockImplementation(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({ data: null, error: mockDbState.error }),
        ),
      })),
    }));
    vi.mocked(useSupabaseAdmin).mockImplementation(
      () => ({ from: mockFrom, rpc: mockRpc }) as any,
    );
  });

  describe("happy path", () => {
    it("returns success: true when profile is created", async () => {
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toEqual({ success: true });
    });

    it("consumes the admin invitation via RPC with token + email", async () => {
      await handler({} as Parameters<typeof handler>[0]);

      expect(mockRpc).toHaveBeenCalledWith("consume_admin_invitation", {
        p_token: "valid-token",
        p_email: "admin@example.com",
      });
    });

    it("calls supabase.update with is_admin: true and role: parent", async () => {
      const mockEq = vi.fn(() => Promise.resolve({ data: null, error: null }));
      const mockUpdate = vi.fn(() => ({ eq: mockEq }));
      mockFrom.mockImplementation(() => ({ update: mockUpdate }) as any);

      await handler({} as Parameters<typeof handler>[0]);

      expect(mockFrom).toHaveBeenCalledWith("users");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Admin User",
          role: "parent",
          is_admin: true,
        }),
      );
    });
  });

  describe("auth", () => {
    it("propagates auth errors when requireAuth rejects", async () => {
      mockAuthState.shouldFail = true;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  describe("input validation", () => {
    it("returns 400 when email is missing", async () => {
      mockBodyState.email = "";

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "email is required",
      });
    });

    it("returns 403 when adminToken is an empty string", async () => {
      mockBodyState.adminToken = "";

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("returns 403 when adminToken is null", async () => {
      mockBodyState.adminToken = null;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it.each([
      ["not_found", "not_found"],
      ["already_used (reuse of a consumed token)", "already_used"],
      ["expired", "expired"],
      ["email_mismatch", "email_mismatch"],
    ])("returns 403 when the invitation RPC reports %s", async (_desc, status) => {
      mockRpcState.status = status as typeof mockRpcState.status;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    // Regression for issue #854: the entire point of moving off the static
    // shared secret is that a token can't be reused. Simulates the exact
    // reuse scenario the fix exists to close.
    it("403s a second attempt to consume the same already-used token, and never applies is_admin on that attempt", async () => {
      mockRpcState.status = "already_used";
      const mockEq = vi.fn(() => Promise.resolve({ data: null, error: null }));
      const mockUpdate = vi.fn(() => ({ eq: mockEq }));
      mockFrom.mockImplementation(() => ({ update: mockUpdate }) as any);

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("pending_admin metadata is never trusted", () => {
    // A prior version trusted a `pending_admin` flag out of the caller's own
    // JWT metadata as an alternative to the adminToken check. Since
    // /api/auth/signup could be called directly with arbitrary metadata,
    // that flag was attacker-settable — this asserted the escalation.
    // adminToken validation must be the ONLY path now, unconditionally.
    it("still requires a valid adminToken even when session metadata carries pending_admin: true", async () => {
      mockAuthState.userMetadata = { pending_admin: true };
      mockBodyState.adminToken = null;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("does not apply is_admin: true from pending_admin metadata alone", async () => {
      mockAuthState.userMetadata = { pending_admin: true };
      mockBodyState.adminToken = null;
      const mockEq = vi.fn(() => Promise.resolve({ data: null, error: null }));
      const mockUpdate = vi.fn(() => ({ eq: mockEq }));
      mockFrom.mockImplementation(() => ({ update: mockUpdate }) as any);

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("DB errors", () => {
    it("returns 500 when the consume RPC errors", async () => {
      mockRpcState.error = { message: "DB error" };

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it("returns 500 when supabase update fails", async () => {
      mockDbState.error = { message: "DB error" };

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to create admin profile",
      });
    });

    it("returns 500 on unexpected thrown error", async () => {
      vi.mocked(useSupabaseAdmin).mockImplementation(() => {
        throw new Error("Supabase init failed");
      });

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });
});
