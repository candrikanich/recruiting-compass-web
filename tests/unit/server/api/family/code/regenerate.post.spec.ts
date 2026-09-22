import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * POST /api/family/code/regenerate — route wrapper tests.
 *
 * The owner check, code generation, and update now live inside
 * regenerate_family_code(), a SECURITY DEFINER RPC (#912 -- see
 * supabase/migrations/20260928000023_family_code_rpcs.sql). This covers
 * the route's own responsibility: validating the body and mapping the
 * RPC's result/error to a response.
 */

const VALID_FAMILY_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const mockState = {
  userId: "user-1",
  rpcData: "FAM-NEWCODE" as string | null,
  rpcError: null as object | null,
  rpcCalledWith: undefined as Record<string, unknown> | undefined,
  body: { familyId: VALID_FAMILY_ID } as object,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/validation", () => ({
  validateBody: vi.fn(
    async (_event: unknown, _schema: unknown) => mockState.body,
  ),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({
    rpc: (fn: string, args: Record<string, unknown>) => {
      if (fn !== "regenerate_family_code") {
        throw new Error(`unexpected rpc ${fn}`);
      }
      mockState.rpcCalledWith = args;
      return Promise.resolve({ data: mockState.rpcData, error: mockState.rpcError });
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
      statusMessage?: string;
      message?: string;
    }) => {
      const err = new Error(
        config.statusMessage ?? config.message ?? "error",
      ) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const { default: handler } =
  await import("~/server/api/family/code/regenerate.post");

const mockEvent = { context: {}, node: { req: {}, res: {} } } as Parameters<
  typeof handler
>[0];

describe("POST /api/family/code/regenerate", () => {
  beforeEach(() => {
    mockState.userId = "user-1";
    mockState.rpcData = "FAM-NEWCODE";
    mockState.rpcError = null;
    mockState.rpcCalledWith = undefined;
    mockState.body = { familyId: VALID_FAMILY_ID };
  });

  it("returns new family code on happy path", async () => {
    const result = await handler(mockEvent);
    expect(mockState.rpcCalledWith).toEqual({ p_family_id: VALID_FAMILY_ID });
    expect(result).toMatchObject({ success: true, familyCode: "FAM-NEWCODE" });
  });

  it("throws 403 when the caller isn't the family owner", async () => {
    mockState.rpcError = { message: "NOT_FAMILY_OWNER" };
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("throws 500 when the RPC errors unexpectedly", async () => {
    mockState.rpcError = { message: "db error" };
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it("propagates H3 error from requireAuth without wrapping", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3Err = Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    vi.mocked(requireAuth).mockRejectedValueOnce(h3Err);

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("propagates 400 from validateBody when body is invalid", async () => {
    const { validateBody } = await import("~/server/utils/validation");
    const validationErr = Object.assign(new Error("Validation failed"), {
      statusCode: 400,
    });
    vi.mocked(validateBody).mockRejectedValueOnce(validationErr);

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("wraps unexpected non-H3 errors in a 500", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error("unexpected crash"));

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});
