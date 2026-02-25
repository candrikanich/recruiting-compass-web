import { describe, it, expect, beforeEach, vi } from "vitest";
import type { H3Event } from "h3";
import type { Database } from "~/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireAuth,
  getUserRole,
  isParentViewingLinkedAthlete,
  canMutateAthleteData,
  assertNotParent,
  type AuthUser,
} from "~/server/utils/auth";

// Mock h3 module
vi.mock("h3", () => ({
  createError: (config: any) => {
    const err = new Error(config.statusMessage) as any;
    err.statusCode = config.statusCode;
    err.statusMessage = config.statusMessage;
    return err;
  },
  getHeader: vi.fn(),
  getCookie: vi.fn(),
}));

// Mock Supabase client
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  })),
}));

// Mock logger
vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

import { getHeader, getCookie, createError } from "h3";
import { createClient } from "@supabase/supabase-js";

describe("server/utils/auth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe("requireAuth", () => {
    beforeEach(() => {
      process.env.NUXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    });

    it("should extract token from Authorization header", async () => {
      const mockEvent = {} as H3Event;
      vi.mocked(getHeader).mockReturnValue("Bearer test-token-123");
      vi.mocked(getCookie).mockReturnValue(null);

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "user-123",
                email: "test@example.com",
                user_metadata: { role: "player" },
              },
            },
            error: null,
          }),
        },
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await requireAuth(mockEvent);

      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
        user_metadata: { role: "player" },
      });
    });

    it("should fall back to cookie for token", async () => {
      const mockEvent = {} as H3Event;
      vi.mocked(getHeader).mockReturnValue(null);
      vi.mocked(getCookie).mockReturnValue("cookie-token-123");

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "user-456",
                email: "cookie@example.com",
                user_metadata: null,
              },
            },
            error: null,
          }),
        },
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const result = await requireAuth(mockEvent);

      expect(result.id).toBe("user-456");
      expect(result.email).toBe("cookie@example.com");
    });

    it("should throw 401 when no token found", async () => {
      const mockEvent = {} as H3Event;
      vi.mocked(getHeader).mockReturnValue(null);
      vi.mocked(getCookie).mockReturnValue(null);

      await expect(requireAuth(mockEvent)).rejects.toThrow("Unauthorized");
    });

    it("should throw 401 when token is invalid", async () => {
      const mockEvent = {} as H3Event;
      vi.mocked(getHeader).mockReturnValue("Bearer invalid-token");
      vi.mocked(getCookie).mockReturnValue(null);

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error("Invalid token"),
          }),
        },
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      await expect(requireAuth(mockEvent)).rejects.toThrow("Invalid token");
    });

    it("should throw 401 when Supabase returns error", async () => {
      const mockEvent = {} as H3Event;
      vi.mocked(getHeader).mockReturnValue("Bearer token");
      vi.mocked(getCookie).mockReturnValue(null);

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "Auth error" },
          }),
        },
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      await expect(requireAuth(mockEvent)).rejects.toThrow();
    });

    it("should throw 401 when Supabase credentials missing", async () => {
      const mockEvent = {} as H3Event;
      delete process.env.NUXT_PUBLIC_SUPABASE_URL;
      vi.mocked(getHeader).mockReturnValue("Bearer token");
      vi.mocked(getCookie).mockReturnValue(null);

      await expect(requireAuth(mockEvent)).rejects.toThrow();
    });
  });

  describe("getUserRole", () => {
    it("should fetch role from database", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: "player" },
            error: null,
          }),
        }),
      } as any;

      const result = await getUserRole("user-123", mockSupabase);

      expect(result).toBe("player");
    });

    it("should return null on database error", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Error" },
          }),
        }),
      } as any;

      const result = await getUserRole("user-error-123", mockSupabase);

      expect(result).toBeNull();
    });

    it("should cache role for subsequent calls", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: "parent" },
            error: null,
          }),
        }),
      } as any;

      // First call - should query DB
      const result1 = await getUserRole("user-cached-123", mockSupabase);
      expect(result1).toBe("parent");
      const firstCallCount = vi.mocked(mockSupabase.from).mock.calls.length;

      // Second call - should use cache and not query DB again
      const result2 = await getUserRole("user-cached-123", mockSupabase);
      expect(result2).toBe("parent");
      const secondCallCount = vi.mocked(mockSupabase.from).mock.calls.length;

      // Should have same call count (cache prevented second call)
      expect(secondCallCount).toBe(firstCallCount);
    });

    it("should handle non-object data response", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as any;

      const result = await getUserRole("user-null-data-123", mockSupabase);

      expect(result).toBeNull();
    });

    it("should handle query exception", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockRejectedValue(new Error("Network error")),
        }),
      } as any;

      const result = await getUserRole("user-exception-123", mockSupabase);

      expect(result).toBeNull();
    });
  });

  describe("isParentViewingLinkedAthlete", () => {
    it("should return true when account link exists and verified", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "link-123" },
            error: null,
          }),
        }),
      } as any;

      const result = await isParentViewingLinkedAthlete(
        "parent-123",
        "athlete-456",
        mockSupabase,
      );

      expect(result).toBe(true);
    });

    it("should return false when account link does not exist", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Not found" },
          }),
        }),
      } as any;

      const result = await isParentViewingLinkedAthlete(
        "parent-123",
        "athlete-456",
        mockSupabase,
      );

      expect(result).toBe(false);
    });

    it("should return false on database error", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockRejectedValue(new Error("DB error")),
        }),
      } as any;

      const result = await isParentViewingLinkedAthlete(
        "parent-123",
        "athlete-456",
        mockSupabase,
      );

      expect(result).toBe(false);
    });
  });

  describe("canMutateAthleteData", () => {
    it("should allow athlete to mutate own data", async () => {
      const mockSupabase = {} as any;

      const result = await canMutateAthleteData(
        "user-123",
        "user-123",
        mockSupabase,
      );

      expect(result).toBe(true);
    });

    it("should not allow parent to mutate athlete data", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: "parent" },
            error: null,
          }),
        }),
      } as any;

      const result = await canMutateAthleteData(
        "parent-123",
        "athlete-456",
        mockSupabase,
      );

      expect(result).toBe(false);
    });

    it("should not allow cross-user mutations", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: "player" },
            error: null,
          }),
        }),
      } as any;

      const result = await canMutateAthleteData(
        "user-123",
        "user-456",
        mockSupabase,
      );

      expect(result).toBe(false);
    });
  });

  describe("getUserRole - role cache size limit", () => {
    it("evicts the oldest entry when role cache exceeds 1000 entries", async () => {
      // Build a fresh supabase mock that always resolves with role "player"
      const mockSingle = vi.fn().mockResolvedValue({
        data: { role: "player" },
        error: null,
      });
      const mockEq = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      const mockFrom = vi.fn(() => ({ select: mockSelect }));
      const mockSupabase = { from: mockFrom } as unknown as SupabaseClient<Database>;

      // Fill the cache past the limit (1001 unique user IDs)
      for (let i = 0; i < 1001; i++) {
        await getUserRole(`size-test-user-${i}`, mockSupabase);
      }

      // Reset call count so we can detect re-fetches
      mockFrom.mockClear();

      // user-0 should have been evicted — expect a DB call
      await getUserRole("size-test-user-0", mockSupabase);
      expect(mockFrom).toHaveBeenCalled();
    });
  });

  describe("assertNotParent", () => {
    it("should not throw when user is not parent", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: "player" },
            error: null,
          }),
        }),
      } as any;

      await expect(
        assertNotParent("user-123", mockSupabase),
      ).resolves.not.toThrow();
    });

    it("should throw 403 when user is parent", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: "parent" },
            error: null,
          }),
        }),
      } as any;

      await expect(assertNotParent("parent-123", mockSupabase)).rejects.toThrow(
        "Parents cannot perform",
      );
    });

    it("should not throw when role is null", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: null },
            error: null,
          }),
        }),
      } as any;

      await expect(
        assertNotParent("user-123", mockSupabase),
      ).resolves.not.toThrow();
    });
  });
});
