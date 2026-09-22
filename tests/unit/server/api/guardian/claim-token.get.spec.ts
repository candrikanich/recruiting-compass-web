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
      if (fn !== "get_guardian_claim_by_token") {
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

const { default: handler } = await import(
  "~/server/api/guardian/claim/[token]/index.get"
);

describe("GET /api/guardian/claim/[token]", () => {
  beforeEach(() => {
    mockState.rpcData = {
      guardian_email: "parent@example.com",
      player_name: "Alex",
      player_date_of_birth: "2012-01-01",
      player_graduation_year: 2030,
      expires_at: "2026-11-01T00:00:00.000Z",
      error_code: null,
    };
    mockState.rpcError = null;
  });

  it("returns the claim preview", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({
      guardianEmail: "parent@example.com",
      playerName: "Alex",
      playerDateOfBirth: "2012-01-01",
      playerGraduationYear: 2030,
      expiresAt: "2026-11-01T00:00:00.000Z",
    });
  });

  it("404s when the token doesn't match any claim", async () => {
    mockState.rpcData = { error_code: "NOT_FOUND" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("409s when the claim was already confirmed", async () => {
    mockState.rpcData = { error_code: "ALREADY_CLAIMED" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("410s when the claim is no longer pending", async () => {
    mockState.rpcData = { error_code: "INVALID_STATUS" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 410 });
  });

  it("410s when the claim has expired", async () => {
    mockState.rpcData = { error_code: "EXPIRED" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 410 });
  });

  it("500s when the RPC call itself errors", async () => {
    mockState.rpcError = { message: "db error" };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
