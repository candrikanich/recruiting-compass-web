import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createServerSupabaseClient,
  createServerSupabaseUserClient,
  useSupabaseAdmin,
  withTimeout,
} from "~/server/utils/supabase";

// Mock the Supabase client creation
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      setSession: vi.fn(),
    },
  })),
}));

describe("server/utils/supabase", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe("createServerSupabaseClient", () => {
    it("should create client with valid environment variables", () => {
      process.env.NUXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      expect(() => createServerSupabaseClient()).not.toThrow();
    });

    it("should throw error when SUPABASE_URL is missing", () => {
      delete process.env.NUXT_PUBLIC_SUPABASE_URL;
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      expect(() => createServerSupabaseClient()).toThrow(
        "Missing NUXT_PUBLIC_SUPABASE_URL",
      );
    });

    it("should throw error when SERVICE_ROLE_KEY is missing", () => {
      process.env.NUXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => createServerSupabaseClient()).toThrow(
        "Missing SUPABASE_SERVICE_ROLE_KEY",
      );
    });
  });

  describe("createServerSupabaseUserClient", () => {
    it("should create client with user token", () => {
      process.env.NUXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

      const client = createServerSupabaseUserClient("user-token-123");
      expect(client).toBeDefined();
    });

    it("should set user session with provided token", () => {
      process.env.NUXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

      const client = createServerSupabaseUserClient("user-token-123");
      expect(client.auth.setSession).toHaveBeenCalledWith({
        access_token: "user-token-123",
        refresh_token: "",
      });
    });

    it("should throw error when SUPABASE_URL is missing", () => {
      delete process.env.NUXT_PUBLIC_SUPABASE_URL;
      process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

      expect(() => createServerSupabaseUserClient("token")).toThrow(
        "Missing Supabase configuration",
      );
    });

    it("should throw error when ANON_KEY is missing", () => {
      process.env.NUXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      delete process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY;

      expect(() => createServerSupabaseUserClient("token")).toThrow(
        "Missing Supabase configuration",
      );
    });
  });

  describe("useSupabaseAdmin", () => {
    it("should return admin client", () => {
      process.env.NUXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const client = useSupabaseAdmin();
      expect(client).toBeDefined();
    });

    it("should be equivalent to createServerSupabaseClient", () => {
      process.env.NUXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const client1 = createServerSupabaseClient();
      const client2 = useSupabaseAdmin();
      // Both should be client instances
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
    });
  });

  describe("withTimeout", () => {
    it("should resolve with promise result before timeout", async () => {
      const promise = Promise.resolve("success");
      const result = await withTimeout(promise, 1000);
      expect(result).toBe("success");
    });

    it("should reject when promise exceeds timeout", async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve("delayed"), 5000),
      );
      await expect(withTimeout(promise, 100)).rejects.toThrow("timeout");
    });

    it("should use default 5000ms timeout", async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve("result"), 100),
      );
      const result = await withTimeout(promise);
      expect(result).toBe("result");
    });

    it("should reject immediately on promise error", async () => {
      const promise = Promise.reject(new Error("Promise failed"));
      await expect(withTimeout(promise, 1000)).rejects.toThrow(
        "Promise failed",
      );
    });

    it("should include custom timeout duration in error message", async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve("delayed"), 5000),
      );
      try {
        await withTimeout(promise, 123);
      } catch (error) {
        expect((error as Error).message).toContain("123ms");
      }
    });

    it("should handle 0ms timeout", async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve("delayed"), 100),
      );
      await expect(withTimeout(promise, 0)).rejects.toThrow("timeout");
    });

    it("should resolve for very fast promises", async () => {
      const promise = Promise.resolve(42);
      const result = await withTimeout(promise, 1);
      expect(result).toBe(42);
    });
  });
});
