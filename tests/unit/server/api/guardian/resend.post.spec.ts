import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  rpcData: null as Record<string, unknown> | null,
  rpcError: null as object | null,
  rpcCalledWith: undefined as Record<string, unknown> | undefined,
  mailSuccess: true,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: "player-1", email: "kid@example.com" })),
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
      if (fn !== "resend_guardian_claim") {
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

vi.mock("~/server/utils/emailService", () => ({
  sendGuardianClaimEmail: vi.fn(async () => ({ success: mockState.mailSuccess })),
}));

vi.mock("~/server/utils/requestOrigin", () => ({
  getSafeRequestOrigin: vi.fn(() => "https://app.example.com"),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => ({ guardianEmail: "parent@example.com" })),
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

const { default: handler } = await import("~/server/api/guardian/resend.post");

describe("POST /api/guardian/resend", () => {
  beforeEach(() => {
    mockState.rpcData = {
      token: "tok-abc",
      guardian_email: "parent@example.com",
      player_name: "Alex",
      error_code: null,
    };
    mockState.rpcError = null;
    mockState.rpcCalledWith = undefined;
    mockState.mailSuccess = true;
  });

  it("resends via the session-scoped RPC and sends the email", async () => {
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(mockState.rpcCalledWith).toEqual({
      p_requested_email: "parent@example.com",
    });
    expect(result).toEqual({ success: true });
  });

  it("403s when the RPC reports the caller isn't eligible", async () => {
    mockState.rpcData = {
      token: null,
      guardian_email: null,
      player_name: null,
      error_code: "NOT_ELIGIBLE",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("400s when no email was provided and none is on file", async () => {
    mockState.rpcData = {
      token: null,
      guardian_email: null,
      player_name: null,
      error_code: "EMAIL_REQUIRED",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("400s when the requested email matches the caller's own", async () => {
    mockState.rpcData = {
      token: null,
      guardian_email: null,
      player_name: null,
      error_code: "SAME_EMAIL",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("429s when the RPC's durable rate limit trips", async () => {
    mockState.rpcData = {
      token: null,
      guardian_email: null,
      player_name: null,
      error_code: "RATE_LIMITED",
    };
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 429 });
  });

  it("500s on an unrecognized error_code", async () => {
    mockState.rpcData = {
      token: null,
      guardian_email: null,
      player_name: null,
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

  it("502s when the email fails to send after a successful DB write", async () => {
    mockState.mailSuccess = false;
    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 502 });
  });
});
