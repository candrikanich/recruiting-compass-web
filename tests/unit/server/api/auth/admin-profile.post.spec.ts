import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

// State objects read at call-time to avoid vi.mock hoisting issues
const mockBodyState = {
  fullName: "Admin User",
  adminToken: "11111111-1111-4111-8111-111111111111" as string | null,
};
const mockAuthState = {
  userId: "user-1",
  email: "admin@example.com" as string | undefined,
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

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => {
    if (mockAuthState.shouldFail) {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }
    return {
      id: mockAuthState.userId,
      email: mockAuthState.email,
      role: "athlete",
      user_metadata: mockAuthState.userMetadata,
    };
  }),
}));

const mockRpc = vi.fn(() =>
  Promise.resolve({
    data: [{ status: mockRpcState.status }],
    error: mockRpcState.error,
  }),
);

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ rpc: mockRpc })),
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
      fullName: mockBodyState.fullName,
      adminToken: mockBodyState.adminToken,
    })),
  };
});

vi.stubGlobal("defineEventHandler", (fn: Function) => fn);
vi.stubGlobal(
  "readBody",
  vi.fn(async () => ({
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
    mockBodyState.fullName = "Admin User";
    mockBodyState.adminToken = "11111111-1111-4111-8111-111111111111";
    mockAuthState.userId = "user-1";
    mockAuthState.email = "admin@example.com";
    mockAuthState.shouldFail = false;
    mockAuthState.userMetadata = undefined;
    mockRpcState.status = "consumed";
    mockRpcState.error = null;
    vi.stubGlobal("createError", createError);
    vi.mocked(requireAuth).mockImplementation(async () => {
      if (mockAuthState.shouldFail) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
      }
      return {
        id: mockAuthState.userId,
        email: mockAuthState.email,
        role: "athlete",
        user_metadata: mockAuthState.userMetadata,
      } as any;
    });
    mockRpc.mockImplementation(() =>
      Promise.resolve({
        data: [{ status: mockRpcState.status }],
        error: mockRpcState.error,
      }),
    );
    vi.mocked(useSupabaseAdmin).mockImplementation(
      () => ({ rpc: mockRpc }) as any,
    );
  });

  describe("happy path", () => {
    it("returns success: true when profile is created", async () => {
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toEqual({ success: true });
    });

    // Regression for a review finding on the initial #854 fix: the RPC must
    // be called with the CALLER'S OWN authenticated email (authUser.email),
    // never a client-supplied one — trusting a request-body email let any
    // token holder consume an invitation meant for a different address
    // while granting admin to their own, different, authenticated account.
    it("consumes the admin invitation via RPC keyed on the authenticated user's own id + email, not a client-supplied email", async () => {
      await handler({} as Parameters<typeof handler>[0]);

      expect(mockRpc).toHaveBeenCalledWith("consume_admin_invitation", {
        p_token: "11111111-1111-4111-8111-111111111111",
        p_user_id: "user-1",
        p_email: "admin@example.com",
        p_full_name: "Admin User",
      });
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

    it("403s when the authenticated session has no email, and never calls the RPC", async () => {
      mockAuthState.email = undefined;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe("input validation", () => {
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

    // Regression: adminToken now requires the real randomUUID() shape
    // (server/api/admin/invitations.post.ts mints it that way), not just
    // any non-empty string. Stays 403 (not 400) -- this token gates
    // privilege escalation, so a malformed value must be exactly as
    // uninformative as a wrong or expired one.
    it("returns 403 (not 400) when adminToken is a non-UUID string", async () => {
      mockBodyState.adminToken = "not-a-real-uuid";

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("returns 400 when fullName is an empty string", async () => {
      mockBodyState.fullName = "";

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("returns 400 when fullName exceeds 255 characters", async () => {
      mockBodyState.fullName = "A".repeat(256);

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockRpc).not.toHaveBeenCalled();
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
    // reuse scenario the fix exists to close — the second call must 403,
    // not silently succeed or partially grant.
    it("403s a second attempt to consume the same already-used token", async () => {
      mockRpcState.status = "already_used";

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({ statusCode: 403 });
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
