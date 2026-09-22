import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * POST /api/family/invite/[token]/decline — route wrapper tests.
 *
 * The status transition now goes through decline_family_invitation(), a
 * SECURITY DEFINER RPC (#912 -- family_invitations_update's RLS only ever
 * authorized the inviter, never the invitee). This covers the route's own
 * responsibility: the token lookup and mapping the RPC's result/error to a
 * response.
 */

const mockState = {
  token: "valid-token" as string,
  invitationId: "invite-abc" as string | null,
  rpcError: null as object | null,
  authUserId: "auth-user-id" as string | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => {
    if (!mockState.authUserId) {
      const err = new Error("Unauthorized") as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }
    return { id: mockState.authUserId };
  }),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_invitations") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: mockState.invitationId
                    ? { id: mockState.invitationId }
                    : null,
                }),
            }),
          }),
        };
      }
      return {};
    },
    rpc: (fn: string) => {
      if (fn !== "decline_family_invitation") {
        throw new Error(`unexpected rpc ${fn}`);
      }
      return Promise.resolve({ data: null, error: mockState.rpcError });
    },
  })),
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => mockState.token),
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
      message?: string;
    }) => {
      const err = new Error(config.statusMessage ?? config.message) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } =
  await import("~/server/api/family/invite/[token]/decline.post");

describe("POST /api/family/invite/[token]/decline", () => {
  beforeEach(() => {
    mockState.token = "valid-token";
    mockState.invitationId = "invite-abc";
    mockState.rpcError = null;
    mockState.authUserId = "auth-user-id";
  });

  it("declines a pending invitation", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toMatchObject({ success: true });
  });

  it("returns 401 when unauthenticated", async () => {
    mockState.authUserId = null;
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns 404 for unknown token", async () => {
    mockState.invitationId = null;
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns 404 when the RPC reports the invitation wasn't found", async () => {
    mockState.rpcError = { message: "INVITATION_NOT_FOUND" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns 409 for an already-accepted/declined invitation", async () => {
    mockState.rpcError = { message: "INVITATION_NOT_PENDING" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("returns 410 for an expired invitation", async () => {
    mockState.rpcError = { message: "INVITATION_EXPIRED" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 410 });
  });

  it("returns 400 when token is missing", async () => {
    mockState.token = "";
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 500 on an unrecognized RPC error", async () => {
    mockState.rpcError = { message: "db error" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
