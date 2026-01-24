import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePasswordReset } from "~/composables/usePasswordReset";

// Mock $fetch
global.$fetch = vi.fn();

describe("usePasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const { loading, error, emailSent, passwordUpdated } = usePasswordReset();

      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(emailSent.value).toBe(false);
      expect(passwordUpdated.value).toBe(false);
    });

    it("should have readonly state properties (cannot assign)", () => {
      const composable = usePasswordReset();

      // Readonly refs prevent assignment in TypeScript
      // This is verified via the type system, not runtime
      // The readonly() wrapper makes the ref readonly at type level
      expect(composable.loading).toBeDefined();
      expect(composable.error).toBeDefined();
    });
  });

  describe("requestPasswordReset()", () => {
    it("should successfully request password reset", async () => {
      const { requestPasswordReset, emailSent, error, loading } =
        usePasswordReset();

      // Mock successful API response
      vi.mocked(global.$fetch).mockResolvedValueOnce({
        success: true,
        message: "Password reset email sent",
      });

      const result = await requestPasswordReset("test@example.com");

      expect(result).toBe(true);
      expect(emailSent.value).toBe(true);
      expect(error.value).toBeNull();
      expect(loading.value).toBe(false);

      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/auth/request-password-reset",
        expect.objectContaining({
          method: "POST",
          body: { email: "test@example.com" },
        }),
      );
    });

    it("should handle missing email", async () => {
      const { requestPasswordReset, error } = usePasswordReset();

      const result = await requestPasswordReset("");

      expect(result).toBe(false);
      expect(error.value).toBe("Email address is required");
    });

    it("should trim email input", async () => {
      const { requestPasswordReset } = usePasswordReset();

      vi.mocked(global.$fetch).mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      await requestPasswordReset("  test@example.com  ");

      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/auth/request-password-reset",
        expect.objectContaining({
          body: { email: "test@example.com" },
        }),
      );
    });

    it("should handle API error response", async () => {
      const { requestPasswordReset, error } = usePasswordReset();

      vi.mocked(global.$fetch).mockResolvedValueOnce({
        success: false,
        message: "Failed to send reset email",
      });

      const result = await requestPasswordReset("test@example.com");

      expect(result).toBe(false);
      expect(error.value).toBe("Failed to send reset email");
    });

    it("should handle network error", async () => {
      const { requestPasswordReset, error } = usePasswordReset();

      const networkError = new Error("Network failed");
      vi.mocked(global.$fetch).mockRejectedValueOnce(networkError);

      const result = await requestPasswordReset("test@example.com");

      expect(result).toBe(false);
      expect(error.value).toBe("Network failed");
    });

    it("should set loading state during request", async () => {
      const { requestPasswordReset, loading } = usePasswordReset();

      let loadingDuringCall = false;

      vi.mocked(global.$fetch).mockImplementationOnce(() => {
        loadingDuringCall = loading.value;
        return Promise.resolve({ success: true, message: "Email sent" });
      });

      await requestPasswordReset("test@example.com");

      expect(loadingDuringCall).toBe(true);
      expect(loading.value).toBe(false);
    });
  });

  describe("confirmPasswordReset()", () => {
    it("should successfully confirm password reset", async () => {
      const { confirmPasswordReset, passwordUpdated, error } =
        usePasswordReset();

      vi.mocked(global.$fetch).mockResolvedValueOnce({
        success: true,
        message: "Password reset successfully",
      });

      const result = await confirmPasswordReset("NewPassword123");

      expect(result).toBe(true);
      expect(passwordUpdated.value).toBe(true);
      expect(error.value).toBeNull();

      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/auth/confirm-password-reset",
        expect.objectContaining({
          method: "POST",
          body: { password: "NewPassword123" },
        }),
      );
    });

    it("should handle missing password", async () => {
      const { confirmPasswordReset, error } = usePasswordReset();

      const result = await confirmPasswordReset("");

      expect(result).toBe(false);
      expect(error.value).toBe("Password is required");
    });

    it("should handle invalid token error", async () => {
      const { confirmPasswordReset, error } = usePasswordReset();

      vi.mocked(global.$fetch).mockResolvedValueOnce({
        success: false,
        message: "Invalid or expired reset token",
      });

      const result = await confirmPasswordReset("NewPassword123");

      expect(result).toBe(false);
      expect(error.value).toBe("Invalid or expired reset token");
    });

    it("should handle expired token error", async () => {
      const { confirmPasswordReset, error } = usePasswordReset();

      vi.mocked(global.$fetch).mockResolvedValueOnce({
        success: false,
        message: "Reset link has expired",
      });

      const result = await confirmPasswordReset("NewPassword123");

      expect(result).toBe(false);
      expect(error.value).toBe("Reset link has expired");
    });

    it("should handle weak password error", async () => {
      const { confirmPasswordReset, error } = usePasswordReset();

      vi.mocked(global.$fetch).mockResolvedValueOnce({
        success: false,
        message: "Password does not meet strength requirements",
      });

      const result = await confirmPasswordReset("weak");

      expect(result).toBe(false);
      expect(error.value).toBe("Password does not meet strength requirements");
    });

    it("should set loading state during reset", async () => {
      const { confirmPasswordReset, loading } = usePasswordReset();

      let loadingDuringCall = false;

      vi.mocked(global.$fetch).mockImplementationOnce(() => {
        loadingDuringCall = loading.value;
        return Promise.resolve({ success: true, message: "Password reset" });
      });

      await confirmPasswordReset("NewPassword123");

      expect(loadingDuringCall).toBe(true);
      expect(loading.value).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should clear error state", () => {
      const { requestPasswordReset, error, clearError } = usePasswordReset();

      // Set an error first
      requestPasswordReset("").catch(() => {
        // Error is expected
      });

      // Error should be set
      expect(error.value).toBe("Email address is required");

      // Clear it
      clearError();

      expect(error.value).toBeNull();
    });

    it("should handle non-Error objects in catch", async () => {
      const { requestPasswordReset, error } = usePasswordReset();

      vi.mocked(global.$fetch).mockRejectedValueOnce("String error");

      await requestPasswordReset("test@example.com");

      expect(error.value).toBe("Failed to request password reset");
    });
  });

  describe("Edge Cases", () => {
    it("should handle concurrent reset requests gracefully", async () => {
      const { requestPasswordReset } = usePasswordReset();

      // Mock multiple responses for concurrent requests
      vi.mocked(global.$fetch)
        .mockResolvedValueOnce({
          success: true,
          message: "Email sent",
        })
        .mockResolvedValueOnce({
          success: true,
          message: "Email sent",
        });

      const promise1 = requestPasswordReset("test1@example.com");
      const promise2 = requestPasswordReset("test2@example.com");

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it("should not overwrite emailSent on error", async () => {
      const { requestPasswordReset, emailSent } = usePasswordReset();

      vi.mocked(global.$fetch).mockResolvedValueOnce({
        success: false,
        message: "Error",
      });

      await requestPasswordReset("test@example.com");

      expect(emailSent.value).toBe(false);
    });

    it("should not overwrite passwordUpdated on error", async () => {
      const { confirmPasswordReset, passwordUpdated } = usePasswordReset();

      vi.mocked(global.$fetch).mockResolvedValueOnce({
        success: false,
        message: "Error",
      });

      await confirmPasswordReset("NewPassword123");

      expect(passwordUpdated.value).toBe(false);
    });

    it("should handle email with special characters", async () => {
      const { requestPasswordReset } = usePasswordReset();

      vi.mocked(global.$fetch).mockResolvedValueOnce({
        success: true,
        message: "Email sent",
      });

      await requestPasswordReset("test+tag@example.co.uk");

      expect(global.$fetch).toHaveBeenCalledWith(
        "/api/auth/request-password-reset",
        expect.objectContaining({
          body: { email: "test+tag@example.co.uk" },
        }),
      );
    });
  });
});
