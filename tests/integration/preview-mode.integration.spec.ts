import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useParentPreviewMode } from "~/composables/useParentPreviewMode";

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  })),
}));

describe("Preview Mode Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Complete Preview Mode Flow", () => {
    it("should handle full parent signup to preview mode flow", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "users") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "demo-user-id",
                      email: "demo@example.com",
                      first_name: "Alex",
                      last_name: "Demo",
                      user_type: "parent",
                      is_preview_mode: true,
                    },
                    error: null,
                  }),
                })),
              })),
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            };
          }
          return {};
        }),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "parent-user-id" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const preview = useParentPreviewMode();

      // Parent signs up without family code (is_preview_mode=true)
      expect(preview.isInPreviewMode()).toBe(false);
      expect(preview.loading.value).toBe(false);
      expect(preview.error.value).toBeNull();

      // Parent enters preview mode
      await preview.enterPreviewMode("demo-user-id");

      expect(preview.isInPreviewMode()).toBe(true);
      expect(preview.demoProfile.value).not.toBeNull();
      expect(preview.demoProfile.value?.first_name).toBe("Alex");
      expect(localStorage.setItem).toHaveBeenCalledWith("preview_mode", "true");
    });

    it("should handle exit preview mode with family code entry", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "users") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "real-player-id",
                      email: "player@example.com",
                      first_name: "Real",
                      last_name: "Player",
                      user_type: "player",
                      is_preview_mode: false,
                    },
                    error: null,
                  }),
                })),
              })),
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            };
          }
          return {};
        }),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "parent-user-id" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const preview = useParentPreviewMode();

      // Start in preview mode
      preview.isPreviewMode.value = true;
      preview.demoProfile.value = {
        id: "demo-id",
        first_name: "Alex",
        last_name: "Demo",
      };

      // Exit preview mode after entering family code
      await preview.exitPreviewMode("real-player-id");

      expect(preview.isInPreviewMode()).toBe(false);
      expect(preview.demoProfile.value).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith("preview_mode");
    });

    it("should persist preview mode state across sessions", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "demo-id",
                  first_name: "Alex",
                },
                error: null,
              }),
            })),
          })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "parent-user-id" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const preview = useParentPreviewMode();

      // Enter preview mode
      await preview.enterPreviewMode("demo-id");

      expect(localStorage.setItem).toHaveBeenCalledWith("preview_mode", "true");
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "demo_profile_id",
        "demo-id",
      );

      // Verify state is retained
      expect(preview.isInPreviewMode()).toBe(true);
    });

    it("should clear preview state on authentication failure", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const preview = useParentPreviewMode();

      // Attempt to enter preview mode without authentication
      await expect(preview.enterPreviewMode("demo-id")).rejects.toThrow(
        "Not authenticated",
      );

      expect(preview.isInPreviewMode()).toBe(false);
      expect(preview.error.value).not.toBeNull();
    });

    it("should handle demo profile not found error", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("Profile not found"),
              }),
            })),
          })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "parent-user-id" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const preview = useParentPreviewMode();

      await expect(preview.enterPreviewMode("invalid-id")).rejects.toThrow();
      expect(preview.isInPreviewMode()).toBe(false);
      expect(preview.error.value).toContain("Profile not found");
    });
  });

  describe("Preview Mode Data Isolation", () => {
    it("should isolate demo profile data from real profiles", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "users") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "demo-id",
                      first_name: "Demo",
                      email: "demo@recruiting-compass.io",
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
          return {};
        }),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "parent-user-id" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const preview = useParentPreviewMode();

      await preview.enterPreviewMode("demo-id");

      const demoData = preview.getDemoProfileData();
      expect(demoData?.email).toBe("demo@recruiting-compass.io");
      expect(demoData?.first_name).toBe("Demo");
    });

    it("should return null when accessing demo data without preview mode", () => {
      const preview = useParentPreviewMode();

      preview.isPreviewMode.value = false;
      preview.demoProfile.value = {
        id: "demo-id",
        first_name: "Demo",
      };

      const demoData = preview.getDemoProfileData();
      expect(demoData).toBeNull();
    });
  });
});
