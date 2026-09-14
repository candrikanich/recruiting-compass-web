import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useEmailVerification } from "~/composables/useEmailVerification";
import { useSupabase } from "~/composables/useSupabase";
import type { User } from "@supabase/supabase-js";

// The resend endpoint is requireAuth-gated and this app sets no auth cookie,
// so the composable must go through useAuthFetch's $fetchAuth (which injects
// the Bearer token + CSRF header) — mocking a bare global $fetch would pass
// regardless of which mechanism the code actually used.
const mock$fetchAuth = vi.fn();
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mock$fetchAuth }),
}));

vi.mock("~/composables/useSupabase");
vi.stubGlobal("$fetch", vi.fn());

const mockUseSupabase = vi.mocked(useSupabase);

describe("useEmailVerification", () => {
  const mockUnverifiedUser: User = {
    id: "user-123",
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    email_confirmed_at: null,
    user_metadata: { full_name: "Test User" },
    app_metadata: {},
  };

  const mockVerifiedUser: User = {
    ...mockUnverifiedUser,
    email_confirmed_at: "2024-01-02T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const getMockSupabase = (
    user: User = mockUnverifiedUser,
    emailVerifiedAt: string | null = null,
  ) => {
    const mockAuth = {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    };

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { email_verified_at: emailVerifiedAt },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    const mockSupabase = {
      auth: mockAuth,
      from: mockFrom,
    };

    mockUseSupabase.mockReturnValue(mockSupabase as any);
    return { mockSupabase, mockAuth, mockFrom, mockMaybeSingle };
  };

  describe("Initial State", () => {
    it("should return correct initial state", () => {
      getMockSupabase();

      const verification = useEmailVerification();

      expect(verification.loading.value).toBe(false);
      expect(verification.error.value).toBe(null);
      expect(verification.isVerified.value).toBe(false);
      expect(typeof verification.resendVerificationEmail).toBe("function");
      expect(typeof verification.checkEmailVerificationStatus).toBe("function");
      expect(typeof verification.clearError).toBe("function");
    });

    it("should return readonly state refs", () => {
      getMockSupabase();

      const verification = useEmailVerification();

      expect(verification.loading).toBeDefined();
      expect(verification.error).toBeDefined();
      expect(verification.isVerified).toBeDefined();
    });
  });

  describe("resendVerificationEmail", () => {
    it("should resend verification email successfully", async () => {
      getMockSupabase();

      mock$fetchAuth.mockResolvedValue({ success: true });

      const verification = useEmailVerification();
      const result = await verification.resendVerificationEmail();

      expect(mock$fetchAuth).toHaveBeenCalledWith(
        "/api/auth/verify-email/resend",
        { method: "POST" },
      );
      // Explicitly NOT the unauthenticated global $fetch — that would 401.
      expect(global.$fetch).not.toHaveBeenCalled();
      expect(verification.loading.value).toBe(false);
      expect(verification.error.value).toBe(null);
      expect(result).toBe(true);
    });

    it("should surface a failure response", async () => {
      getMockSupabase();

      mock$fetchAuth.mockResolvedValue({ success: false });

      const verification = useEmailVerification();
      const result = await verification.resendVerificationEmail();

      expect(result).toBe(false);
      expect(verification.error.value).toBe(
        "Failed to resend verification email",
      );
    });

    it("should handle API errors during resend", async () => {
      getMockSupabase();

      const apiError = new Error("Server error");
      mock$fetchAuth.mockRejectedValue(apiError);

      const verification = useEmailVerification();
      const result = await verification.resendVerificationEmail();

      expect(result).toBe(false);
      expect(verification.error.value).toBe("Server error");
    });

    it("should set loading state during resend", async () => {
      getMockSupabase();

      let resolvePromise: (value: any) => void;
      const resendPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mock$fetchAuth.mockReturnValue(resendPromise as any);

      const verification = useEmailVerification();
      const resendCall = verification.resendVerificationEmail();

      expect(verification.loading.value).toBe(true);

      resolvePromise!({ success: true });
      await resendCall;

      expect(verification.loading.value).toBe(false);
    });
  });

  describe("checkEmailVerificationStatus", () => {
    it("should return true when users.email_verified_at is set", async () => {
      const { mockFrom, mockMaybeSingle } = getMockSupabase(
        mockVerifiedUser,
        "2024-01-02T00:00:00Z",
      );

      const verification = useEmailVerification();
      const result = await verification.checkEmailVerificationStatus();

      expect(result).toBe(true);
      expect(verification.isVerified.value).toBe(true);
      expect(verification.error.value).toBe(null);
      expect(mockFrom).toHaveBeenCalledWith("users");
      expect(mockMaybeSingle).toHaveBeenCalled();
    });

    it("should return false when users.email_verified_at is null", async () => {
      getMockSupabase(mockUnverifiedUser, null);

      const verification = useEmailVerification();
      const result = await verification.checkEmailVerificationStatus();

      expect(result).toBe(false);
      expect(verification.isVerified.value).toBe(false);
      expect(verification.error.value).toBe(null);
    });

    it("should handle no active session without surfacing an error", async () => {
      // supabase-js's getUser() returns AuthSessionMissingError (not a plain
      // null/null pair) when there's no session locally — the normal state
      // for a brand-new signup awaiting email confirmation, not a failure.
      const { mockAuth } = getMockSupabase();
      const sessionMissingError = new Error("Auth session missing!");
      sessionMissingError.name = "AuthSessionMissingError";
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: sessionMissingError,
      });

      const verification = useEmailVerification();
      const result = await verification.checkEmailVerificationStatus();

      expect(result).toBe(false);
      expect(verification.isVerified.value).toBe(false);
      expect(verification.error.value).toBe(null);
    });

    it("should handle auth error", async () => {
      const { mockAuth } = getMockSupabase();
      const authError = new Error("Auth failed");
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      const verification = useEmailVerification();
      const result = await verification.checkEmailVerificationStatus();

      expect(result).toBe(false);
      expect(verification.error.value).toBe("Unable to verify user session");
    });

    it("should set loading state during check", async () => {
      const { mockAuth } = getMockSupabase();

      let resolvePromise: (value: any) => void;
      const checkPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockAuth.getUser.mockReturnValue(checkPromise as any);

      const verification = useEmailVerification();
      const checkCall = verification.checkEmailVerificationStatus();

      expect(verification.loading.value).toBe(true);

      resolvePromise!({
        data: { user: mockVerifiedUser },
        error: null,
      });
      await checkCall;

      expect(verification.loading.value).toBe(false);
    });
  });

  describe("clearError", () => {
    it("should clear error message", async () => {
      getMockSupabase();

      mock$fetchAuth.mockResolvedValue({
        success: false,
      });

      const verification = useEmailVerification();
      await verification.resendVerificationEmail();

      expect(verification.error.value).not.toBe(null);

      verification.clearError();

      expect(verification.error.value).toBe(null);
    });
  });

  describe("State Management", () => {
    it("should clear loading state on success", async () => {
      getMockSupabase();

      mock$fetchAuth.mockResolvedValue({ success: true });

      const verification = useEmailVerification();
      await verification.resendVerificationEmail();

      expect(verification.loading.value).toBe(false);
    });

    it("should clear loading state on error", async () => {
      getMockSupabase();

      mock$fetchAuth.mockRejectedValue(new Error("Error"));

      const verification = useEmailVerification();
      await verification.resendVerificationEmail();

      expect(verification.loading.value).toBe(false);
    });

    it("should clear previous errors when attempting a new action", async () => {
      getMockSupabase();

      // First call fails
      mock$fetchAuth.mockResolvedValueOnce({ success: false });

      const verification = useEmailVerification();
      await verification.resendVerificationEmail();
      expect(verification.error.value).toBe(
        "Failed to resend verification email",
      );

      // Second call succeeds
      mock$fetchAuth.mockResolvedValueOnce({ success: true });

      await verification.resendVerificationEmail();
      expect(verification.error.value).toBe(null);
    });
  });

  describe("Error Handling", () => {
    it("should handle non-Error objects in resendVerificationEmail", async () => {
      getMockSupabase();

      mock$fetchAuth.mockRejectedValue("String error");

      const verification = useEmailVerification();
      const result =
        await verification.resendVerificationEmail("test@example.com");

      expect(result).toBe(false);
      // When non-Error is rejected, it gets wrapped with a generic message
      expect(verification.error.value).toBe(
        "Failed to resend verification email",
      );
    });

    it("should handle exceptions in checkEmailVerificationStatus", async () => {
      const { mockAuth } = getMockSupabase();

      mockAuth.getUser.mockRejectedValue(new Error("Network error"));

      const verification = useEmailVerification();
      const result = await verification.checkEmailVerificationStatus();

      expect(result).toBe(false);
      expect(verification.error.value).toBe("Network error");
    });
  });
});
