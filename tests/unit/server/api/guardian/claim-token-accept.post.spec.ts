import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  rpcData: null as string | null,
  rpcError: null as { message: string } | null,
  rpcCalledWith: undefined as Record<string, unknown> | undefined,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "guardian-1", email: "parent@example.com" })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseUserClient: vi.fn(() => ({
    rpc: (fn: string, args: Record<string, unknown>) => {
      if (fn !== "accept_guardian_claim") {
        throw new Error(`unexpected rpc ${fn}`);
      }
      mockState.rpcCalledWith = args;
      return Promise.resolve({ data: mockState.rpcData, error: mockState.rpcError });
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

const { default: handler } = await import(
  "~/server/api/guardian/claim/[token]/accept.post"
);

describe("POST /api/guardian/claim/[token]/accept", () => {
  beforeEach(() => {
    mockState.rpcData = "family-unit-1";
    mockState.rpcError = null;
    mockState.rpcCalledWith = undefined;
  });

  it("accepts the claim via a session-scoped RPC call keyed on the caller's own id", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(mockState.rpcCalledWith).toMatchObject({
      p_token: "tok-123",
      p_guardian_id: "guardian-1",
      p_guardian_email: "parent@example.com",
    });
    expect(result).toEqual({ success: true, familyUnitId: "family-unit-1" });
  });

  it("maps CLAIM_EMAIL_MISMATCH to 403", async () => {
    mockState.rpcError = { message: "CLAIM_EMAIL_MISMATCH" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("maps CLAIM_EXPIRED to 410", async () => {
    mockState.rpcError = { message: "CLAIM_EXPIRED" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 410 });
  });

  it("500s on an unrecognized RPC error", async () => {
    mockState.rpcError = { message: "db error" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
