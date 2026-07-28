import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useFamilyInvite } from "~/composables/useFamilyInvite";
import { useNuxtApp } from "#app";

const mockFetchAuth = vi.fn();

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

// Mock Supabase
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  })),
}));

describe("useFamilyInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const invite = useFamilyInvite();

      expect(invite.loading.value).toBe(false);
      expect(invite.error.value).toBeNull();
      expect(invite.lastInvitedEmail.value).toBeNull();
    });

    it("should export required functions", () => {
      const invite = useFamilyInvite();

      expect(typeof invite.sendParentInvite).toBe("function");
      expect(typeof invite.sendInvite).toBe("function");
    });
  });

  describe("sendInvite", () => {
    it("posts to /api/family/invite with email and role", async () => {
      mockFetchAuth.mockResolvedValue({ success: true });

      const invite = useFamilyInvite();
      await invite.sendInvite({ email: "parent@example.com", role: "parent" });

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/family/invite", {
        method: "POST",
        body: { email: "parent@example.com", role: "parent" },
      });
      expect(invite.lastInvitedEmail.value).toBe("parent@example.com");
    });

    it("starts with loading false", () => {
      const invite = useFamilyInvite();
      expect(invite.loading.value).toBe(false);
    });

    it("sets error state on failure", async () => {
      mockFetchAuth.mockRejectedValue(new Error("Network error"));

      const invite = useFamilyInvite();
      await expect(
        invite.sendInvite({ email: "x@y.com", role: "player" }),
      ).rejects.toThrow();
      expect(invite.error.value).toBe("Network error");
    });

    it("captures family_invite_sent event on success", async () => {
      const mockCapture = vi.fn();
      vi.mocked(useNuxtApp).mockReturnValue({
        $posthog: { capture: mockCapture },
      } as ReturnType<typeof useNuxtApp>);

      mockFetchAuth.mockResolvedValue({ success: true });

      const invite = useFamilyInvite();
      await invite.sendInvite({ email: "parent@example.com", role: "parent" });

      expect(mockCapture).toHaveBeenCalledWith(
        "family_invite_sent",
        expect.objectContaining({ method: "email" }),
      );
    });
  });

  describe("sendParentInvite", () => {
    it("should send invite email to parent", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "player_profiles") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "player-id",
                      first_name: "John",
                      last_name: "Player",
                      user_id: "player-user",
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
          // For "users" table
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "player-user", email: "player@example.com" },
                  error: null,
                }),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
        functions: {
          invoke: vi.fn().mockResolvedValue({
            data: { success: true },
            error: null,
          }),
        },
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "player-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const invite = useFamilyInvite();
      await invite.sendParentInvite("parent@example.com");

      expect(invite.lastInvitedEmail.value).toBe("parent@example.com");
      expect(invite.loading.value).toBe(false);
      expect(invite.error.value).toBeNull();
    });

    it("should validate email format", async () => {
      const invite = useFamilyInvite();

      await expect(invite.sendParentInvite("invalid-email")).rejects.toThrow(
        "Invalid email",
      );
    });

    it("should handle unauthenticated player", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(),
        functions: {
          invoke: vi.fn(),
        },
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const invite = useFamilyInvite();

      await expect(
        invite.sendParentInvite("parent@example.com"),
      ).rejects.toThrow("Not authenticated");
    });

    it("should handle email service errors", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "player_profiles") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "player-id",
                      first_name: "John",
                      last_name: "Player",
                      user_id: "player-user",
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
          // For "users" table
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "player-user", email: "player@example.com" },
                  error: null,
                }),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
        functions: {
          invoke: vi.fn().mockResolvedValue({
            data: null,
            error: new Error("Email service unavailable"),
          }),
        },
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "player-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const invite = useFamilyInvite();

      await expect(
        invite.sendParentInvite("parent@example.com"),
      ).rejects.toThrow();
    });

    it("should track loading state", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "player_profiles") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "player-id",
                      first_name: "John",
                      last_name: "Player",
                      user_id: "player-user",
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
          // For "users" table
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "player-user", email: "player@example.com" },
                  error: null,
                }),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
        functions: {
          invoke: vi.fn().mockResolvedValue({
            data: { success: true },
            error: null,
          }),
        },
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "player-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const invite = useFamilyInvite();

      expect(invite.loading.value).toBe(false);

      const promise = invite.sendParentInvite("parent@example.com");
      // Loading state is set synchronously
      // Can't easily test during async operation without adding delays

      await promise;
      expect(invite.loading.value).toBe(false);
    });
  });

  // linkParentWithCode was deleted as dead ghost-schema code — it queried a
  // nonexistent users.family_code column (family_code only exists on
  // family_units). The real family-code join flow is useFamilyCode +
  // /api/family/code/join. See planning/audit-2026-07-27-findings.md.
});
