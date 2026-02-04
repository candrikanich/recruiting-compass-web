import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAuth } from "~/composables/useAuth";
import { useSupabase } from "~/composables/useSupabase";
import type { User, Session } from "@supabase/supabase-js";

// Mock useSupabase at module level
vi.mock("~/composables/useSupabase");

// Get the mocked useSupabase function
const mockUseSupabase = vi.mocked(useSupabase);

describe("useAuth - Extended Error Handling for Login", () => {
  const mockUser: User = {
    id: "user-123",
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user_metadata: { full_name: "Test User" },
    app_metadata: {},
  };

  const mockSession: Session = {
    user: mockUser,
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    expires_at: Date.now() / 1000 + 3600,
  };

  let mockSupabase: any;
  let mockAuth: any;

  beforeEach(() => {
    // Create fresh mock objects for each test
    mockAuth = {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: vi.fn(),
    };

    mockSupabase = {
      auth: mockAuth,
    };

    mockUseSupabase.mockReturnValue(mockSupabase);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Login with Invalid Credentials", () => {
    it("should set error state when login fails with invalid credentials", async () => {
      const invalidCredentialsError = new Error("Invalid login credentials");
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: invalidCredentialsError,
      });

      const auth = useAuth();

      await expect(
        auth.login("invalid@example.com", "wrongpassword"),
      ).rejects.toThrow("Invalid login credentials");

      expect(auth.error.value).toEqual(invalidCredentialsError);
      expect(auth.loading.value).toBe(false);
      expect(auth.session.value).toBe(null);
    });

    it("should set error state when login fails with user not found", async () => {
      const userNotFoundError = new Error("User not found");
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: userNotFoundError,
      });

      const auth = useAuth();

      await expect(
        auth.login("nonexistent@example.com", "password"),
      ).rejects.toThrow("User not found");

      expect(auth.error.value).toEqual(userNotFoundError);
    });

    it("should preserve error message through error state", async () => {
      const customError = new Error("Email or password is incorrect");
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: customError,
      });

      const auth = useAuth();

      await expect(auth.login("test@example.com", "wrong")).rejects.toThrow();

      expect(auth.error.value?.message).toBe("Email or password is incorrect");
    });
  });

  describe("Network Errors During Login", () => {
    it("should handle network errors during login", async () => {
      const networkError = new Error("Network error: Failed to fetch");
      mockAuth.signInWithPassword.mockRejectedValue(networkError);

      const auth = useAuth();

      await expect(auth.login("test@example.com", "password")).rejects.toThrow(
        "Network error: Failed to fetch",
      );

      expect(auth.error.value).toEqual(networkError);
      expect(auth.loading.value).toBe(false);
    });

    it("should handle timeout errors during login", async () => {
      const timeoutError = new Error("Request timeout");
      mockAuth.signInWithPassword.mockRejectedValue(timeoutError);

      const auth = useAuth();

      await expect(auth.login("test@example.com", "password")).rejects.toThrow(
        "Request timeout",
      );

      expect(auth.error.value?.message).toBe("Request timeout");
    });

    it("should handle non-Error objects thrown as errors", async () => {
      mockAuth.signInWithPassword.mockRejectedValue("String error");

      const auth = useAuth();

      await expect(auth.login("test@example.com", "password")).rejects.toThrow(
        "Login failed",
      );

      expect(auth.error.value).toBeInstanceOf(Error);
      expect(auth.error.value?.message).toBe("Login failed");
    });

    it("should handle null error thrown during login", async () => {
      mockAuth.signInWithPassword.mockRejectedValue(null);

      const auth = useAuth();

      await expect(auth.login("test@example.com", "password")).rejects.toThrow(
        "Login failed",
      );

      expect(auth.error.value?.message).toBe("Login failed");
    });
  });

  describe("Error Clearing on Successful Login", () => {
    it("should clear error on successful login after previous error", async () => {
      const auth = useAuth();

      // Simulate previous error
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: new Error("Previous error"),
      });

      await expect(auth.login("old@example.com", "password")).rejects.toThrow();
      expect(auth.error.value).not.toBeNull();

      // Now login successfully
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      await auth.login("test@example.com", "password");

      expect(auth.error.value).toBeNull();
      expect(auth.session.value).toEqual(mockSession);
    });

    it("should clear error state at start of login attempt", async () => {
      const auth = useAuth();

      // Set initial error
      // @ts-ignore - Set internal state for testing
      auth.error.value = new Error("Initial error");

      // Mock login that will eventually fail
      let resolvePromise: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolvePromise = resolve!;
      });

      mockAuth.signInWithPassword.mockReturnValue(loginPromise);

      const loginCall = auth.login("test@example.com", "password");

      // Error should be cleared at start
      expect(auth.error.value).toBeNull();

      resolvePromise!({
        data: { session: null, user: null },
        error: new Error("Login failed"),
      });

      await loginCall.catch(() => {});

      // Error should be set to the login error
      expect(auth.error.value?.message).toBe("Login failed");
    });
  });

  describe("Loading State Management During Login", () => {
    it("should set loading to true at start and false at end", async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const auth = useAuth();
      expect(auth.loading.value).toBe(false);

      let resolvePromise: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolvePromise = resolve!;
      });

      mockAuth.signInWithPassword.mockReturnValue(loginPromise);

      const loginCall = auth.login("test@example.com", "password");

      // Loading should be true immediately
      expect(auth.loading.value).toBe(true);

      resolvePromise!({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      await loginCall;

      expect(auth.loading.value).toBe(false);
    });

    it("should set loading to false even when login throws error", async () => {
      const loginError = new Error("Login failed");
      mockAuth.signInWithPassword.mockRejectedValue(loginError);

      const auth = useAuth();

      await expect(
        auth.login("test@example.com", "password"),
      ).rejects.toThrow();

      expect(auth.loading.value).toBe(false);
    });

    it("should set loading to false when error is returned from signInWithPassword", async () => {
      const loginError = new Error("Invalid credentials");
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: loginError,
      });

      const auth = useAuth();

      await expect(
        auth.login("test@example.com", "password"),
      ).rejects.toThrow();

      expect(auth.loading.value).toBe(false);
    });
  });

  describe("Login Error Edge Cases", () => {
    it("should handle error with session but user null", async () => {
      const loginError = new Error("Incomplete session");
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: null },
        error: loginError,
      });

      const auth = useAuth();

      await expect(
        auth.login("test@example.com", "password"),
      ).rejects.toThrow();

      expect(auth.error.value).toEqual(loginError);
      expect(auth.session.value).toBe(null);
    });

    it("should not store session preferences when login fails", async () => {
      const loginError = new Error("Invalid credentials");
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: loginError,
      });

      const auth = useAuth();

      await expect(
        auth.login("test@example.com", "password", true),
      ).rejects.toThrow();

      expect(localStorage.getItem("session_preferences")).toBeNull();
    });

    it("should not store session preferences when login throws", async () => {
      mockAuth.signInWithPassword.mockRejectedValue(new Error("Network error"));

      const auth = useAuth();

      await expect(
        auth.login("test@example.com", "password", true),
      ).rejects.toThrow();

      expect(localStorage.getItem("session_preferences")).toBeNull();
    });

    it("should handle repeated login attempts after error", async () => {
      const firstError = new Error("First attempt failed");
      const secondSuccess = {
        data: { session: mockSession, user: mockUser },
        error: null,
      };

      mockAuth.signInWithPassword
        .mockResolvedValueOnce({
          data: { session: null, user: null },
          error: firstError,
        })
        .mockResolvedValueOnce(secondSuccess);

      const auth = useAuth();

      // First attempt fails
      await expect(
        auth.login("test@example.com", "password"),
      ).rejects.toThrow();
      expect(auth.error.value).toEqual(firstError);

      // Second attempt succeeds
      await auth.login("test@example.com", "password");
      expect(auth.error.value).toBeNull();
      expect(auth.session.value).toEqual(mockSession);
    });
  });

  describe("Login Return Value on Error", () => {
    it("should not return successful data when error occurs", async () => {
      const loginError = new Error("Invalid credentials");
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: loginError,
      });

      const auth = useAuth();

      try {
        const result = await auth.login("test@example.com", "password");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toEqual(loginError);
      }
    });

    it("should throw the original error, not wrapped", async () => {
      const originalError = new Error("Custom auth error");
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: originalError,
      });

      const auth = useAuth();

      try {
        await auth.login("test@example.com", "password");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toEqual(originalError);
        expect(err).not.toBeUndefined();
      }
    });
  });

  describe("Session State on Login Error", () => {
    it("should not modify session state when login fails", async () => {
      const auth = useAuth();
      expect(auth.session.value).toBeNull();

      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: new Error("Login failed"),
      });

      await expect(
        auth.login("test@example.com", "password"),
      ).rejects.toThrow();

      expect(auth.session.value).toBeNull();
    });

    it("should update session only when login succeeds", async () => {
      const auth = useAuth();

      // Failed attempt
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: new Error("Failed"),
      });

      await expect(
        auth.login("test@example.com", "password"),
      ).rejects.toThrow();
      expect(auth.session.value).toBeNull();

      // Successful attempt
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      await auth.login("test@example.com", "password");
      expect(auth.session.value).toEqual(mockSession);
    });
  });
});
