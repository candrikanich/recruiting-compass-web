<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <Header />

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink to="/settings" class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2">
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">Notification Preferences</h1>
        <p class="text-slate-600">Configure how you receive alerts and updates</p>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div v-if="loading && !notificationSettings" class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-slate-600">Loading preferences...</p>
      </div>

      <div v-else-if="notificationSettings" class="space-y-6">
        <!-- In-App Notifications Section -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">In-App Notifications</h2>
          <div class="space-y-4">
            <!-- Follow-up Reminders -->
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <label class="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="localSettings.enableFollowUpReminders"
                    class="w-4 h-4 text-blue-600 rounded"
                  />
                  <span class="ml-3 text-sm font-medium text-gray-900">Coach Follow-Up Reminders</span>
                </label>
                <p class="ml-7 text-xs text-gray-600">Remind me when I haven't contacted a coach in a while</p>
              </div>
              <div v-if="localSettings.enableFollowUpReminders" class="flex items-center gap-2">
                <input
                  type="number"
                  v-model.number="localSettings.followUpReminderDays"
                  min="1"
                  max="90"
                  class="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span class="text-sm text-gray-600 whitespace-nowrap">days</span>
              </div>
            </div>

            <!-- Deadline Alerts -->
            <div class="flex items-start">
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localSettings.enableDeadlineAlerts"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <div class="ml-3">
                  <span class="text-sm font-medium text-gray-900">Deadline Alerts</span>
                  <p class="text-xs text-gray-600">Notify me about upcoming offer/event deadlines</p>
                </div>
              </label>
            </div>

            <!-- Daily Digest -->
            <div class="flex items-start">
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localSettings.enableDailyDigest"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <div class="ml-3">
                  <span class="text-sm font-medium text-gray-900">Daily Digest</span>
                  <p class="text-xs text-gray-600">Receive a daily summary of activity</p>
                </div>
              </label>
            </div>

            <!-- Inbound Interaction Alerts -->
            <div class="flex items-start">
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localSettings.enableInboundInteractionAlerts"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <div class="ml-3">
                  <span class="text-sm font-medium text-gray-900">Inbound Contact Alerts</span>
                  <p class="text-xs text-gray-600">Notify me when a coach reaches out</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Email Notifications Section -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Email Notifications</h2>
          <div class="space-y-4">
            <div class="flex items-start">
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localSettings.enableEmailNotifications"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <div class="ml-3">
                  <span class="text-sm font-medium text-gray-900">Enable Email Notifications</span>
                  <p class="text-xs text-gray-600">Send important notifications via email</p>
                </div>
              </label>
            </div>

            <div v-if="localSettings.enableEmailNotifications" class="ml-7 flex items-start">
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localSettings.emailOnlyHighPriority"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <div class="ml-3">
                  <span class="text-sm font-medium text-gray-900">High-Priority Only</span>
                  <p class="text-xs text-gray-600">Only email me for urgent notifications</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end gap-4">
          <button
            @click="handleReset"
            class="px-6 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Reset to Defaults
          </button>
          <button
            @click="handleSave"
            :disabled="saving"
            class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {{ saving ? 'Saving...' : 'Save Preferences' }}
          </button>
        </div>

        <!-- Success/Error Messages -->
        <div v-if="saveSuccess" class="bg-green-50 border border-green-200 rounded-lg p-4">
          <p class="text-green-800">Preferences saved successfully</p>
        </div>
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-700">Error: {{ error }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useUserPreferences } from '~/composables/useUserPreferences'
import type { NotificationSettings } from '~/types/models'

definePageMeta({ middleware: 'auth' })

const { notificationSettings, loading, error, fetchPreferences, updateNotificationSettings } = useUserPreferences()

const localSettings = reactive<NotificationSettings>({
  followUpReminderDays: 7,
  enableFollowUpReminders: true,
  enableDeadlineAlerts: true,
  enableDailyDigest: true,
  enableInboundInteractionAlerts: true,
  enableEmailNotifications: true,
  emailOnlyHighPriority: true
})

const saving = ref(false)
const saveSuccess = ref(false)

watch(notificationSettings, (settings) => {
  if (settings) {
    Object.assign(localSettings, settings)
  }
}, { immediate: true })

const handleSave = async () => {
  saving.value = true
  saveSuccess.value = false

  await updateNotificationSettings(localSettings)

  if (!error.value) {
    saveSuccess.value = true
    setTimeout(() => (saveSuccess.value = false), 3000)
  }

  saving.value = false
}

const handleReset = () => {
  Object.assign(localSettings, {
    followUpReminderDays: 7,
    enableFollowUpReminders: true,
    enableDeadlineAlerts: true,
    enableDailyDigest: true,
    enableInboundInteractionAlerts: true,
    enableEmailNotifications: true,
    emailOnlyHighPriority: true
  })
}

onMounted(() => {
  fetchPreferences()
})
</script>
