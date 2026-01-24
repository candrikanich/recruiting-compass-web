import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useEmailVerification } from "~/composables/useEmailVerification";
import { useSupabase } from "~/composables/useSupabase";
import type { User } from "@supabase/supabase-js";

// Mock useSupabase and $fetch
vi.mock("~/composables/useSupabase");
vi.stubGlobal("$fetch", vi.fn());

const mockUseSupabase = vi.mocked(useSupabase);
const mock$fetch = vi.mocked(global.$fetch);

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

  const getMockSupabase = (user: User = mockUnverifiedUser) => {
    const mockAuth = {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    };

    const mockSupabase = {
      auth: mockAuth,
    };

    mockUseSupabase.mockReturnValue(mockSupabase as any);
    return { mockSupabase, mockAuth };
  };

  describe("Initial State", () => {
    it("should return correct initial state", () => {
      getMockSupabase();

      const verification = useEmailVerification();

      expect(verification.loading.value).toBe(false);
      expect(verification.error.value).toBe(null);
      expect(verification.isVerified.value).toBe(false);
      expect(typeof verification.verifyEmailToken).toBe("function");
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

  describe("verifyEmailToken", () => {
    it("should verify email token successfully", async () => {
      getMockSupabase();

      mock$fetch.mockResolvedValue({
        success: true,
        message: "Email verified successfully!",
      });

      const verification = useEmailVerification();
      const result = await verification.verifyEmailToken("valid-token");

      expect(mock$fetch).toHaveBeenCalledWith("/api/auth/verify-email", {
        method: "POST",
        body: { token: "valid-token" },
      });
      expect(verification.loading.value).toBe(false);
      expect(verification.error.value).toBe(null);
      expect(verification.isVerified.value).toBe(true);
      expect(result).toBe(true);
    });

    it("should handle verification with already verified email", async () => {
      getMockSupabase();

      mock$fetch.mockResolvedValue({
        success: true,
        message: "Your email is already verified.",
      });

      const verification = useEmailVerification();
      const result = await verification.verifyEmailToken("valid-token");

      expect(result).toBe(true);
      expect(verification.isVerified.value).toBe(true);
    });

    it("should handle invalid token", async () => {
      getMockSupabase();

      mock$fetch.mockResolvedValue({
        success: false,
        message: "Verification link is invalid. Please request a new one.",
      });

      const verification = useEmailVerification();
      const result = await verification.verifyEmailToken("invalid-token");

      expect(result).toBe(false);
      expect(verification.error.value).toBe(
        "Verification link is invalid. Please request a new one."
      );
      expect(verification.isVerified.value).toBe(false);
    });

    it("should handle expired token", async () => {
      getMockSupabase();

      mock$fetch.mockResolvedValue({
        success: false,
        message: "Verification link has expired. Please request a new one.",
      });

      const verification = useEmailVerification();
      const result = await verification.verifyEmailToken("expired-token");

      expect(result).toBe(false);
      expect(verification.error.value).toBe(
        "Verification link has expired. Please request a new one."
      );
    });

    it("should reject empty token", async () => {
      getMockSupabase();

      const verification = useEmailVerification();
      const result = await verification.verifyEmailToken("");

      expect(mock$fetch).not.toHaveBeenCalled();
      expect(result).toBe(false);
      expect(verification.error.value).toBe("Verification token is missing");
    });

    it("should handle API errors", async () => {
      getMockSupabase();

      const apiError = new Error("Network error");
      mock$fetch.mockRejectedValue(apiError);

      const verification = useEmailVerification();
      const result = await verification.verifyEmailToken("token");

      expect(result).toBe(false);
      expect(verification.error.value).toBe("Network error");
      expect(verification.loading.value).toBe(false);
    });

    it("should set loading state during verification", async () => {
      getMockSupabase();

      let resolvePromise: (value: any) => void;
      const verifyPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mock$fetch.mockReturnValue(verifyPromise as any);

      const verification = useEmailVerification();
      const verifyCall = verification.verifyEmailToken("token");

      expect(verification.loading.value).toBe(true);

      resolvePromise!({ success: true, message: "Verified!" });
      await verifyCall;

      expect(verification.loading.value).toBe(false);
    });

    it("should trim whitespace from token", async () => {
      getMockSupabase();

      mock$fetch.mockResolvedValue({
        success: true,
        message: "Email verified successfully!",
      });

      const verification = useEmailVerification();
      await verification.verifyEmailToken("  valid-token  ");

      expect(mock$fetch).toHaveBeenCalledWith("/api/auth/verify-email", {
        method: "POST",
        body: { token: "valid-token" },
      });
    });
  });

  describe("resendVerificationEmail", () => {
    it("should resend verification email successfully", async () => {
      getMockSupabase();

      mock$fetch.mockResolvedValue({
        success: true,
        message: "Verification email sent successfully.",
      });

      const verification = useEmailVerification();
      const result = await verification.resendVerificationEmail("test@example.com");

      expect(mock$fetch).toHaveBeenCalledWith("/api/auth/resend-verification", {
        method: "POST",
        body: { email: "test@example.com" },
      });
      expect(verification.loading.value).toBe(false);
      expect(verification.error.value).toBe(null);
      expect(result).toBe(true);
    });

    it("should reject empty email", async () => {
      getMockSupabase();

      const verification = useEmailVerification();
      const result = await verification.resendVerificationEmail("");

      expect(mock$fetch).not.toHaveBeenCalled();
      expect(result).toBe(false);
      expect(verification.error.value).toBe("Email address is required");
    });

    it("should handle already verified email", async () => {
      getMockSupabase();

      mock$fetch.mockResolvedValue({
        success: true,
        message: "Your email is already verified.",
      });

      const verification = useEmailVerification();
      const result = await verification.resendVerificationEmail("test@example.com");

      expect(result).toBe(true);
    });

    it("should handle rate limiting", async () => {
      getMockSupabase();

      mock$fetch.mockResolvedValue({
        success: false,
        message:
          "Too many verification requests. Please wait a few minutes before trying again.",
      });

      const verification = useEmailVerification();
      const result = await verification.resendVerificationEmail("test@example.com");

      expect(result).toBe(false);
      expect(verification.error.value).toContain("Too many verification requests");
    });

    it("should handle API errors during resend", async () => {
      getMockSupabase();

      const apiError = new Error("Server error");
      mock$fetch.mockRejectedValue(apiError);

      const verification = useEmailVerification();
      const result = await verification.resendVerificationEmail("test@example.com");

      expect(result).toBe(false);
      expect(verification.error.value).toBe("Server error");
    });

    it("should set loading state during resend", async () => {
      getMockSupabase();

      let resolvePromise: (value: any) => void;
      const resendPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mock$fetch.mockReturnValue(resendPromise as any);

      const verification = useEmailVerification();
      const resendCall = verification.resendVerificationEmail("test@example.com");

      expect(verification.loading.value).toBe(true);

      resolvePromise!({ success: true, message: "Sent!" });
      await resendCall;

      expect(verification.loading.value).toBe(false);
    });

    it("should trim whitespace from email", async () => {
      getMockSupabase();

      mock$fetch.mockResolvedValue({
        success: true,
        message: "Verification email sent successfully.",
      });

      const verification = useEmailVerification();
      await verification.resendVerificationEmail("  test@example.com  ");

      expect(mock$fetch).toHaveBeenCalledWith("/api/auth/resend-verification", {
        method: "POST",
        body: { email: "test@example.com" },
      });
    });
  });

  describe("checkEmailVerificationStatus", () => {
    it("should return true for verified email", async () => {
      getMockSupabase(mockVerifiedUser);

      const verification = useEmailVerification();
      const result = await verification.checkEmailVerificationStatus();

      expect(result).toBe(true);
      expect(verification.isVerified.value).toBe(true);
      expect(verification.error.value).toBe(null);
    });

    it("should return false for unverified email", async () => {
      getMockSupabase(mockUnverifiedUser);

      const verification = useEmailVerification();
      const result = await verification.checkEmailVerificationStatus();

      expect(result).toBe(false);
      expect(verification.isVerified.value).toBe(false);
      expect(verification.error.value).toBe(null);
    });

    it("should handle no active session", async () => {
      const { mockAuth } = getMockSupabase();
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const verification = useEmailVerification();
      const result = await verification.checkEmailVerificationStatus();

      expect(result).toBe(false);
      expect(verification.isVerified.value).toBe(false);
      expect(verification.error.value).toBe("Unable to verify user session");
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

      mock$fetch.mockResolvedValue({
        success: false,
        message: "Some error",
      });

      const verification = useEmailVerification();
      await verification.verifyEmailToken("token");

      expect(verification.error.value).not.toBe(null);

      verification.clearError();

      expect(verification.error.value).toBe(null);
    });
  });

  describe("State Management", () => {
    it("should clear loading state on success", async () => {
      getMockSupabase();

      mock$fetch.mockResolvedValue({
        success: true,
        message: "Success",
      });

      const verification = useEmailVerification();
      await verification.verifyEmailToken("token");

      expect(verification.loading.value).toBe(false);
    });

    it("should clear loading state on error", async () => {
      getMockSupabase();

      mock$fetch.mockRejectedValue(new Error("Error"));

      const verification = useEmailVerification();
      await verification.verifyEmailToken("token");

      expect(verification.loading.value).toBe(false);
    });

    it("should clear previous errors when attempting new verification", async () => {
      getMockSupabase();

      // First call fails
      mock$fetch.mockResolvedValueOnce({
        success: false,
        message: "First error",
      });

      const verification = useEmailVerification();
      await verification.verifyEmailToken("token1");
      expect(verification.error.value).toBe("First error");

      // Second call succeeds
      mock$fetch.mockResolvedValueOnce({
        success: true,
        message: "Success",
      });

      await verification.verifyEmailToken("token2");
      expect(verification.error.value).toBe(null);
    });
  });

  describe("Error Handling", () => {
    it("should handle non-Error objects in verifyEmailToken", async () => {
      getMockSupabase();

      mock$fetch.mockRejectedValue("String error");

      const verification = useEmailVerification();
      const result = await verification.verifyEmailToken("token");

      expect(result).toBe(false);
      // When non-Error is rejected, it gets wrapped with a generic message
      expect(verification.error.value).toBe("Email verification failed");
    });

    it("should handle non-Error objects in resendVerificationEmail", async () => {
      getMockSupabase();

      mock$fetch.mockRejectedValue("String error");

      const verification = useEmailVerification();
      const result = await verification.resendVerificationEmail("test@example.com");

      expect(result).toBe(false);
      // When non-Error is rejected, it gets wrapped with a generic message
      expect(verification.error.value).toBe("Failed to resend verification email");
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
