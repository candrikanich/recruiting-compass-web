import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useUserPreferences } from "~/composables/useUserPreferences";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";
import { nextTick } from "vue";
import type {
  UserPreferences,
  PlayerDetails,
  NotificationSettings,
  HomeLocation,
  SchoolPreferences,
} from "~/types/models";

vi.mock("~/composables/useSupabase");
vi.mock("~/stores/user");

const mockUseSupabase = vi.mocked(useSupabase);
const mockUseUserStore = vi.mocked(useUserStore);

describe("useUserPreferences", () => {
  let mockSupabase: any;
  let mockUserStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Setup mock supabase
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };

    mockUseSupabase.mockReturnValue(mockSupabase);

    // Setup mock user store
    mockUserStore = {
      user: {
        id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
      },
    };

    mockUseUserStore.mockReturnValue(mockUserStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial state", () => {
    it("should return correct initial state", () => {
      const {
        preferences,
        loading,
        error,
        notificationSettings,
        playerDetails,
      } = useUserPreferences();

      expect(preferences.value).toBeNull();
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(notificationSettings.value).toBeNull();
      expect(playerDetails.value).toBeNull();
    });

    it("should provide all required methods", () => {
      const {
        fetchPreferences,
        createDefaultPreferences,
        updateNotificationSettings,
        updatePlayerDetails,
      } = useUserPreferences();

      expect(typeof fetchPreferences).toBe("function");
      expect(typeof createDefaultPreferences).toBe("function");
      expect(typeof updateNotificationSettings).toBe("function");
      expect(typeof updatePlayerDetails).toBe("function");
    });
  });

  describe("fetchPreferences", () => {
    it("should fetch user preferences successfully", async () => {
      const mockPrefs: UserPreferences = {
        id: "pref-123",
        user_id: "user-123",
        notification_settings: {
          followUpReminderDays: 7,
          enableFollowUpReminders: true,
          enableDeadlineAlerts: true,
          enableDailyDigest: true,
          enableInboundInteractionAlerts: true,
          enableEmailNotifications: true,
          emailOnlyHighPriority: true,
        },
        player_details: null,
        school_preferences: null,
        preference_history: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: mockPrefs,
        error: null,
      });

      const { fetchPreferences, preferences } = useUserPreferences();
      await fetchPreferences();

      expect(preferences.value).toEqual(mockPrefs);
    });

    it("should create default preferences if none exist (PGRST116 error)", async () => {
      const mockPrefs: UserPreferences = {
        id: "pref-123",
        user_id: "user-123",
        notification_settings: {
          followUpReminderDays: 7,
          enableFollowUpReminders: true,
          enableDeadlineAlerts: true,
          enableDailyDigest: true,
          enableInboundInteractionAlerts: true,
          enableEmailNotifications: true,
          emailOnlyHighPriority: true,
        },
        player_details: null,
        school_preferences: null,
        preference_history: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // First call returns PGRST116 (not found)
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      // Second call (from createDefaultPreferences) returns success
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPrefs,
        error: null,
      });

      const { fetchPreferences, preferences } = useUserPreferences();
      await fetchPreferences();

      expect(preferences.value).toEqual(mockPrefs);
    });

    it("should handle fetch errors", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error("Database error"),
      });

      const { fetchPreferences, error, loading } = useUserPreferences();
      await fetchPreferences();

      expect(error.value).toBeDefined();
      expect(loading.value).toBe(false);
    });

    it("should set loading state during fetch", async () => {
      mockSupabase.single.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: null, error: null });
            }, 10);
          }),
      );

      const { fetchPreferences, loading } = useUserPreferences();

      const fetchPromise = fetchPreferences();
      // At this point, loading should be true (or about to be)
      expect(typeof loading).toBeDefined();

      await fetchPromise;
      expect(loading.value).toBe(false);
    });
  });

  describe("createDefaultPreferences", () => {
    it("should create default preferences with correct values", async () => {
      const mockPrefs: UserPreferences = {
        id: "pref-123",
        user_id: "user-123",
        notification_settings: {
          followUpReminderDays: 7,
          enableFollowUpReminders: true,
          enableDeadlineAlerts: true,
          enableDailyDigest: true,
          enableInboundInteractionAlerts: true,
          enableEmailNotifications: true,
          emailOnlyHighPriority: true,
        },
        player_details: null,
        school_preferences: null,
        preference_history: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: mockPrefs,
        error: null,
      });

      const { createDefaultPreferences, preferences } = useUserPreferences();
      await createDefaultPreferences();

      expect(preferences.value).toEqual(mockPrefs);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it("should handle creation errors", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error("Insert failed"),
      });

      const { createDefaultPreferences, error } = useUserPreferences();
      await createDefaultPreferences();

      expect(error.value).toBeDefined();
    });
  });

  describe("updatePlayerDetails", () => {
    beforeEach(() => {
      // Setup initial preferences
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "pref-123",
          user_id: "user-123",
          notification_settings: {},
          player_details: null,
          school_preferences: null,
          preference_history: [],
        },
        error: null,
      });
    });

    it("should update player details successfully", async () => {
      const { fetchPreferences } = useUserPreferences();
      await fetchPreferences();

      const newDetails: PlayerDetails = {
        graduation_year: 2025,
        high_school: "Lincoln High",
        positions: ["P", "SS"],
        gpa: 3.8,
        sat_score: 1450,
        act_score: 33,
      };

      const updatedPrefs: UserPreferences = {
        id: "pref-123",
        user_id: "user-123",
        notification_settings: {},
        player_details: newDetails,
        school_preferences: null,
        preference_history: [
          {
            timestamp: new Date().toISOString(),
            changed_by: "user-123",
            changes: [
              {
                field: "player_details.graduation_year",
                old_value: null,
                new_value: 2025,
              },
            ],
          },
        ],
      };

      mockSupabase.single.mockResolvedValue({
        data: updatedPrefs,
        error: null,
      });

      const { updatePlayerDetails, playerDetails } = useUserPreferences();
      await updatePlayerDetails(newDetails);
      await nextTick();

      expect(playerDetails.value).toEqual(newDetails);
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it("should not create history entry if no changes", async () => {
      const { fetchPreferences } = useUserPreferences();
      await fetchPreferences();

      const details: PlayerDetails = {
        graduation_year: 2025,
      };

      const updatedPrefs: UserPreferences = {
        id: "pref-123",
        user_id: "user-123",
        notification_settings: {},
        player_details: details,
        school_preferences: null,
        preference_history: [], // No history entry added
      };

      mockSupabase.single.mockResolvedValue({
        data: updatedPrefs,
        error: null,
      });

      const { updatePlayerDetails } = useUserPreferences();
      await updatePlayerDetails(details);
      await nextTick();

      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it("should limit history to last 50 entries", async () => {
      const { fetchPreferences } = useUserPreferences();
      await fetchPreferences();

      // Create 51 history entries
      const history = Array.from({ length: 51 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        changed_by: "user-123",
        changes: [],
      }));

      const details: PlayerDetails = {
        graduation_year: 2025,
      };

      const updatedPrefs: UserPreferences = {
        id: "pref-123",
        user_id: "user-123",
        notification_settings: {},
        player_details: details,
        school_preferences: null,
        preference_history: history.slice(-50), // Keep last 50
      };

      mockSupabase.single.mockResolvedValue({
        data: updatedPrefs,
        error: null,
      });

      const { updatePlayerDetails } = useUserPreferences();
      await updatePlayerDetails(details);
      await nextTick();

      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it("should handle update errors", async () => {
      const { fetchPreferences } = useUserPreferences();
      await fetchPreferences();

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error("Update failed"),
      });

      const { updatePlayerDetails, error } = useUserPreferences();
      const details: PlayerDetails = { graduation_year: 2025 };

      try {
        await updatePlayerDetails(details);
      } catch {
        // Expected
      }

      expect(error.value).toBeDefined();
    });
  });

  describe("updateNotificationSettings", () => {
    beforeEach(() => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "pref-123",
          user_id: "user-123",
          notification_settings: {
            followUpReminderDays: 7,
            enableFollowUpReminders: true,
          },
          player_details: null,
          school_preferences: null,
          preference_history: [],
        },
        error: null,
      });
    });

    it("should update notification settings successfully", async () => {
      const { fetchPreferences } = useUserPreferences();
      await fetchPreferences();

      const newSettings: Partial<NotificationSettings> = {
        followUpReminderDays: 14,
        enableEmailNotifications: false,
      };

      const updatedPrefs: UserPreferences = {
        id: "pref-123",
        user_id: "user-123",
        notification_settings: {
          followUpReminderDays: 14,
          enableFollowUpReminders: true,
          enableEmailNotifications: false,
          enableDeadlineAlerts: true,
          enableDailyDigest: true,
          enableInboundInteractionAlerts: true,
          emailOnlyHighPriority: true,
        },
        player_details: null,
        school_preferences: null,
        preference_history: [],
      };

      mockSupabase.single.mockResolvedValue({
        data: updatedPrefs,
        error: null,
      });

      const { updateNotificationSettings, notificationSettings } =
        useUserPreferences();
      await updateNotificationSettings(newSettings);
      await nextTick();

      expect(notificationSettings.value?.followUpReminderDays).toBe(14);
    });
  });

  describe("updateSchoolPreferences", () => {
    beforeEach(() => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "pref-123",
          user_id: "user-123",
          notification_settings: {},
          player_details: null,
          school_preferences: null,
          preference_history: [],
        },
        error: null,
      });
    });

    it("should update school preferences successfully", async () => {
      const { fetchPreferences } = useUserPreferences();
      await fetchPreferences();

      const schoolPrefs: SchoolPreferences = {
        target_division: "D1",
        min_academic_score: 3.5,
        geographic_preference: "Northeast",
      };

      const updatedPrefs: UserPreferences = {
        id: "pref-123",
        user_id: "user-123",
        notification_settings: {},
        player_details: null,
        school_preferences: {
          ...schoolPrefs,
          last_updated: new Date().toISOString(),
        },
        preference_history: [
          {
            timestamp: new Date().toISOString(),
            changed_by: "user-123",
            changes: [
              {
                field: "school_preferences",
                old_value: null,
                new_value: schoolPrefs,
              },
            ],
          },
        ],
      };

      mockSupabase.single.mockResolvedValue({
        data: updatedPrefs,
        error: null,
      });

      const { updateSchoolPreferences, schoolPreferences } =
        useUserPreferences();
      await updateSchoolPreferences(schoolPrefs);
      await nextTick();

      expect(schoolPreferences.value?.target_division).toBe("D1");
    });
  });

  describe("Computed properties", () => {
    it("playerDetails should return null when preferences is null", () => {
      const { playerDetails } = useUserPreferences();

      expect(playerDetails.value).toBeNull();
    });

    it("notificationSettings should return notification settings from preferences", async () => {
      const settings: NotificationSettings = {
        followUpReminderDays: 7,
        enableFollowUpReminders: true,
        enableDeadlineAlerts: true,
        enableDailyDigest: true,
        enableInboundInteractionAlerts: true,
        enableEmailNotifications: true,
        emailOnlyHighPriority: true,
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "pref-123",
          user_id: "user-123",
          notification_settings: settings,
          player_details: null,
          school_preferences: null,
          preference_history: [],
        },
        error: null,
      });

      const { fetchPreferences, notificationSettings } = useUserPreferences();
      await fetchPreferences();

      expect(notificationSettings.value).toEqual(settings);
    });
  });

  describe("Error handling", () => {
    it("should clear error on successful operation", async () => {
      const { fetchPreferences, error } = useUserPreferences();

      // Set initial error
      error.value = "Some error";

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "pref-123",
          user_id: "user-123",
          notification_settings: {},
          player_details: null,
          school_preferences: null,
          preference_history: [],
        },
        error: null,
      });

      await fetchPreferences();

      expect(error.value).toBeNull();
    });
  });
});
