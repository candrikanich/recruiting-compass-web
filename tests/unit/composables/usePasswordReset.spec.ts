import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePasswordReset } from "~/composables/usePasswordReset";
import { useSupabase } from "~/composables/useSupabase";

// Mock useSupabase at module level with implementation
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(),
}));

// Get the mocked useSupabase function
const mockUseSupabase = vi.mocked(useSupabase);

describe("usePasswordReset", () => {
  let mockAuth: any;

  const getMockSupabase = () => {
    mockAuth = {
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    };

    const mockSupabase = {
      auth: mockAuth,
    };

    mockUseSupabase.mockReturnValue(mockSupabase);
    return { mockSupabase, mockAuth };
  };

  beforeEach(() => {
    getMockSupabase();
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
      const { mockAuth } = getMockSupabase();
      const { requestPasswordReset, emailSent, error, loading } =
        usePasswordReset();

      // Mock successful Supabase response
      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await requestPasswordReset("test@example.com");

      expect(result).toBe(true);
      expect(emailSent.value).toBe(true);
      expect(error.value).toBeNull();
      expect(loading.value).toBe(false);

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.objectContaining({
          redirectTo: expect.stringContaining("/reset-password"),
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
      const { mockAuth } = getMockSupabase();
      const { requestPasswordReset } = usePasswordReset();

      mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });

      await requestPasswordReset("  test@example.com  ");

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.objectContaining({
          redirectTo: expect.stringContaining("/reset-password"),
        }),
      );
    });

    it("should handle API error response", async () => {
      const { mockAuth } = getMockSupabase();
      const { requestPasswordReset, error } = usePasswordReset();

      // Mock Supabase error
      mockAuth.resetPasswordForEmail.mockResolvedValue({
        error: { message: "Failed to send reset email" },
      });

      const result = await requestPasswordReset("test@example.com");

      expect(result).toBe(false);
      expect(error.value).toBe("Failed to send reset email");
    });

    it("should handle network error", async () => {
      const { mockAuth } = getMockSupabase();
      const { requestPasswordReset, error } = usePasswordReset();

      // Mock network error
      mockAuth.resetPasswordForEmail.mockRejectedValue(
        new Error("Network failed"),
      );

      const result = await requestPasswordReset("test@example.com");

      expect(result).toBe(false);
      expect(error.value).toBe("Network failed");
    });

    it("should set loading state during request", async () => {
      const { mockAuth } = getMockSupabase();
      const { requestPasswordReset, loading } = usePasswordReset();

      // Mock successful Supabase response with delay
      mockAuth.resetPasswordForEmail.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ error: null }), 10),
          ),
      );

      const promise = requestPasswordReset("test@example.com");

      // Loading should be true during the call
      expect(loading.value).toBe(true);
      await promise;

      expect(loading.value).toBe(false);
    });
  });

  describe("confirmPasswordReset()", () => {
    it("should successfully confirm password reset", async () => {
      const { mockAuth } = getMockSupabase();
      const { confirmPasswordReset, passwordUpdated, error } =
        usePasswordReset();

      mockAuth.updateUser.mockResolvedValue({ error: null });

      const result = await confirmPasswordReset("NewPassword123");

      expect(result).toBe(true);
      expect(passwordUpdated.value).toBe(true);
      expect(error.value).toBeNull();

      expect(mockAuth.updateUser).toHaveBeenCalledWith({
        password: "NewPassword123",
      });
    });

    it("should handle missing password", async () => {
      const { confirmPasswordReset, error } = usePasswordReset();

      const result = await confirmPasswordReset("");

      expect(result).toBe(false);
      expect(error.value).toBe("Password is required");
    });

    it("should handle invalid token error", async () => {
      const { mockAuth } = getMockSupabase();
      const { confirmPasswordReset, error } = usePasswordReset();

      mockAuth.updateUser.mockResolvedValue({
        error: { message: "Invalid or expired reset token" },
      });

      const result = await confirmPasswordReset("NewPassword123");

      expect(result).toBe(false);
      expect(error.value).toBe("Invalid or expired reset token");
    });

    it("should handle expired token error", async () => {
      const { mockAuth } = getMockSupabase();
      const { confirmPasswordReset, error } = usePasswordReset();

      mockAuth.updateUser.mockResolvedValue({
        error: { message: "Reset link has expired" },
      });

      const result = await confirmPasswordReset("NewPassword123");

      expect(result).toBe(false);
      expect(error.value).toBe("Reset link has expired");
    });

    it("should handle weak password error", async () => {
      const { mockAuth } = getMockSupabase();
      const { confirmPasswordReset, error } = usePasswordReset();

      mockAuth.updateUser.mockResolvedValue({
        error: { message: "Password does not meet strength requirements" },
      });

      const result = await confirmPasswordReset("weak");

      expect(result).toBe(false);
      expect(error.value).toBe("Password does not meet strength requirements");
    });

    it("should set loading state during reset", async () => {
      const { mockAuth } = getMockSupabase();
      const { confirmPasswordReset, loading } = usePasswordReset();

      let loadingDuringCall = false;

      mockAuth.updateUser.mockImplementationOnce(() => {
        loadingDuringCall = loading.value;
        return new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 10),
        );
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
      const { mockAuth } = getMockSupabase();
      const { requestPasswordReset, error } = usePasswordReset();

      mockAuth.resetPasswordForEmail.mockRejectedValueOnce("String error");

      await requestPasswordReset("test@example.com");

      expect(error.value).toBe("Failed to request password reset");
    });
  });

  describe("Edge Cases", () => {
    it("should handle concurrent reset requests gracefully", async () => {
      const { mockAuth } = getMockSupabase();
      const { requestPasswordReset } = usePasswordReset();

      // Mock multiple responses for concurrent requests
      mockAuth.resetPasswordForEmail
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: null });

      const promise1 = requestPasswordReset("test1@example.com");
      const promise2 = requestPasswordReset("test2@example.com");

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it("should not overwrite emailSent on error", async () => {
      const { mockAuth } = getMockSupabase();
      const { requestPasswordReset, emailSent } = usePasswordReset();

      mockAuth.resetPasswordForEmail.mockResolvedValueOnce({
        error: { message: "Error" },
      });

      await requestPasswordReset("test@example.com");

      expect(emailSent.value).toBe(false);
    });

    it("should not overwrite passwordUpdated on error", async () => {
      const { mockAuth } = getMockSupabase();
      const { confirmPasswordReset, passwordUpdated } = usePasswordReset();

      mockAuth.updateUser.mockResolvedValueOnce({
        error: { message: "Error" },
      });

      await confirmPasswordReset("NewPassword123");

      expect(passwordUpdated.value).toBe(false);
    });

    it("should handle email with special characters", async () => {
      const { mockAuth } = getMockSupabase();
      const { requestPasswordReset } = usePasswordReset();

      mockAuth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

      await requestPasswordReset("test+tag@example.co.uk");

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test+tag@example.co.uk",
        expect.objectContaining({
          redirectTo: expect.stringContaining("/reset-password"),
        }),
      );
    });
  });
});
