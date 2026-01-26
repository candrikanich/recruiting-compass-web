<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
    <!-- Page Header -->
    <div class="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div class="flex items-center gap-3">
          <SparklesIcon class="w-8 h-8 text-slate-700" />
          <h1 class="text-3xl font-bold text-slate-900">Activity History</h1>
        </div>
        <p class="text-slate-600 mt-2">Track all your recruiting interactions and updates in one place</p>
      </div>
    </div>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Filters -->
      <div class="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Type Filter -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Activity Type</label>
            <select
              v-model="selectedType"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
            >
              <option value="">All Types</option>
              <option value="interaction">Interactions</option>
              <option value="school_status_change">School Status Changes</option>
              <option value="document_upload">Documents</option>
            </select>
          </div>

          <!-- Date Range Filter -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
            <select
              v-model="selectedDateRange"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
            >
              <option value="all">All Time</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
            </select>
          </div>

          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Search</label>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search activities..."
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border border-brand-blue-300 border-t-brand-blue-600" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p class="font-medium">{{ error }}</p>
        <button
          @click="fetchAll"
          class="mt-2 text-red-600 hover:text-red-700 font-medium text-sm"
        >
          Try Again
        </button>
      </div>

      <!-- Activity List -->
      <div v-else-if="filteredActivities.length > 0" class="space-y-3">
        <ActivityEventItem
          v-for="activity in paginatedActivities"
          :key="activity.id"
          :event="activity"
        />

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between pt-4">
          <button
            @click="previousPage"
            :disabled="currentPage === 1"
            class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div class="text-slate-600 text-sm">
            Page {{ currentPage }} of {{ totalPages }}
          </div>

          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <SparklesIcon class="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p class="text-slate-600 font-medium">No activities found</p>
        <p class="text-slate-400 text-sm mt-1">Try adjusting your filters or search query</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { SparklesIcon } from '@heroicons/vue/24/outline';
import { useActivityFeed, type ActivityEvent } from '~/composables/useActivityFeed';
import ActivityEventItem from '~/components/Dashboard/ActivityEventItem.vue';

definePageMeta({
  middleware: ['auth', 'onboarding'],
});

const { activities, loading, error, fetchActivities } = useActivityFeed();

const selectedType = ref('');
const selectedDateRange = ref('all');
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(20);

// Fetch all activities (not just limited)
const fetchAll = async (): Promise<void> => {
  // Fetch with high limit to get most activities
  await fetchActivities({ limit: 500, offset: 0 });
};

// Filter activities based on selected filters
const filteredActivities = computed(() => {
  let result = activities.value;

  // Filter by type
  if (selectedType.value) {
    result = result.filter((a) => a.type === selectedType.value);
  }

  // Filter by date range
  if (selectedDateRange.value !== 'all') {
    const now = new Date();
    let daysAgo = 0;

    switch (selectedDateRange.value) {
      case 'week':
        daysAgo = 7;
        break;
      case 'month':
        daysAgo = 30;
        break;
      case 'quarter':
        daysAgo = 90;
        break;
    }

    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    result = result.filter((a) => new Date(a.timestamp) >= cutoffDate);
  }

  // Search by title or description
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
    );
  }

  return result;
});

const totalPages = computed(() => {
  return Math.ceil(filteredActivities.value.length / pageSize.value);
});

const paginatedActivities = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredActivities.value.slice(start, end);
});

const nextPage = (): void => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const previousPage = (): void => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

// Reset pagination when filters change
const resetPagination = (): void => {
  currentPage.value = 1;
};

onMounted(async () => {
  await fetchAll();
});

// Watch for filter changes and reset pagination
import { watch } from 'vue';
watch([selectedType, selectedDateRange, searchQuery], () => {
  resetPagination();
});
</script>
