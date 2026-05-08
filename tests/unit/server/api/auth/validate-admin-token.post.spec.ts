import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

// State objects read at call-time to avoid vi.mock hoisting issues
const mockState = {
  token: "valid-token" as string | number | undefined,
  isValid: true as boolean,
  adminTokenSecret: "test-secret",
};

vi.mock("~/server/utils/adminToken", () => ({
  validateAdminToken: vi.fn(() => mockState.isValid),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => ({ token: mockState.token })),
  };
});

vi.stubGlobal("defineEventHandler", (fn: Function) => fn);
vi.stubGlobal(
  "readBody",
  vi.fn(async () => ({ token: mockState.token })),
);
vi.stubGlobal(
  "useRuntimeConfig",
  vi.fn(() => ({ adminTokenSecret: mockState.adminTokenSecret })),
);
vi.stubGlobal("createError", createError);

import { validateAdminToken } from "~/server/utils/adminToken";

const { default: handler } =
  await import("~/server/api/auth/validate-admin-token.post");

describe("POST /api/auth/validate-admin-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.token = "valid-token";
    mockState.isValid = true;
    mockState.adminTokenSecret = "test-secret";
    vi.stubGlobal("createError", createError);
    vi.stubGlobal(
      "useRuntimeConfig",
      vi.fn(() => ({ adminTokenSecret: mockState.adminTokenSecret })),
    );
    vi.mocked(validateAdminToken).mockImplementation(() => mockState.isValid);
  });

  describe("happy path", () => {
    it("returns valid: true when token is correct", async () => {
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toEqual({ valid: true });
    });

    it("calls validateAdminToken with token and secret", async () => {
      mockState.token = "my-token";

      await handler({} as Parameters<typeof handler>[0]);

      expect(validateAdminToken).toHaveBeenCalledWith(
        "my-token",
        "test-secret",
      );
    });
  });

  describe("invalid token", () => {
    it("returns valid: false with message when token is invalid", async () => {
      mockState.isValid = false;

      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toEqual({
        valid: false,
        message: "Invalid admin registration token",
      });
    });
  });

  describe("missing token", () => {
    it("returns 400 when token is missing from body", async () => {
      mockState.token = undefined;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("returns 400 when token is an empty string", async () => {
      mockState.token = "";

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("returns 400 when token is not a string", async () => {
      mockState.token = 12345;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe("error handling", () => {
    it("returns 500 when an unexpected error occurs", async () => {
      vi.mocked(validateAdminToken).mockImplementation(() => {
        throw new Error("Unexpected DB error");
      });

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it("re-throws HTTP errors as-is", async () => {
      const httpError = createError({
        statusCode: 403,
        statusMessage: "Forbidden",
      });
      vi.mocked(validateAdminToken).mockImplementation(() => {
        throw httpError;
      });

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });
});
