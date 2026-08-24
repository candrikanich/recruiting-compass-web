<template>
  <div
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <!-- Header -->
    <div class="mb-5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="rounded-lg bg-slate-100 p-2">
          <UIcon name="i-heroicons-sparkles" class="h-5 w-5 text-slate-700" />
        </div>
        <h3 class="font-semibold text-slate-900">Recent Activity</h3>
      </div>
      <button
        @click="refresh"
        :disabled="loading"
        data-testid="refresh-activity"
        class="rounded-full bg-brand-blue-100 px-3 py-1 text-sm font-medium text-brand-blue-700 transition hover:bg-brand-blue-200 disabled:opacity-50"
      >
        {{ loading ? "Loading..." : "Refresh" }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div
        class="h-6 w-6 animate-spin rounded-full border border-brand-blue-300 border-t-brand-blue-600"
      />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="py-6 text-center text-sm text-red-600">
      <p>{{ error }}</p>
      <button
        @click="refresh"
        class="mt-2 font-medium text-blue-600 hover:text-blue-700"
      >
        Try Again
      </button>
    </div>

    <!-- Activity List -->
    <div v-else-if="activities.length > 0" class="space-y-3">
      <ActivityEventItem
        v-for="activity in activities"
        :key="activity.id"
        :event="activity"
        data-testid="activity-event-item"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="py-6 text-center text-slate-500">
      <p class="text-sm">No recent activity</p>
      <p class="mt-1 text-xs text-slate-400">
        Start logging interactions or updating your profile
      </p>
    </div>

    <!-- View All Link -->
    <NuxtLink
      to="/activity"
      class="mt-4 block w-full rounded-lg border border-slate-300 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      View All Activity
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useActivityFeed } from "~/composables/useActivityFeed";
import ActivityEventItem from "~/components/Dashboard/ActivityEventItem.vue";

const { activities, loading, error, fetchActivities, subscribeToUpdates } =
  useActivityFeed();

const refresh = async (): Promise<void> => {
  await fetchActivities();
};

onMounted(async () => {
  await fetchActivities();
  subscribeToUpdates();
});

onUnmounted(() => {
  // Cleanup is handled within subscribeToUpdates
});
</script>
