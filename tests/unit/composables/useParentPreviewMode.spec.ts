import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useParentPreviewMode } from "~/composables/useParentPreviewMode";

// Mock Supabase
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  })),
}));

describe("useParentPreviewMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
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

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const preview = useParentPreviewMode();

      expect(preview.isPreviewMode.value).toBe(false);
      expect(preview.demoProfile.value).toBeNull();
      expect(preview.loading.value).toBe(false);
      expect(preview.error.value).toBeNull();
    });

    it("should export required functions", () => {
      const preview = useParentPreviewMode();

      expect(typeof preview.enterPreviewMode).toBe("function");
      expect(typeof preview.exitPreviewMode).toBe("function");
      expect(typeof preview.isInPreviewMode).toBe("function");
      expect(typeof preview.getDemoProfileData).toBe("function");
    });
  });

  describe("enterPreviewMode", () => {
    it("should enter preview mode and load demo profile", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "demo-id",
                  first_name: "Alex",
                  last_name: "Demo",
                  user_id: "demo-user",
                  primary_sport: "soccer",
                  graduation_year: 2026,
                },
                error: null,
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

      const preview = useParentPreviewMode();
      await preview.enterPreviewMode("demo-profile-id");

      expect(preview.isPreviewMode.value).toBe(true);
      expect(preview.demoProfile.value).not.toBeNull();
      expect(preview.demoProfile.value?.first_name).toBe("Alex");
    });

    it("should persist preview mode flag to localStorage", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "demo-id",
                  first_name: "Alex",
                  last_name: "Demo",
                },
                error: null,
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

      const preview = useParentPreviewMode();
      await preview.enterPreviewMode("demo-profile-id");

      expect(localStorage.setItem).toHaveBeenCalledWith("preview_mode", "true");
    });

    it("should handle demo profile load errors", async () => {
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
            data: { session: { user: { id: "parent-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const preview = useParentPreviewMode();
      await expect(preview.enterPreviewMode("invalid-id")).rejects.toThrow();
      expect(preview.error.value).not.toBeNull();
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

      const preview = useParentPreviewMode();
      await expect(preview.enterPreviewMode("demo-id")).rejects.toThrow(
        "Not authenticated",
      );
    });
  });

  describe("exitPreviewMode", () => {
    it("should exit preview mode and clear demo data", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "real-id",
                  first_name: "Real",
                  last_name: "Player",
                },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "parent-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const preview = useParentPreviewMode();

      // First enter preview mode
      preview.isPreviewMode.value = true;
      preview.demoProfile.value = {
        id: "demo-id",
        first_name: "Demo",
        last_name: "User",
      };

      // Then exit
      await preview.exitPreviewMode("real-player-id");

      expect(preview.isPreviewMode.value).toBe(false);
      expect(preview.demoProfile.value).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith("preview_mode");
    });

    it("should link real player profile on exit", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "real-id",
                  first_name: "Real",
                },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "parent-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const preview = useParentPreviewMode();
      preview.isPreviewMode.value = true;

      await preview.exitPreviewMode("real-player-id");

      expect(mockSupabase.from).toHaveBeenCalledWith("users");
    });

    it("should handle exit errors", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("Link failed"),
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

      const preview = useParentPreviewMode();
      preview.isPreviewMode.value = true;

      await expect(preview.exitPreviewMode("real-player-id")).rejects.toThrow();
    });
  });

  describe("isInPreviewMode", () => {
    it("should return preview mode status", () => {
      const preview = useParentPreviewMode();

      preview.isPreviewMode.value = false;
      expect(preview.isInPreviewMode()).toBe(false);

      preview.isPreviewMode.value = true;
      expect(preview.isInPreviewMode()).toBe(true);
    });
  });

  describe("getDemoProfileData", () => {
    it("should return demo profile data", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "demo-id",
                  first_name: "Alex",
                  last_name: "Demo",
                },
                error: null,
              }),
            })),
          })),
        })),
        auth: {
          getSession: vi.fn(),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const preview = useParentPreviewMode();
      preview.demoProfile.value = {
        id: "demo-id",
        first_name: "Alex",
        last_name: "Demo",
      };
      preview.isPreviewMode.value = true;

      const data = preview.getDemoProfileData();
      expect(data).toEqual({
        id: "demo-id",
        first_name: "Alex",
        last_name: "Demo",
      });
    });

    it("should return null if not in preview mode", () => {
      const preview = useParentPreviewMode();
      preview.isPreviewMode.value = false;

      const data = preview.getDemoProfileData();
      expect(data).toBeNull();
    });
  });
});
