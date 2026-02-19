import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSocialSyncSettings } from "~/composables/useSocialSyncSettings";

const mockSupabase = { from: vi.fn() };
vi.mock("~/composables/useSupabase", () => ({ useSupabase: () => mockSupabase }));

let mockUserId = "user-123";
vi.mock("~/stores/user", () => ({
  useUserStore: () => ({ get user() { return { id: mockUserId }; } }),
}));

const makeMockQuery = () => {
  const q: any = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return q;
};

describe("useSocialSyncSettings", () => {
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockUserId = "user-123";
    mockQuery = makeMockQuery();
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe("loadSettings", () => {
    it("fetches social_sync_settings from user_preferences", async () => {
      mockQuery.single.mockResolvedValue({
        data: {
          social_sync_settings: {
            autoSyncEnabled: false,
            notifyOnRecruitingPosts: true,
            notifyOnMentions: false,
            lastSyncTime: null,
          },
        },
        error: null,
      });
      const { loadSettings, autoSyncEnabled, notifyOnRecruitingPosts } =
        useSocialSyncSettings();
      await loadSettings();
      expect(mockSupabase.from).toHaveBeenCalledWith("user_preferences");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(autoSyncEnabled.value).toBe(false);
      expect(notifyOnRecruitingPosts.value).toBe(true);
    });

    it("uses defaults when social_sync_settings is null", async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: null });
      const { loadSettings, autoSyncEnabled } = useSocialSyncSettings();
      await loadSettings();
      expect(autoSyncEnabled.value).toBe(true); // default
    });

    it("does nothing when no user", async () => {
      mockUserId = "";
      const { loadSettings } = useSocialSyncSettings();
      await loadSettings();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe("saveSettings", () => {
    it("updates user_preferences with current settings", async () => {
      mockQuery.eq.mockResolvedValue({ error: null });
      const { saveSettings, autoSyncEnabled } = useSocialSyncSettings();
      autoSyncEnabled.value = false;
      const result = await saveSettings();
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          social_sync_settings: expect.objectContaining({ autoSyncEnabled: false }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it("returns success: false on error", async () => {
      mockQuery.eq.mockResolvedValue({ error: { message: "failed" } });
      const { saveSettings } = useSocialSyncSettings();
      const result = await saveSettings();
      expect(result.success).toBe(false);
    });
  });
});
