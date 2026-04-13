import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

// State objects read at call-time to avoid vi.mock hoisting issues
const mockBodyState = {
  email: "admin@example.com" as string,
  fullName: "Admin User",
  adminToken: "valid-token" as string | null,
};
const mockAuthState = {
  userId: "user-1",
  shouldFail: false,
};
const mockAdminTokenState = {
  isValid: true as boolean,
  adminTokenSecret: "test-secret",
};
const mockDbState = {
  error: null as object | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => {
    if (mockAuthState.shouldFail) {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }
    return { id: mockAuthState.userId, role: "athlete" };
  }),
}));

vi.mock("~/server/utils/adminToken", () => ({
  validateAdminToken: vi.fn(() => mockAdminTokenState.isValid),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({ data: null, error: mockDbState.error }),
        ),
      })),
    })),
  })),
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
    readBody: vi.fn(async () => ({
      email: mockBodyState.email,
      fullName: mockBodyState.fullName,
      adminToken: mockBodyState.adminToken,
    })),
  };
});

vi.stubGlobal("defineEventHandler", (fn: Function) => fn);
vi.stubGlobal(
  "readBody",
  vi.fn(async () => ({
    email: mockBodyState.email,
    fullName: mockBodyState.fullName,
    adminToken: mockBodyState.adminToken,
  })),
);
vi.stubGlobal(
  "useRuntimeConfig",
  vi.fn(() => ({ adminTokenSecret: mockAdminTokenState.adminTokenSecret })),
);
vi.stubGlobal("createError", createError);

import { requireAuth } from "~/server/utils/auth";
import { validateAdminToken } from "~/server/utils/adminToken";
import { useSupabaseAdmin } from "~/server/utils/supabase";

const { default: handler } =
  await import("~/server/api/auth/admin-profile.post");

describe("POST /api/auth/admin-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBodyState.email = "admin@example.com";
    mockBodyState.fullName = "Admin User";
    mockBodyState.adminToken = "valid-token";
    mockAuthState.userId = "user-1";
    mockAuthState.shouldFail = false;
    mockAdminTokenState.isValid = true;
    mockAdminTokenState.adminTokenSecret = "test-secret";
    mockDbState.error = null;
    vi.stubGlobal("createError", createError);
    vi.stubGlobal(
      "useRuntimeConfig",
      vi.fn(() => ({ adminTokenSecret: mockAdminTokenState.adminTokenSecret })),
    );
    vi.mocked(requireAuth).mockImplementation(async () => {
      if (mockAuthState.shouldFail) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
      }
      return { id: mockAuthState.userId, role: "athlete" } as any;
    });
    vi.mocked(validateAdminToken).mockImplementation(
      () => mockAdminTokenState.isValid,
    );
    vi.mocked(useSupabaseAdmin).mockImplementation(
      () =>
        ({
          from: vi.fn(() => ({
            update: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({ data: null, error: mockDbState.error }),
              ),
            })),
          })),
        }) as any,
    );
  });

  describe("happy path", () => {
    it("returns success: true when profile is created", async () => {
      const result = await handler({} as Parameters<typeof handler>[0]);

      expect(result).toEqual({ success: true });
    });

    it("calls validateAdminToken with the token from body", async () => {
      await handler({} as Parameters<typeof handler>[0]);

      expect(validateAdminToken).toHaveBeenCalledWith(
        "valid-token",
        "test-secret",
      );
    });

    it("calls supabase.update with is_admin: true and role: parent", async () => {
      const mockEq = vi.fn(() => Promise.resolve({ data: null, error: null }));
      const mockUpdate = vi.fn(() => ({ eq: mockEq }));
      const mockFrom = vi.fn(() => ({ update: mockUpdate }));
      vi.mocked(useSupabaseAdmin).mockReturnValue({ from: mockFrom } as any);

      await handler({} as Parameters<typeof handler>[0]);

      expect(mockFrom).toHaveBeenCalledWith("users");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Admin User",
          role: "parent",
          is_admin: true,
        }),
      );
    });
  });

  describe("auth", () => {
    it("propagates auth errors when requireAuth rejects", async () => {
      mockAuthState.shouldFail = true;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  describe("input validation", () => {
    it("returns 400 when email is missing", async () => {
      mockBodyState.email = "";

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "email is required",
      });
    });

    it("returns 403 when adminToken is an empty string", async () => {
      mockBodyState.adminToken = "";

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("returns 403 when adminToken is null", async () => {
      mockBodyState.adminToken = null;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("returns 403 when adminToken is invalid", async () => {
      mockAdminTokenState.isValid = false;

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe("DB errors", () => {
    it("returns 500 when supabase update fails", async () => {
      mockDbState.error = { message: "DB error" };

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to create admin profile",
      });
    });

    it("returns 500 on unexpected thrown error", async () => {
      vi.mocked(useSupabaseAdmin).mockImplementation(() => {
        throw new Error("Supabase init failed");
      });

      await expect(
        handler({} as Parameters<typeof handler>[0]),
      ).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });
});
