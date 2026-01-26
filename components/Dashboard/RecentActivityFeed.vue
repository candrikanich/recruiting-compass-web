<template>
  <div
    class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-slate-100 rounded-lg">
          <SparklesIcon class="w-5 h-5 text-slate-700" />
        </div>
        <h3 class="text-slate-900 font-semibold">Recent Activity</h3>
      </div>
      <button
        @click="refresh"
        :disabled="loading"
        class="px-3 py-1 bg-brand-blue-100 text-brand-blue-700 rounded-full text-sm font-medium hover:bg-brand-blue-200 transition disabled:opacity-50"
      >
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-6 w-6 border border-brand-blue-300 border-t-brand-blue-600" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-6 text-red-600 text-sm">
      <p>{{ error }}</p>
      <button
        @click="refresh"
        class="mt-2 text-blue-600 hover:text-blue-700 font-medium"
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
    <div v-else class="text-center py-6 text-slate-500">
      <p class="text-sm">No recent activity</p>
      <p class="text-xs text-slate-400 mt-1">Start logging interactions or updating your profile</p>
    </div>

    <!-- View All Link -->
    <NuxtLink
      to="/activity"
      class="mt-4 block w-full py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 text-center text-sm font-medium"
    >
      View All Activity
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { SparklesIcon } from '@heroicons/vue/24/outline';
import { useActivityFeed } from '~/composables/useActivityFeed';
import ActivityEventItem from '~/components/Dashboard/ActivityEventItem.vue';

const { activities, loading, error, fetchActivities, subscribeToUpdates } = useActivityFeed();

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
