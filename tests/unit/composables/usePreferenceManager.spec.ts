import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { setActivePinia, createPinia } from "pinia";

/**
 * Per-category mock instance factory used by the useUserPreferencesV2 mock.
 * Each call to useUserPreferencesV2(category) returns a fresh, isolated
 * instance with its own preferences ref + spies so we can drive state
 * independently per category.
 */
type V2Instance = {
  preferences: ReturnType<typeof ref<Record<string, unknown>>>;
  isLoading: ReturnType<typeof ref<boolean>>;
  isSaving: ReturnType<typeof ref<boolean>>;
  error: ReturnType<typeof ref<string | null>>;
  hasChanges: ReturnType<typeof ref<boolean>>;
  loadPreferences: ReturnType<typeof vi.fn>;
  savePreferences: ReturnType<typeof vi.fn>;
  updatePreferences: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

const v2Instances = new Map<string, V2Instance>();

function makeV2Instance(): V2Instance {
  const preferences = ref<Record<string, unknown>>({});
  return {
    preferences,
    isLoading: ref(false),
    isSaving: ref(false),
    error: ref<string | null>(null),
    hasChanges: ref(false),
    loadPreferences: vi.fn().mockResolvedValue(undefined),
    savePreferences: vi.fn().mockResolvedValue(undefined),
    updatePreferences: vi.fn((updates: Record<string, unknown>) => {
      preferences.value = { ...preferences.value, ...updates };
    }),
    clear: vi.fn(() => {
      preferences.value = {};
    }),
  };
}

vi.mock("~/composables/useUserPreferencesV2", () => ({
  useUserPreferencesV2: vi.fn((category: string) => {
    if (!v2Instances.has(category)) {
      v2Instances.set(category, makeV2Instance());
    }
    return v2Instances.get(category)!;
  }),
}));

const mockFetchAuth = vi.fn();
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

const mockUserStore: { user: { id: string } | null } = {
  user: { id: "user-1" },
};
vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => mockUserStore),
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Import after mocks are registered
const { usePreferenceManager } =
  await import("~/composables/usePreferenceManager");

function getInstance(category: string): V2Instance {
  return v2Instances.get(category)!;
}

