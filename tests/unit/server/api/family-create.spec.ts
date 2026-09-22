import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * POST /api/family/create — route wrapper tests.
 *
 * The full create flow (existing-family checks, code/token generation,
 * 23505 race recovery, membership insert, usage log) now lives inside
 * create_family_for_user(), a SECURITY DEFINER RPC (#912 -- see
 * supabase/migrations/20260928000023_family_code_rpcs.sql) -- that SQL
 * logic isn't unit-testable at this layer. This covers the route's own
 * responsibility: calling the RPC and mapping its result/error to a
 * response.
 */

const mockState = {
  rpcData: null as Record<string, unknown> | null,
  rpcError: null as object | null,
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

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({
    rpc: (fn: string) => {
      if (fn !== "create_family_for_user") {
        throw new Error(`unexpected rpc ${fn}`);
      }
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

const { default: handler } = await import("~/server/api/family/create.post");

describe("POST /api/family/create", () => {
  beforeEach(() => {
    mockState.rpcData = {
      family_id: "family-123",
      family_code: "FAM-TESTCODE",
      family_name: "My Family",
      already_existed: false,
    };
    mockState.rpcError = null;
  });

  it("creates a family and returns its id/code/name", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({
      success: true,
      familyId: "family-123",
      familyCode: "FAM-TESTCODE",
      familyName: "My Family",
    });
  });

  it("includes an already-exists message when the RPC reports already_existed", async () => {
    mockState.rpcData = {
      family_id: "existing-family",
      family_code: "FAM-EXISTING",
      family_name: "My Family",
      already_existed: true,
    };

    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({
      success: true,
      familyId: "existing-family",
      familyCode: "FAM-EXISTING",
      familyName: "My Family",
      message: "Family already exists",
    });
  });

  it("returns 500 when the RPC errors", async () => {
    mockState.rpcError = { message: "db error" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it("returns 500 when the RPC returns no data", async () => {
    mockState.rpcData = null;
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
