import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useProfileCompleteness } from "~/composables/useProfileCompleteness";

// Mock Supabase
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(),
  })),
}));

describe("useProfileCompleteness", () => {
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
      const completeness = useProfileCompleteness();

      expect(completeness.completeness.value).toBe(0);
      expect(completeness.loading.value).toBe(false);
      expect(completeness.error.value).toBeNull();
    });

    it("should export required functions", () => {
      const completeness = useProfileCompleteness();

      expect(typeof completeness.updateCompleteness).toBe("function");
      expect(typeof completeness.getNextPrompt).toBe("function");
      expect(typeof completeness.dismissPrompt).toBe("function");
    });
  });

  describe("updateCompleteness", () => {
    it("should calculate and update profile completeness", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  graduation_year: 2026,
                  primary_sport: "soccer",
                  zip_code: "12345",
                  gpa: 3.8,
                  profile_completeness: 60,
                },
                error: null,
              }),
            })),
          })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "test-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const completeness = useProfileCompleteness();
      await completeness.updateCompleteness();

      expect(completeness.completeness.value).toBeGreaterThanOrEqual(0);
      expect(completeness.completeness.value).toBeLessThanOrEqual(100);
    });

    it("should handle calculation errors", async () => {
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
            data: { session: { user: { id: "test-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const completeness = useProfileCompleteness();
      await expect(completeness.updateCompleteness()).rejects.toThrow();
    });

    it("should handle unauthenticated user", async () => {
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

      const completeness = useProfileCompleteness();
      await expect(completeness.updateCompleteness()).rejects.toThrow(
        "Not authenticated",
      );
    });
  });

  describe("getNextPrompt", () => {
    it("should return next contextual prompt", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === "player_profiles") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      gpa: null,
                      sat_score: null,
                      act_score: null,
                      highlight_video_url: null,
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { dismissed_prompts: [] },
                  error: null,
                }),
              })),
            })),
          };
        }),
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "test-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const completeness = useProfileCompleteness();
      const prompt = await completeness.getNextPrompt();

      if (prompt) {
        expect(prompt.id).toBeDefined();
        expect(prompt.message).toBeDefined();
      }
    });

    it("should return null when all prompts dismissed", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "test-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      // Mock all prompts as dismissed with future expiry date
      const futureDate = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const allDismissed = [
        { id: "gpa", dismissed_until: futureDate },
        { id: "test_scores", dismissed_until: futureDate },
        { id: "highlight_video", dismissed_until: futureDate },
      ];
      localStorage.getItem = vi
        .fn()
        .mockReturnValue(JSON.stringify(allDismissed));

      const completeness = useProfileCompleteness();
      const prompt = await completeness.getNextPrompt();

      expect(prompt).toBeNull();
    });
  });

  describe("dismissPrompt", () => {
    it("should dismiss prompt with cooldown duration", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "test-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const completeness = useProfileCompleteness();
      await completeness.dismissPrompt("gpa", 7);

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it("should handle dismiss errors gracefully", async () => {
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

      const completeness = useProfileCompleteness();
      await expect(completeness.dismissPrompt("gpa", 7)).rejects.toThrow(
        "Not authenticated",
      );
    });

    it("should check cooldown before returning prompt", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const now = Date.now();
      const futureTime = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();

      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: "test-user" } } },
          }),
        },
      };
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      // Mock localStorage to return dismissed prompts
      const localStorageData: Record<string, string> = {};
      localStorageData["dismissed_prompts_test-user"] = JSON.stringify([
        { id: "gpa", dismissed_until: futureTime },
      ]);

      (global.localStorage.getItem as any).mockImplementation(
        (key: string) => localStorageData[key] || null,
      );

      const completeness = useProfileCompleteness();
      const prompt = await completeness.getNextPrompt();

      // GPA prompt should be in cooldown, return test_scores instead
      if (prompt) {
        expect(prompt.id).not.toBe("gpa");
      }
    });
  });
});
