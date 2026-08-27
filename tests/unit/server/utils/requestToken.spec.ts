import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

const mockState = { header: undefined as string | undefined, cookie: undefined as string | undefined };

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    getHeader: vi.fn(() => mockState.header),
    getCookie: vi.fn(() => mockState.cookie),
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

import { extractRequestToken } from "~/server/utils/requestToken";

const event = {} as H3Event;

describe("extractRequestToken", () => {
  beforeEach(() => {
    mockState.header = undefined;
    mockState.cookie = undefined;
  });

  it("returns the bearer token from the Authorization header", () => {
    mockState.header = "Bearer abc.def";
    expect(extractRequestToken(event)).toBe("abc.def");
  });

  it("falls back to the sb-access-token cookie when no bearer header", () => {
    mockState.header = undefined;
    mockState.cookie = "cookie-token";
    expect(extractRequestToken(event)).toBe("cookie-token");
  });

  it("prefers the header over the cookie", () => {
    mockState.header = "Bearer header-token";
    mockState.cookie = "cookie-token";
    expect(extractRequestToken(event)).toBe("header-token");
  });

  it("throws 401 when neither header nor cookie carries a token", () => {
    expect(() => extractRequestToken(event)).toThrowError(
      "Unauthorized - no authentication token",
    );
  });

  it("throws 401 with a non-bearer header and no cookie", () => {
    mockState.header = "Basic xyz";
    try {
      extractRequestToken(event);
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as { statusCode?: number }).statusCode).toBe(401);
    }
  });
});
