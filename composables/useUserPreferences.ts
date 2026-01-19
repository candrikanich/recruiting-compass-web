import { ref, computed, type ComputedRef, type Ref } from 'vue'
import { useSupabase } from './useSupabase'
import { useUserStore } from '~/stores/user'
import type { NotificationSettings, UserPreferences, HomeLocation, PlayerDetails, SchoolPreferences, PreferenceHistoryEntry, DashboardWidgetVisibility } from '~/types/models'

export const useUserPreferences = (): {
  preferences: Ref<UserPreferences | null>
  notificationSettings: ComputedRef<NotificationSettings | null>
  homeLocation: ComputedRef<HomeLocation | null>
  playerDetails: ComputedRef<PlayerDetails | null>
  schoolPreferences: ComputedRef<SchoolPreferences | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  fetchPreferences: () => Promise<void>
  fetchUserPreferences: () => Promise<void>
  createDefaultPreferences: () => Promise<void>
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>
  updateHomeLocation: (location: HomeLocation) => Promise<void>
  updatePlayerDetails: (details: PlayerDetails) => Promise<void>
  updateSchoolPreferences: (prefs: SchoolPreferences) => Promise<void>
  updateDashboardLayout: (layout: DashboardWidgetVisibility) => Promise<void>
} => {
  const supabase = useSupabase()
  let userStore: ReturnType<typeof useUserStore> | undefined
  const getUserStore = () => {
    if (!userStore) {
      userStore = useUserStore()
    }
    return userStore
  }

  const preferences = ref<UserPreferences | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchPreferences = async () => {
    if (!userStore.user) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userStore.user.id)
        .single()

      if (fetchError) {
        // If no preferences exist, create default
        if (fetchError.code === 'PGRST116') {
          await createDefaultPreferences()
          return
        }
        throw fetchError
      }

      preferences.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch preferences'
      console.error('Failed to fetch preferences:', err)
    } finally {
      loading.value = false
    }
  }

  const createDefaultPreferences = async () => {
    if (!userStore.user) return

    const defaultSettings: NotificationSettings = {
      followUpReminderDays: 7,
      enableFollowUpReminders: true,
      enableDeadlineAlerts: true,
      enableDailyDigest: true,
      enableInboundInteractionAlerts: true,
      enableEmailNotifications: true,
      emailOnlyHighPriority: true
    }

    try {
      const { data, error: createError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userStore.user.id,
          notification_settings: defaultSettings,
          communication_templates: {},
          dashboard_layout: {}
        })
        .select()
        .single()

      if (createError) throw createError
      preferences.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create default preferences'
      console.error('Failed to create default preferences:', err)
    }
  }

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    if (!userStore.user || !preferences.value) return

    loading.value = true
    error.value = null

    try {
      const updated = {
        ...preferences.value.notification_settings,
        ...settings
      }

      const { data, error: updateError } = await supabase
        .from('user_preferences')
        .update({ notification_settings: updated })
        .eq('user_id', userStore.user.id)
        .select()
        .single()

      if (updateError) throw updateError
      preferences.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update notification settings'
      console.error('Failed to update notification settings:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateHomeLocation = async (location: HomeLocation) => {
    if (!userStore.user || !preferences.value) return

    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('user_preferences')
        .update({ home_location: location })
        .eq('user_id', userStore.user.id)
        .select()
        .single()

      if (updateError) throw updateError
      preferences.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update home location'
      console.error('Failed to update home location:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const notificationSettings = computed<NotificationSettings | null>(() => {
    if (!preferences.value) return null
    return preferences.value.notification_settings as NotificationSettings
  })

  const homeLocation = computed<HomeLocation | null>(() => {
    if (!preferences.value) return null
    return preferences.value.home_location || null
  })

  const playerDetails = computed<PlayerDetails | null>(() => {
    if (!preferences.value) return null
    return preferences.value.player_details || null
  })

  const schoolPreferences = computed<SchoolPreferences | null>(() => {
    if (!preferences.value) return null
    return preferences.value.school_preferences || null
  })

  const updatePlayerDetails = async (details: PlayerDetails) => {
    if (!userStore.user || !preferences.value) return

    loading.value = true
    error.value = null

    try {
      // Track history
      const historyEntry: PreferenceHistoryEntry = {
        timestamp: new Date().toISOString(),
        changed_by: userStore.user.id,
        changes: []
      }

      const oldDetails = preferences.value.player_details || {}
      for (const key of Object.keys(details) as (keyof PlayerDetails)[]) {
        if (JSON.stringify(oldDetails[key]) !== JSON.stringify(details[key])) {
          historyEntry.changes.push({
            field: `player_details.${key}`,
            old_value: oldDetails[key],
            new_value: details[key]
          })
        }
      }

      const currentHistory = preferences.value.preference_history || []
      const newHistory = historyEntry.changes.length > 0
        ? [...currentHistory.slice(-49), historyEntry] // Keep last 50
        : currentHistory

      const { data, error: updateError } = await supabase
        .from('user_preferences')
        .update({
          player_details: details,
          preference_history: newHistory
        })
        .eq('user_id', userStore.user.id)
        .select()
        .single()

      if (updateError) throw updateError
      preferences.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update player details'
      console.error('Failed to update player details:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateSchoolPreferences = async (prefs: SchoolPreferences) => {
    if (!userStore.user || !preferences.value) return

    loading.value = true
    error.value = null

    try {
      // Add timestamp
      const prefsWithTimestamp = {
        ...prefs,
        last_updated: new Date().toISOString()
      }

      // Track history
      const historyEntry: PreferenceHistoryEntry = {
        timestamp: new Date().toISOString(),
        changed_by: userStore.user.id,
        changes: [{
          field: 'school_preferences',
          old_value: preferences.value.school_preferences,
          new_value: prefsWithTimestamp
        }]
      }

      const currentHistory = preferences.value.preference_history || []
      const newHistory = [...currentHistory.slice(-49), historyEntry]

      const { data, error: updateError } = await supabase
        .from('user_preferences')
        .update({
          school_preferences: prefsWithTimestamp,
          preference_history: newHistory
        })
        .eq('user_id', userStore.user.id)
        .select()
        .single()

      if (updateError) throw updateError
      preferences.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update school preferences'
      console.error('Failed to update school preferences:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateDashboardLayout = async (layout: DashboardWidgetVisibility) => {
    if (!userStore.user || !preferences.value) return

    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('user_preferences')
        .update({ dashboard_layout: layout })
        .eq('user_id', userStore.user.id)
        .select()
        .single()

      if (updateError) throw updateError
      preferences.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update dashboard layout'
      console.error('Failed to update dashboard layout:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    preferences,
    notificationSettings,
    homeLocation,
    playerDetails,
    schoolPreferences,
    loading,
    error,
    fetchPreferences,
    fetchUserPreferences: fetchPreferences,
    createDefaultPreferences,
    updateNotificationSettings,
    updateHomeLocation,
    updatePlayerDetails,
    updateSchoolPreferences,
    updateDashboardLayout
  }
}