describe("usePreferenceManager", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Reset per-category instances so each test starts clean
    v2Instances.clear();
    vi.clearAllMocks();
    mockUserStore.user = { id: "user-1" };
  });

  describe("initialization", () => {
    it("creates V2 instances for each preference category", () => {
      const pm = usePreferenceManager();
      expect(pm.notificationPrefs).toBeDefined();
      expect(pm.locationPrefs).toBeDefined();
      expect(pm.playerPrefs).toBeDefined();
      expect(pm.schoolPrefs).toBeDefined();
      expect(pm.dashboardPrefs).toBeDefined();
      expect(v2Instances.size).toBe(5);
      for (const cat of [
        "notifications",
        "location",
        "player",
        "school",
        "dashboard",
      ]) {
        expect(v2Instances.has(cat)).toBe(true);
      }
    });

    it("exposes required methods", () => {
      const pm = usePreferenceManager();
      expect(typeof pm.loadAllPreferences).toBe("function");
      expect(typeof pm.saveAllPreferences).toBe("function");
      expect(typeof pm.clearAllChanges).toBe("function");
      expect(typeof pm.getNotificationSettings).toBe("function");
      expect(typeof pm.setNotificationSettings).toBe("function");
      expect(typeof pm.setHomeLocation).toBe("function");
      expect(typeof pm.getPlayerDetails).toBe("function");
      expect(typeof pm.setPlayerDetails).toBe("function");
      expect(typeof pm.getSchoolPreferences).toBe("function");
      expect(typeof pm.setSchoolPreferences).toBe("function");
      expect(typeof pm.getDashboardLayout).toBe("function");
      expect(typeof pm.setDashboardLayout).toBe("function");
      expect(typeof pm.trackPreferenceChange).toBe("function");
      expect(typeof pm.getPreferenceHistory).toBe("function");
    });
  });

  describe("combined state computed properties", () => {
    it("isLoading is true when any category is loading", () => {
      const pm = usePreferenceManager();
      expect(pm.isLoading.value).toBe(false);
      getInstance("player").isLoading.value = true;
      expect(pm.isLoading.value).toBe(true);
    });

    it("isSaving is true when any category is saving", () => {
      const pm = usePreferenceManager();
      expect(pm.isSaving.value).toBe(false);
      getInstance("school").isSaving.value = true;
      expect(pm.isSaving.value).toBe(true);
    });

    it("error returns first non-null error among categories", () => {
      const pm = usePreferenceManager();
      expect(pm.error.value).toBe(null);
      getInstance("location").error.value = "loc fail";
      expect(pm.error.value).toBe("loc fail");
    });

    it("error returns null when no category has an error", () => {
      const pm = usePreferenceManager();
      expect(pm.error.value).toBe(null);
    });
  });

  describe("loadAllPreferences", () => {
    it("calls loadPreferences on every V2 instance in parallel", async () => {
      const pm = usePreferenceManager();
      await pm.loadAllPreferences();
      for (const cat of [
        "notifications",
        "location",
        "player",
        "school",
        "dashboard",
      ]) {
        expect(getInstance(cat).loadPreferences).toHaveBeenCalledTimes(1);
      }
    });

    it("rethrows when any loadPreferences rejects", async () => {
      const pm = usePreferenceManager();
      getInstance("notifications").loadPreferences.mockRejectedValueOnce(
        new Error("boom"),
      );
      await expect(pm.loadAllPreferences()).rejects.toThrow("boom");
    });
  });

  describe("saveAllPreferences", () => {
    it("does not call save when no category has changes", async () => {
      const pm = usePreferenceManager();
      await pm.saveAllPreferences();
      for (const cat of [
        "notifications",
        "location",
        "player",
        "school",
        "dashboard",
      ]) {
        expect(getInstance(cat).savePreferences).not.toHaveBeenCalled();
      }
    });

    it("saves only categories with hasChanges = true", async () => {
      const pm = usePreferenceManager();
      getInstance("notifications").hasChanges.value = true;
      getInstance("dashboard").hasChanges.value = true;

      await pm.saveAllPreferences();

      expect(getInstance("notifications").savePreferences).toHaveBeenCalled();
      expect(getInstance("dashboard").savePreferences).toHaveBeenCalled();
      expect(getInstance("location").savePreferences).not.toHaveBeenCalled();
      expect(getInstance("player").savePreferences).not.toHaveBeenCalled();
      expect(getInstance("school").savePreferences).not.toHaveBeenCalled();
    });

    it("saves every category when all have changes", async () => {
      const pm = usePreferenceManager();
      for (const cat of [
        "notifications",
        "location",
        "player",
        "school",
        "dashboard",
      ]) {
        getInstance(cat).hasChanges.value = true;
      }
      await pm.saveAllPreferences();
      for (const cat of [
        "notifications",
        "location",
        "player",
        "school",
        "dashboard",
      ]) {
        expect(getInstance(cat).savePreferences).toHaveBeenCalledTimes(1);
      }
    });

    it("rethrows when any savePreferences rejects", async () => {
      const pm = usePreferenceManager();
      getInstance("player").hasChanges.value = true;
      getInstance("player").savePreferences.mockRejectedValueOnce(
        new Error("save-fail"),
      );
      await expect(pm.saveAllPreferences()).rejects.toThrow("save-fail");
    });
  });

  describe("clearAllChanges", () => {
    it("invokes clear on all V2 instances", () => {
      const pm = usePreferenceManager();
      pm.clearAllChanges();
      for (const cat of [
        "notifications",
        "location",
        "player",
        "school",
        "dashboard",
      ]) {
        expect(getInstance(cat).clear).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe("notification settings", () => {
    it("returns defaults when preferences are empty", () => {
      const pm = usePreferenceManager();
      const settings = pm.getNotificationSettings();
      expect(settings.followUpReminderDays).toBe(7);
      expect(settings.enableFollowUpReminders).toBe(true);
      expect(settings.enableEmailNotifications).toBe(true);
      expect(settings.emailOnlyHighPriority).toBe(false);
    });

    it("returns validated settings when preferences contain data", () => {
      const pm = usePreferenceManager();
      getInstance("notifications").preferences.value = {
        followUpReminderDays: 14,
        enableEmailNotifications: false,
        emailOnlyHighPriority: true,
      };
      const settings = pm.getNotificationSettings();
      expect(settings.followUpReminderDays).toBe(14);
      expect(settings.enableEmailNotifications).toBe(false);
      expect(settings.emailOnlyHighPriority).toBe(true);
    });

    it("merges partial updates with current settings and saves", async () => {
      const pm = usePreferenceManager();
      getInstance("notifications").preferences.value = {
        followUpReminderDays: 5,
        enableEmailNotifications: true,
      };

      await pm.setNotificationSettings({ enableEmailNotifications: false });

      const inst = getInstance("notifications");
      expect(inst.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          followUpReminderDays: 5,
          enableEmailNotifications: false,
        }),
      );
      expect(inst.savePreferences).toHaveBeenCalledTimes(1);
    });

    it("tracks change history when previous settings exist", async () => {
      const pm = usePreferenceManager();
      getInstance("notifications").preferences.value = {
        followUpReminderDays: 5,
      };
      mockFetchAuth.mockResolvedValueOnce({ ok: true });

      await pm.setNotificationSettings({ followUpReminderDays: 10 });

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/history",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            category: "notifications",
            changed_fields: expect.arrayContaining(["followUpReminderDays"]),
          }),
        }),
      );
    });
  });

  describe("home location", () => {
    it("getHomeLocation returns null when location preferences empty", () => {
      const pm = usePreferenceManager();
      expect(pm.getHomeLocation.value).toBe(null);
    });

    it("getHomeLocation returns validated location when populated", () => {
      const pm = usePreferenceManager();
      getInstance("location").preferences.value = {
        city: "Austin",
        state: "TX",
        zip: "78701",
      };
      const loc = pm.getHomeLocation.value;
      expect(loc).not.toBeNull();
      expect(loc?.city).toBe("Austin");
      expect(loc?.state).toBe("TX");
      expect(loc?.zip).toBe("78701");
    });

    it("setHomeLocation merges partial updates with current location", async () => {
      const pm = usePreferenceManager();
      getInstance("location").preferences.value = {
        city: "Austin",
        state: "TX",
        zip: "78701",
      };

      await pm.setHomeLocation({ zip: "78702" });

      const inst = getInstance("location");
      expect(inst.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          city: "Austin",
          state: "TX",
          zip: "78702",
        }),
      );
      expect(inst.savePreferences).toHaveBeenCalledTimes(1);
    });

    it("setHomeLocation works from empty state (no oldValue)", async () => {
      const pm = usePreferenceManager();
      mockFetchAuth.mockResolvedValue({ ok: true });

      await pm.setHomeLocation({ zip: "90210" });

      const inst = getInstance("location");
      expect(inst.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ zip: "90210" }),
      );
      expect(inst.savePreferences).toHaveBeenCalledTimes(1);
      // No oldValue → no history tracking
      expect(mockFetchAuth).not.toHaveBeenCalledWith(
        "/api/user/preferences/history",
        expect.anything(),
      );
    });
  });

  describe("player details", () => {
    it("getPlayerDetails returns null when empty", () => {
      const pm = usePreferenceManager();
      expect(pm.getPlayerDetails()).toBe(null);
    });

    it("getPlayerDetails returns validated details when populated", () => {
      const pm = usePreferenceManager();
      getInstance("player").preferences.value = {
        graduation_year: 2027,
        primary_sport: "baseball",
        primary_position: "SS",
      };
      const details = pm.getPlayerDetails();
      expect(details).not.toBeNull();
      expect(details?.graduation_year).toBe(2027);
      expect(details?.primary_sport).toBe("baseball");
    });

    it("setPlayerDetails merges with current and saves", async () => {
      const pm = usePreferenceManager();
      getInstance("player").preferences.value = {
        graduation_year: 2027,
        primary_sport: "baseball",
      };
      mockFetchAuth.mockResolvedValueOnce({ ok: true });

      await pm.setPlayerDetails({ primary_position: "C" });

      const inst = getInstance("player");
      expect(inst.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          graduation_year: 2027,
          primary_sport: "baseball",
          primary_position: "C",
        }),
      );
      expect(inst.savePreferences).toHaveBeenCalledTimes(1);
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/history",
        expect.objectContaining({
          body: expect.objectContaining({ category: "player" }),
        }),
      );
    });

    it("setPlayerDetails skips history tracking when no oldValue", async () => {
      const pm = usePreferenceManager();
      await pm.setPlayerDetails({ graduation_year: 2026 });
      expect(mockFetchAuth).not.toHaveBeenCalledWith(
        "/api/user/preferences/history",
        expect.anything(),
      );
    });
  });

  describe("school preferences", () => {
    it("getSchoolPreferences returns null when empty", () => {
      const pm = usePreferenceManager();
      expect(pm.getSchoolPreferences()).toBe(null);
    });

    it("setSchoolPreferences attaches last_updated timestamp and saves", async () => {
      const pm = usePreferenceManager();
      const sample = {
        preferences: [
          {
            id: "p1",
            category: "academic" as const,
            type: "min_gpa",
            value: 3.0,
            priority: 1,
            is_dealbreaker: false,
          },
        ],
        last_updated: "2020-01-01",
      };

      await pm.setSchoolPreferences(sample);

      const inst = getInstance("school");
      expect(inst.updatePreferences).toHaveBeenCalledTimes(1);
      const passed = inst.updatePreferences.mock.calls[0][0];
      expect(passed.preferences).toEqual(sample.preferences);
      expect(passed.last_updated).toBeDefined();
      expect(passed.last_updated).not.toBe("2020-01-01"); // overwritten
      expect(inst.savePreferences).toHaveBeenCalledTimes(1);
    });

    it("setSchoolPreferences tracks history when oldValue exists", async () => {
      const pm = usePreferenceManager();
      // Seed oldValue
      getInstance("school").preferences.value = {
        preferences: [
          {
            id: "p1",
            category: "academic",
            type: "min_gpa",
            value: 3.0,
            priority: 1,
            is_dealbreaker: false,
          },
        ],
        last_updated: "2020-01-01",
      };
      mockFetchAuth.mockResolvedValueOnce({ ok: true });

      await pm.setSchoolPreferences({
        preferences: [
          {
            id: "p1",
            category: "academic" as const,
            type: "min_gpa",
            value: 3.5,
            priority: 1,
            is_dealbreaker: false,
          },
        ],
        last_updated: "2020-01-01",
      });

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/history",
        expect.objectContaining({
          body: expect.objectContaining({ category: "school" }),
        }),
      );
    });
  });

  describe("dashboard layout", () => {
    it("returns defaults when no layout stored", () => {
      const pm = usePreferenceManager();
      const layout = pm.getDashboardLayout();
      expect(layout.statsCards).toBeDefined();
      expect(Array.isArray(layout.leftColumn)).toBe(true);
      expect(Array.isArray(layout.rightColumn)).toBe(true);
      expect(layout.leftColumn.length).toBeGreaterThan(0);
    });

    it("returns stored layout when valid v2 format present", () => {
      const pm = usePreferenceManager();
      getInstance("dashboard").preferences.value = {
        statsCards: {
          coaches: false,
          schools: true,
          interactions: true,
          offers: true,
          events: true,
        },
        leftColumn: [{ id: "quickTasks", visible: true }],
        rightColumn: [{ id: "eventsSummary", visible: false }],
      };
      const layout = pm.getDashboardLayout();
      expect(layout.statsCards.coaches).toBe(false);
      expect(layout.leftColumn).toEqual([{ id: "quickTasks", visible: true }]);
      expect(layout.rightColumn).toEqual([
        { id: "eventsSummary", visible: false },
      ]);
    });

    it("setDashboardLayout saves the new layout", async () => {
      const pm = usePreferenceManager();
      const newLayout = {
        statsCards: {
          coaches: true,
          schools: true,
          interactions: true,
          offers: true,
          events: true,
        },
        leftColumn: [{ id: "quickTasks" as const, visible: true }],
        rightColumn: [{ id: "eventsSummary" as const, visible: true }],
      };

      await pm.setDashboardLayout(newLayout);

      const inst = getInstance("dashboard");
      expect(inst.updatePreferences).toHaveBeenCalledTimes(1);
      expect(inst.savePreferences).toHaveBeenCalledTimes(1);
    });

    it("setDashboardLayout tracks history when oldValue exists", async () => {
      const pm = usePreferenceManager();
      getInstance("dashboard").preferences.value = {
        statsCards: {
          coaches: true,
          schools: true,
          interactions: true,
          offers: true,
          events: true,
        },
        leftColumn: [{ id: "quickTasks", visible: true }],
        rightColumn: [{ id: "eventsSummary", visible: true }],
      };
      mockFetchAuth.mockResolvedValueOnce({ ok: true });

      await pm.setDashboardLayout({
        statsCards: {
          coaches: false,
          schools: true,
          interactions: true,
          offers: true,
          events: true,
        },
        leftColumn: [{ id: "quickTasks" as const, visible: false }],
        rightColumn: [{ id: "eventsSummary" as const, visible: true }],
      });

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/history",
        expect.objectContaining({
          body: expect.objectContaining({ category: "dashboard" }),
        }),
      );
    });
  });

  describe("trackPreferenceChange", () => {
    it("is a no-op when no user signed in", async () => {
      const pm = usePreferenceManager();
      mockUserStore.user = null;
      await pm.trackPreferenceChange("notifications", { a: 1 }, { a: 2 });
      expect(mockFetchAuth).not.toHaveBeenCalled();
    });

    it("diffs object fields and posts only changed field names", async () => {
      const pm = usePreferenceManager();
      mockFetchAuth.mockResolvedValue({ ok: true });

      await pm.trackPreferenceChange(
        "player",
        { graduation_year: 2026, primary_sport: "baseball" },
        { graduation_year: 2027, primary_sport: "baseball" },
      );

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/history",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            category: "player",
            changed_fields: ["graduation_year"],
            old_value: { graduation_year: 2026, primary_sport: "baseball" },
            new_value: { graduation_year: 2027, primary_sport: "baseball" },
          }),
        }),
      );
    });

    it("returns early when no fields changed between identical objects", async () => {
      const pm = usePreferenceManager();
      await pm.trackPreferenceChange(
        "player",
        { graduation_year: 2026 },
        { graduation_year: 2026 },
      );
      expect(mockFetchAuth).not.toHaveBeenCalled();
    });

    it("uses sentinel '*' when comparing non-object values", async () => {
      const pm = usePreferenceManager();
      mockFetchAuth.mockResolvedValue({ ok: true });

      await pm.trackPreferenceChange("notifications", "old", "new");

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/history",
        expect.objectContaining({
          body: expect.objectContaining({ changed_fields: ["*"] }),
        }),
      );
    });

    it("swallows API errors without throwing", async () => {
      const pm = usePreferenceManager();
      mockFetchAuth.mockRejectedValue(new Error("history-down"));

      await expect(
        pm.trackPreferenceChange("player", { a: 1 }, { a: 2 }),
      ).resolves.toBeUndefined();
    });
  });

  describe("getPreferenceHistory", () => {
    it("calls the history GET endpoint with category and limit", async () => {
      const pm = usePreferenceManager();
      mockFetchAuth.mockResolvedValue({
        data: [
          {
            id: "h1",
            category: "player",
            old_value: { a: 1 },
            new_value: { a: 2 },
            changed_fields: ["a"],
            changed_by: "user-1",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
        total: 1,
      });

      const result = await pm.getPreferenceHistory("player", 25);

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/player/history",
        expect.objectContaining({
          method: "GET",
          query: { limit: 25 },
        }),
      );
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it("defaults limit to 50 when not provided", async () => {
      const pm = usePreferenceManager();
      mockFetchAuth.mockResolvedValue({ data: [], total: 0 });

      await pm.getPreferenceHistory("notifications");

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/notifications/history",
        expect.objectContaining({ query: { limit: 50 } }),
      );
    });

    it("returns empty result when fetch fails (no rethrow)", async () => {
      const pm = usePreferenceManager();
      mockFetchAuth.mockRejectedValue(new Error("history fetch failed"));

      const result = await pm.getPreferenceHistory("player");

      expect(result).toEqual({ data: [], total: 0 });
    });
  });
});
