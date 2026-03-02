/**
 * Preference Manager Composable
 *
 * High-level preference management that coordinates multiple preference categories
 * and provides typed getters/setters with validation and history tracking
 *
 * Replaces useUserPreferences (V1) with a cleaner, type-safe API built on V2
 */

import { computed } from "vue";
import { useUserPreferencesV2 } from "./useUserPreferencesV2";
import { useAuthFetch } from "./useAuthFetch";
import { useUserStore } from "~/stores/user";
import { createClientLogger } from "~/utils/logger";
import type {
  NotificationSettings,
  HomeLocation,
  PlayerDetails,
  SchoolPreferences,
  DashboardWidgetVisibility,
} from "~/types/models";
import {
  validateNotificationSettings,
  validateHomeLocation,
  validatePlayerDetails,
  validateSchoolPreferences,
  validateDashboardLayout,
  getDefaultNotificationSettings,
  getDefaultDashboardLayout,
} from "~/utils/preferenceValidation";

const logger = createClientLogger("usePreferenceManager");

export function usePreferenceManager() {
  const userStore = useUserStore();
  const { $fetchAuth } = useAuthFetch();

  // Initialize V2 preference instances for each category
  // These handle loading/saving to the API
  const notificationPrefs = useUserPreferencesV2("notifications");
  const locationPrefs = useUserPreferencesV2("location");
  const playerPrefs = useUserPreferencesV2("player");
  const schoolPrefs = useUserPreferencesV2("school");
  const dashboardPrefs = useUserPreferencesV2("dashboard");

  // Combined loading state
  const isLoading = computed(() => {
    return (
      notificationPrefs.isLoading.value ||
      locationPrefs.isLoading.value ||
      playerPrefs.isLoading.value ||
      schoolPrefs.isLoading.value ||
      dashboardPrefs.isLoading.value
    );
  });

  // Combined saving state
  const isSaving = computed(() => {
    return (
      notificationPrefs.isSaving.value ||
      locationPrefs.isSaving.value ||
      playerPrefs.isSaving.value ||
      schoolPrefs.isSaving.value ||
      dashboardPrefs.isSaving.value
    );
  });

  // Combined error state (first non-null error)
  const error = computed(() => {
    return (
      notificationPrefs.error.value ||
      locationPrefs.error.value ||
      playerPrefs.error.value ||
      schoolPrefs.error.value ||
      dashboardPrefs.error.value ||
      null
    );
  });

  /**
   * Load all preferences from the server
   * Uses Promise.all for optimal performance
   */
  const loadAllPreferences = async () => {
    try {
      await Promise.all([
        notificationPrefs.loadPreferences(),
        locationPrefs.loadPreferences(),
        playerPrefs.loadPreferences(),
        schoolPrefs.loadPreferences(),
        dashboardPrefs.loadPreferences(),
      ]);
    } catch (err) {
      logger.error("Failed to load all preferences:", err);
      throw err;
    }
  };

  /**
   * Save all modified preferences to the server
   * Only saves categories that have been modified (isDirty)
   */
  const saveAllPreferences = async () => {
    try {
      const promises = [];

      if (notificationPrefs.hasChanges.value) {
        promises.push(notificationPrefs.savePreferences());
      }
      if (locationPrefs.hasChanges.value) {
        promises.push(locationPrefs.savePreferences());
      }
      if (playerPrefs.hasChanges.value) {
        promises.push(playerPrefs.savePreferences());
      }
      if (schoolPrefs.hasChanges.value) {
        promises.push(schoolPrefs.savePreferences());
      }
      if (dashboardPrefs.hasChanges.value) {
        promises.push(dashboardPrefs.savePreferences());
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (err) {
      logger.error("Failed to save preferences:", err);
      throw err;
    }
  };

  /**
   * Get typed notification settings with validation
   */
  const getNotificationSettings = (): NotificationSettings => {
    const validated = validateNotificationSettings(
      notificationPrefs.preferences.value,
    );
    return validated || getDefaultNotificationSettings();
  };

  /**
   * Set notification settings and mark as dirty
   */
  const setNotificationSettings = async (
    settings: Partial<NotificationSettings>,
  ) => {
    const current = getNotificationSettings();
    const updated = { ...current, ...settings };

    // Track change before updating
    const oldValue = validateNotificationSettings(
      notificationPrefs.preferences.value,
    );

    // Update preferences (marks as dirty)
    notificationPrefs.updatePreferences(updated);

    // Save immediately
    await notificationPrefs.savePreferences();

    // Track in history
    if (oldValue && updated) {
      await trackPreferenceChange("notifications", oldValue, updated);
    }
  };

  /**
   * Get typed home location with validation (reactive)
   */
  const getHomeLocation = computed((): HomeLocation | null =>
    validateHomeLocation(locationPrefs.preferences.value),
  );

  /**
   * Set home location and save (merges with current so partial updates from onboarding work)
   */
  const setHomeLocation = async (location: Partial<HomeLocation>) => {
    const oldValue = validateHomeLocation(locationPrefs.preferences.value);
    const current = oldValue ?? {};
    const merged: HomeLocation = {
      ...current,
      ...location,
    };

    locationPrefs.updatePreferences(merged as Record<string, unknown>);
    await locationPrefs.savePreferences();

    if (oldValue && merged) {
      await trackPreferenceChange("location", oldValue, merged);
    }
  };

  /**
   * Get typed player details with validation
   */
  const getPlayerDetails = (): PlayerDetails | null => {
    return validatePlayerDetails(playerPrefs.preferences.value);
  };

  /**
   * Set player details and save with history tracking (merges with current so partial updates from onboarding work)
   */
  const setPlayerDetails = async (details: Partial<PlayerDetails>) => {
    const oldValue = validatePlayerDetails(playerPrefs.preferences.value);
    const current = oldValue ?? {};
    const merged: PlayerDetails = {
      ...current,
      ...details,
    };

    playerPrefs.updatePreferences(merged as Record<string, unknown>);
    await playerPrefs.savePreferences();

    // Track in history (player details are tracked separately for audit)
    if (oldValue && merged) {
      await trackPreferenceChange("player", oldValue, merged);
    }
  };

  /**
   * Get typed school preferences with validation
   */
  const getSchoolPreferences = (): SchoolPreferences | null => {
    return validateSchoolPreferences(schoolPrefs.preferences.value);
  };

  /**
   * Set school preferences and save with history tracking
   */
  const setSchoolPreferences = async (prefs: SchoolPreferences) => {
    const oldValue = validateSchoolPreferences(schoolPrefs.preferences.value);

    // Add timestamp to school preferences
    const prefsWithTimestamp = {
      ...prefs,
      last_updated: new Date().toISOString(),
    };

    schoolPrefs.updatePreferences(prefsWithTimestamp);
    await schoolPrefs.savePreferences();

    // Track in history
    if (oldValue) {
      await trackPreferenceChange("school", oldValue, prefsWithTimestamp);
    }
  };

  /**
   * Get typed dashboard layout with validation
   */
  const getDashboardLayout = (): DashboardWidgetVisibility => {
    const validated = validateDashboardLayout(dashboardPrefs.preferences.value);
    return validated || getDefaultDashboardLayout();
  };

  /**
   * Set dashboard layout and save
   */
  const setDashboardLayout = async (layout: DashboardWidgetVisibility) => {
    const oldValue = validateDashboardLayout(dashboardPrefs.preferences.value);

    dashboardPrefs.updatePreferences(
      layout as unknown as Record<string, unknown>,
    );
    await dashboardPrefs.savePreferences();

    if (oldValue) {
      await trackPreferenceChange("dashboard", oldValue, layout);
    }
  };

  /**
   * Track preference change in preference_history table
   * This is called automatically by setters, but can be called manually if needed
   */
  const trackPreferenceChange = async (
    category: string,
    oldValue: unknown,
    newValue: unknown,
  ): Promise<void> => {
    if (!userStore?.user) return;

    try {
      // Determine which fields changed
      const changedFields: string[] = [];

      if (
        oldValue &&
        newValue &&
        typeof oldValue === "object" &&
        typeof newValue === "object"
      ) {
        const oldObj = oldValue as Record<string, unknown>;
        const newObj = newValue as Record<string, unknown>;

        for (const key of Object.keys(newObj)) {
          if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
            changedFields.push(key);
          }
        }
      } else {
        changedFields.push("*"); // Entire value changed
      }

      if (changedFields.length === 0) return; // No changes to track

      // Call history API to record the change
      await $fetchAuth("/api/user/preferences/history", {
        method: "POST",
        body: {
          category,
          old_value: oldValue,
          new_value: newValue,
          changed_fields: changedFields,
        },
      });
    } catch (err) {
      logger.warn("Failed to track preference change:", err);
      // Don't throw - history tracking failure shouldn't break the save
    }
  };

  /**
   * Get preference change history for a category
   */
  const getPreferenceHistory = async (category: string, limit = 50) => {
    try {
      const response = await $fetchAuth<{
        data: Array<{
          id: string;
          category: string;
          old_value: unknown;
          new_value: unknown;
          changed_fields: string[];
          changed_by: string;
          created_at: string;
        }>;
        total: number;
      }>(`/api/user/preferences/${category}/history`, {
        method: "GET",
        query: { limit },
      });
      return response as {
        data: Array<{
          id: string;
          category: string;
          old_value: unknown;
          new_value: unknown;
          changed_fields: string[];
          changed_by: string;
          created_at: string;
        }>;
        total: number;
      };
    } catch (err) {
      logger.error(`Failed to fetch history for ${category}:`, err);
      return { data: [], total: 0 };
    }
  };

  /**
   * Clear all local preference changes (without saving)
   */
  const clearAllChanges = () => {
    notificationPrefs.clear();
    locationPrefs.clear();
    playerPrefs.clear();
    schoolPrefs.clear();
    dashboardPrefs.clear();
  };

  return {
    // Raw V2 instances (for advanced access)
    notificationPrefs,
    locationPrefs,
    playerPrefs,
    schoolPrefs,
    dashboardPrefs,

    // State
    isLoading,
    isSaving,
    error,

    // Coordinated operations
    loadAllPreferences,
    saveAllPreferences,
    clearAllChanges,

    // Notification settings
    getNotificationSettings,
    setNotificationSettings,

    // Home location
    getHomeLocation,
    setHomeLocation,

    // Player details
    getPlayerDetails,
    setPlayerDetails,

    // School preferences
    getSchoolPreferences,
    setSchoolPreferences,

    // Dashboard layout
    getDashboardLayout,
    setDashboardLayout,

    // History operations
    trackPreferenceChange,
    getPreferenceHistory,
  };
}
