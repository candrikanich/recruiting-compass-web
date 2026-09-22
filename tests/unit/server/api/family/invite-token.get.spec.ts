import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  rpcData: null as Record<string, unknown> | null,
  rpcError: null as object | null,
};

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseAnonClient: vi.fn(() => ({
    rpc: (fn: string, args: Record<string, unknown>) => {
      if (fn !== "get_family_invitation_by_token") {
        throw new Error(`unexpected rpc ${fn}`);
      }
      expect(args).toEqual({ p_token: "tok-123" });
      return {
        single: () =>
          Promise.resolve({ data: mockState.rpcData, error: mockState.rpcError }),
      };
    },
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => "tok-123"),
    createError: (config: {
      statusCode: number;
      message?: string;
      statusMessage?: string;
    }) => {
      const err = new Error(config.message ?? config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } = await import("~/server/api/family/invite/[token].get");

describe("GET /api/family/invite/[token]", () => {
  beforeEach(() => {
    mockState.rpcData = {
      invitation_id: "inv-1",
      role: "player",
      family_name: "The Smiths",
      invited_email: "kid@example.com",
      error_code: null,
    };
    mockState.rpcError = null;
  });

  it("returns the invitation preview", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({
      invitationId: "inv-1",
      role: "player",
      familyName: "The Smiths",
      invitedEmail: "kid@example.com",
    });
  });

  it("404s when the token doesn't match any invitation", async () => {
    mockState.rpcData = {
      invitation_id: null,
      role: null,
      family_name: null,
      invited_email: null,
      error_code: "NOT_FOUND",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("409s when the invitation is no longer pending", async () => {
    mockState.rpcData = {
      invitation_id: null,
      role: null,
      family_name: null,
      invited_email: null,
      error_code: "INVALID_STATUS",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("410s when the invitation has expired", async () => {
    mockState.rpcData = {
      invitation_id: null,
      role: null,
      family_name: null,
      invited_email: null,
      error_code: "EXPIRED",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 410 });
  });

  it("500s on an unrecognized error_code", async () => {
    mockState.rpcData = {
      invitation_id: null,
      role: null,
      family_name: null,
      invited_email: null,
      error_code: "SOMETHING_UNEXPECTED",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it("500s when the RPC call itself errors", async () => {
    mockState.rpcError = { message: "db error" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
