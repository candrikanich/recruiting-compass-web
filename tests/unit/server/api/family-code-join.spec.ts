import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * POST /api/family/code/join — route wrapper tests.
 *
 * The full join flow (finding the family by code, own-family/already-member
 * checks, membership insert, usage log) now lives inside
 * join_family_by_code(), a SECURITY DEFINER RPC (#912 -- see
 * supabase/migrations/20260928000023_family_code_rpcs.sql). This covers the
 * route's own responsibility: format/rate-limit checks and mapping the
 * RPC's result/error to a response.
 */

const mockState = {
  rpcData: null as Record<string, unknown> | null,
  rpcError: null as object | null,
  rpcCalledWith: undefined as Record<string, unknown> | undefined,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/familyCode", () => ({
  isValidFamilyCodeFormat: vi.fn(() => true),
  checkRateLimit: vi.fn(() => true),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({
    rpc: (fn: string, args: Record<string, unknown>) => {
      if (fn !== "join_family_by_code") {
        throw new Error(`unexpected rpc ${fn}`);
      }
      mockState.rpcCalledWith = args;
      return {
        single: () =>
          Promise.resolve({ data: mockState.rpcData, error: mockState.rpcError }),
      };
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
    readBody: vi.fn(async () => ({ familyCode: "FAM-TESTCODE" })),
    getRequestIP: vi.fn(() => "127.0.0.1"),
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

const { default: handler } = await import("~/server/api/family/code/join.post");

describe("POST /api/family/code/join", () => {
  beforeEach(() => {
    mockState.rpcData = {
      family_id: "family-123",
      family_name: "Test Family",
      already_member: false,
      error_code: null,
    };
    mockState.rpcError = null;
    mockState.rpcCalledWith = undefined;
  });

  it("joins a family via code", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(mockState.rpcCalledWith).toEqual({ p_family_code: "FAM-TESTCODE" });
    expect(result).toEqual({
      success: true,
      familyId: "family-123",
      familyName: "Test Family",
      message: "Successfully joined Test Family",
    });
  });

  it("prevents a user from joining their own family", async () => {
    mockState.rpcData = {
      family_id: null,
      family_name: null,
      already_member: false,
      error_code: "CANNOT_JOIN_OWN_FAMILY",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("404s when the code doesn't match any family", async () => {
    mockState.rpcData = {
      family_id: null,
      family_name: null,
      already_member: false,
      error_code: "CODE_NOT_FOUND",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("429s when the RPC's durable rate limit trips", async () => {
    // The RPC enforces its own 5-per-5-minutes limit independently of the
    // route's in-memory IP limiter, since it's also reachable directly via
    // PostgREST (#957).
    mockState.rpcData = {
      family_id: null,
      family_name: null,
      already_member: false,
      error_code: "RATE_LIMITED",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 429 });
  });

  it("returns idempotent success if already a member", async () => {
    mockState.rpcData = {
      family_id: "family-123",
      family_name: "Test Family",
      already_member: true,
      error_code: null,
    };

    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({
      success: true,
      familyId: "family-123",
      message: "You are already a member of this family",
    });
  });

  it("returns 500 on an unrecognized error_code", async () => {
    mockState.rpcData = {
      family_id: null,
      family_name: null,
      already_member: false,
      error_code: "SOMETHING_UNEXPECTED",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it("returns 500 when the RPC call itself errors", async () => {
    mockState.rpcError = { message: "db error" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
