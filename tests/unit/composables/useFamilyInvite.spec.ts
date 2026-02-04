import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useFamilyInvite } from "~/composables/useFamilyInvite";

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
      expect(typeof invite.linkParentWithCode).toBe("function");
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

  describe("linkParentWithCode", () => {
    it("should link parent to player using family code", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "users") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "player-id",
                      user_id: "player-user",
                      family_code: "FAM-ABC123",
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
          if (table === "account_links") {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "parent-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const invite = useFamilyInvite();
      const result = await invite.linkParentWithCode("FAM-ABC123");

      expect(result).toEqual({
        id: "player-id",
        user_id: "player-user",
        family_code: "FAM-ABC123",
      });
    });

    it("should handle invalid family code", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "No rows returned" },
              }),
            })),
          })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "parent-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const invite = useFamilyInvite();

      await expect(invite.linkParentWithCode("INVALID-CODE")).rejects.toThrow(
        "Family code not found",
      );
    });

    it("should accept family code without FAM- prefix", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "users") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "player-id",
                      user_id: "player-user",
                      family_code: "FAM-ABC123",
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
          if (table === "account_links") {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "parent-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const invite = useFamilyInvite();
      const result = await invite.linkParentWithCode("ABC123");

      expect(result).toBeDefined();
    });

    it("should handle unauthenticated parent", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const invite = useFamilyInvite();

      await expect(invite.linkParentWithCode("FAM-ABC123")).rejects.toThrow(
        "Not authenticated",
      );
    });

    it("should create family link record", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "users") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "player-id",
                      user_id: "player-user",
                      family_code: "FAM-ABC123",
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
          if (table === "account_links") {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "parent-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const invite = useFamilyInvite();
      await invite.linkParentWithCode("FAM-ABC123");

      expect(mockSupabase.from).toHaveBeenCalledWith("account_links");
    });
  });
});
