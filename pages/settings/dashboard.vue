<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/settings"
          class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">
          Dashboard Customization
        </h1>
        <p class="text-slate-600">
          Show or hide dashboard widgets to customize your experience
        </p>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Content -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div class="p-6 border-b border-gray-200">
          <!-- Stats Cards Section -->
          <div class="mb-8">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">
                Summary Statistics
              </h2>
              <div class="flex gap-2">
                <button
                  @click="selectAllStats"
                  class="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Select All
                </button>
                <span class="text-gray-300">|</span>
                <button
                  @click="deselectAllStats"
                  class="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.statsCards.coaches"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="flex-1">
                  <span class="font-medium text-gray-900">👥 Coaches</span>
                  <p class="text-xs text-gray-600">
                    Total coaches in your list
                  </p>
                </span>
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.statsCards.schools"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="flex-1">
                  <span class="font-medium text-gray-900">🏫 Schools</span>
                  <p class="text-xs text-gray-600">Schools you're tracking</p>
                </span>
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.statsCards.interactions"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="flex-1">
                  <span class="font-medium text-gray-900">💬 Interactions</span>
                  <p class="text-xs text-gray-600">
                    Emails, calls, and messages
                  </p>
                </span>
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.statsCards.offers"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="flex-1">
                  <span class="font-medium text-gray-900">📝 Offers</span>
                  <p class="text-xs text-gray-600">
                    Scholarship offers received
                  </p>
                </span>
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.statsCards.events"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="flex-1">
                  <span class="font-medium text-gray-900">📅 Events</span>
                  <p class="text-xs text-gray-600">
                    Camps, showcases, and visits
                  </p>
                </span>
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.statsCards.performance"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="flex-1">
                  <span class="font-medium text-gray-900">📊 Performance</span>
                  <p class="text-xs text-gray-600">
                    Recorded metrics and stats
                  </p>
                </span>
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.statsCards.notifications"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="flex-1">
                  <span
                    class="font-medium text-gray-900 flex items-center gap-2"
                  >
                    <BellIcon class="w-5 h-5" />
                    <span>Notifications</span>
                  </span>
                  <p class="text-xs text-gray-600">
                    Pending alerts and reminders
                  </p>
                </span>
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.statsCards.socialMedia"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="flex-1">
                  <span class="font-medium text-gray-900">📱 Social Media</span>
                  <p class="text-xs text-gray-600">
                    Linked accounts and followers
                  </p>
                </span>
              </label>
            </div>
          </div>

          <!-- Dashboard Widgets Section -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">
                Dashboard Widgets
              </h2>
              <div class="flex gap-2">
                <button
                  @click="selectAllWidgets"
                  class="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Select All
                </button>
                <span class="text-gray-300">|</span>
                <button
                  @click="deselectAllWidgets"
                  class="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.atAGlanceSummary"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >At a Glance Summary</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.offerStatusOverview"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Offer Status Overview</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.interactionTrendChart"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Interaction Trends</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.schoolInterestChart"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >School Interest Chart</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.schoolMapWidget"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >School Map</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.coachFollowupWidget"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Coach Followup</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.eventsSummary"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Events Summary</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.performanceSummary"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Performance Summary</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.recentDocuments"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Recent Documents</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.interactionStats"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Interaction Statistics</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.schoolStatusOverview"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >School Status Overview</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.coachResponsiveness"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Coach Responsiveness</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.upcomingDeadlines"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Upcoming Deadlines</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.recentNotifications"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Recent Notifications</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.linkedAccounts"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Linked Accounts</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.recruitingCalendar"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Recruiting Calendar</span
                >
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="localLayout.widgets.quickTasks"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded"
                />
                <span class="text-sm font-medium text-gray-900"
                  >Quick Tasks</span
                >
              </label>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div
          class="px-6 py-4 bg-gray-50 rounded-b-lg flex gap-3 justify-between"
        >
          <button
            @click="resetToDefaults"
            class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium transition"
          >
            Reset to Defaults
          </button>

          <div class="flex gap-3">
            <router-link
              to="/settings"
              class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium transition"
            >
              Cancel
            </router-link>

            <button
              @click="saveChanges"
              :disabled="loading"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {{ loading ? "Saving..." : "Save Changes" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Status Messages -->
      <div
        v-if="successMessage"
        class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2"
      >
        <CheckIcon class="w-5 h-5" />
        <span>{{ successMessage }}</span>
      </div>

      <div
        v-if="errorMessage"
        class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2"
      >
        <XMarkIcon class="w-5 h-5" />
        <span>{{ errorMessage }}</span>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { CheckIcon, XMarkIcon, BellIcon } from "@heroicons/vue/24/solid";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { getDefaultDashboardLayout } from "~/utils/preferenceValidation";
import type { DashboardWidgetVisibility } from "~/types/models";
import Header from "~/components/Header.vue";

const { isSaving, getDashboardLayout, setDashboardLayout } =
  usePreferenceManager();

const localLayout = ref<DashboardWidgetVisibility>(getDefaultDashboardLayout());

const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const loading = computed(() => isSaving.value);

onMounted(async () => {
  const layout = getDashboardLayout();
  localLayout.value = layout;
});

const selectAllStats = () => {
  Object.keys(localLayout.value.statsCards).forEach((key) => {
    localLayout.value.statsCards[
      key as keyof typeof localLayout.value.statsCards
    ] = true;
  });
};

const deselectAllStats = () => {
  Object.keys(localLayout.value.statsCards).forEach((key) => {
    localLayout.value.statsCards[
      key as keyof typeof localLayout.value.statsCards
    ] = false;
  });
};

const selectAllWidgets = () => {
  Object.keys(localLayout.value.widgets).forEach((key) => {
    localLayout.value.widgets[key as keyof typeof localLayout.value.widgets] =
      true;
  });
};

const deselectAllWidgets = () => {
  Object.keys(localLayout.value.widgets).forEach((key) => {
    localLayout.value.widgets[key as keyof typeof localLayout.value.widgets] =
      false;
  });
};

const resetToDefaults = () => {
  localLayout.value = {
    statsCards: {
      coaches: true,
      schools: true,
      interactions: true,
      offers: true,
      events: true,
      performance: true,
      notifications: true,
      socialMedia: true,
    },
    widgets: {
      recentNotifications: true,
      linkedAccounts: true,
      recruitingCalendar: true,
      quickTasks: true,
      atAGlanceSummary: true,
      offerStatusOverview: true,
      interactionTrendChart: true,
      schoolInterestChart: true,
      schoolMapWidget: true,
      coachFollowupWidget: true,
      eventsSummary: true,
      performanceSummary: true,
      recentDocuments: true,
      interactionStats: true,
      schoolStatusOverview: true,
      coachResponsiveness: true,
      upcomingDeadlines: true,
    },
  };
};

const saveChanges = async () => {
  successMessage.value = null;
  errorMessage.value = null;

  try {
    await setDashboardLayout(localLayout.value);
    successMessage.value = "Dashboard customization saved successfully!";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Failed to save dashboard customization";
    errorMessage.value = errorMsg;
  }
};
</script>
