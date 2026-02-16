/**
 * Composable for managing user preferences stored server-side
 *
 * ✨ NEW: Server-side storage replaces localStorage for Phase 2
 *
 * Stores user preferences in Supabase user_preferences table,
 * enabling persistence across sessions and devices.
 *
 * Categories:
 * - "session" - Session timeout, activity tracking
 * - "filters" - Search/filter state
 * - "display" - UI preferences, layout settings
 *
 * @example
 * const { preferences, savePreferences, loadPreferences } = useUserPreferencesV2('filters')
 *
 * await loadPreferences()
 * preferences.value.activeFilters = ['division-1', 'state-CA']
 * await savePreferences()
 *
 * @param category - Preference category key
 * @returns Composable with load/save operations
 */

import { ref, computed } from "vue";
import { useSupabase } from "~/composables/useSupabase";

export type PreferenceCategory =
  | "session"
  | "filters"
  | "display"
  | (string & {});

interface UserPreferencesState {
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastSavedAt: Date | null;
  isDirty: boolean;
}

export function useUserPreferencesV2(category: PreferenceCategory) {
  const supabase = useSupabase();
  // State
  const preferences = ref<Record<string, unknown>>({});
  const state = ref<UserPreferencesState>({
    loading: false,
    saving: false,
    error: null,
    lastSavedAt: null,
    isDirty: false,
  });

  // Computed properties
  const isLoading = computed(() => state.value.loading);
  const isSaving = computed(() => state.value.saving);
  const error = computed(() => state.value.error);
  const hasChanges = computed(() => state.value.isDirty);

  /**
   * Load preferences from server
   * Falls back to localStorage if server request fails (offline support)
   */
  const loadPreferences = async () => {
    state.value.loading = true;
    state.value.error = null;

    try {
      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("No authentication token available");
      }

      const res = await fetch(`/api/user/preferences/${category}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load preferences: ${res.status}`);
      }

      const response = (await res.json()) as {
        data?: Record<string, unknown>;
        category?: string;
        exists?: boolean;
      };

      if (response?.data) {
        preferences.value = response.data;
        state.value.isDirty = false;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load preferences";
      console.warn(
        `[useUserPreferencesV2] Failed to load ${category}:`,
        message,
      );
      state.value.error = message;

      // Fallback: try to load from localStorage if offline
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(`user_prefs_${category}`);
        if (cached) {
          try {
            preferences.value = JSON.parse(cached);
            console.debug(
              `[useUserPreferencesV2] Loaded ${category} from localStorage fallback`,
            );
          } catch {
            // Ignore parse errors
          }
        }
      }
    } finally {
      state.value.loading = false;
    }
  };

  /**
   * Save preferences to server
   * Also caches to localStorage for offline support
   */
  const savePreferences = async () => {
    state.value.saving = true;
    state.value.error = null;

    try {
      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("No authentication token available");
      }

      const res = await fetch(`/api/user/preferences/${category}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: preferences.value,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to save preferences: ${res.status}`);
      }

      const response = await res.json();

      state.value.lastSavedAt = new Date();
      state.value.isDirty = false;

      // Also save to localStorage as fallback
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `user_prefs_${category}`,
          JSON.stringify(preferences.value),
        );
      }

      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save preferences";
      console.error(
        `[useUserPreferencesV2] Failed to save ${category}:`,
        message,
      );
      state.value.error = message;

      // Still cache to localStorage so changes aren't lost
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `user_prefs_${category}`,
          JSON.stringify(preferences.value),
        );
      }

      throw err;
    } finally {
      state.value.saving = false;
    }
  };

  /**
   * Delete preferences from server
   */
  const deletePreferences = async () => {
    state.value.saving = true;
    state.value.error = null;

    try {
      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("No authentication token available");
      }

      const res = await fetch(`/api/user/preferences/${category}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to delete preferences: ${res.status}`);
      }

      preferences.value = {};
      state.value.isDirty = false;

      // Also remove from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem(`user_prefs_${category}`);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete preferences";
      console.error(
        `[useUserPreferencesV2] Failed to delete ${category}:`,
        message,
      );
      state.value.error = message;

      throw err;
    } finally {
      state.value.saving = false;
    }
  };

  /**
   * Update a specific preference key
   * Marks preferences as dirty (unsaved)
   */
  const updatePreference = (key: string, value: unknown) => {
    preferences.value[key] = value;
    state.value.isDirty = true;
  };

  /**
   * Bulk update preferences
   */
  const updatePreferences = (updates: Record<string, unknown>) => {
    Object.assign(preferences.value, updates);
    state.value.isDirty = true;
  };

  /**
   * Clear all preferences (without saving)
   */
  const clear = () => {
    preferences.value = {};
    state.value.isDirty = true;
    state.value.error = null;
  };

  return {
    // State
    preferences,
    isLoading,
    isSaving,
    error,
    hasChanges,
    lastSavedAt: computed(() => state.value.lastSavedAt),

    // Methods
    loadPreferences,
    savePreferences,
    deletePreferences,
    updatePreference,
    updatePreferences,
    clear,
  };
}
