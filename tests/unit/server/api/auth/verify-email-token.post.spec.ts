import { describe, it, expect, vi } from "vitest";
import { createError } from "h3";

const mockConsume = vi.fn();
vi.mock("~/server/utils/emailVerificationTokens", () => ({
  consumeVerificationToken: mockConsume,
}));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));
const mockRateLimitByIp = vi.fn(async () => ({ success: true }));
vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByIp: mockRateLimitByIp,
  throwIfRateLimited: vi.fn(),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => "tok-1"),
    createError: (config: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

vi.stubGlobal("defineEventHandler", (fn: Function) => fn);
vi.stubGlobal(
  "createError",
  (cfg: { statusCode: number; statusMessage?: string }) => {
    const err = new Error(cfg.statusMessage) as Error & { statusCode: number };
    err.statusCode = cfg.statusCode;
    return err;
  },
);

const { default: handler } =
  await import("~/server/api/auth/verify-email/[token].post");

describe("POST /api/auth/verify-email/:token", () => {
  it("returns verified for a valid token", async () => {
    mockConsume.mockResolvedValue({ status: "verified", userId: "user-1" });
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toEqual({ status: "verified" });
    expect(mockRateLimitByIp).toHaveBeenCalledWith(expect.anything(), {
      requests: 10,
      window: "1 h",
    });
  });

  it("returns already_verified status when email was already verified", async () => {
    mockConsume.mockResolvedValue({
      status: "already_verified",
      userId: "user-1",
    });
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(result).toEqual({ status: "already_verified" });
  });

  it("returns 410 for an expired token", async () => {
    mockConsume.mockResolvedValue({ status: "expired" });

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 410 });
  });

  it("returns 410 for a token invalidated by a resend", async () => {
    mockConsume.mockResolvedValue({ status: "invalidated", userId: "user-1" });

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 410 });
  });

  it("returns 404 for an unknown token", async () => {
    mockConsume.mockResolvedValue({ status: "not_found" });

    await expect(
      handler({} as Parameters<typeof handler>[0]),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
