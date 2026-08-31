<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div
      class="border-b border-slate-200 bg-linear-to-r from-slate-50 to-blue-50"
    >
      <div class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-sparkles" class="h-8 w-8 text-slate-700" />
          <h1 class="text-3xl font-bold text-slate-900">Activity History</h1>
        </div>
        <p class="mt-2 text-slate-600">
          Track all your recruiting interactions and updates in one place
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <main class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <!-- Filters -->
      <div class="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <!-- Type Filter -->
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700"
              >Activity Type</label
            >
            <select
              v-model="selectedType"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-brand-blue-500"
            >
              <option value="">All Types</option>
              <option value="interaction">Interactions</option>
              <option value="school_status_change">
                School Status Changes
              </option>
              <option value="document_upload">Documents</option>
            </select>
          </div>

          <!-- Date Range Filter -->
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700"
              >Date Range</label
            >
            <select
              v-model="selectedDateRange"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-brand-blue-500"
            >
              <option value="all">All Time</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
            </select>
          </div>

          <!-- Search -->
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700"
              >Search</label
            >
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search activities..."
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div
          class="h-8 w-8 animate-spin rounded-full border border-brand-blue-300 border-t-brand-blue-600"
        />
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
      >
        <p class="font-medium">{{ error }}</p>
        <button
          @click="fetchAll"
          class="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
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
        <div
          v-if="totalPages > 1"
          class="flex items-center justify-between pt-4"
        >
          <button
            @click="previousPage"
            :disabled="currentPage === 1"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          <div class="text-sm text-slate-600">
            Page {{ currentPage }} of {{ totalPages }}
          </div>

          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <DesignSystemEmptyState
        v-else-if="activities.length > 0"
        title="No activities match your filters"
        description="Try adjusting your filters or search query"
      >
        <template #icon>
          <UIcon name="i-heroicons-sparkles" class="h-8 w-8 text-brand-slate-400" />
        </template>
      </DesignSystemEmptyState>

      <!-- No activity at all -->
      <DesignSystemEmptyState
        v-else
        title="No activity yet"
        description="See all your recruiting activity in one timeline"
      >
        <template #icon>
          <UIcon name="i-heroicons-sparkles" class="h-8 w-8 text-brand-slate-400" />
        </template>
        <template #action>
          <p class="text-sm text-brand-slate-500">
            Your activity feed starts when you begin tracking
          </p>
        </template>
      </DesignSystemEmptyState>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  useActivityFeed,
  type ActivityEvent,
} from "~/composables/useActivityFeed";
import ActivityEventItem from "~/components/Dashboard/ActivityEventItem.vue";

definePageMeta({
  middleware: "auth",
});

const { activities, loading, error, fetchActivities } = useActivityFeed();

const selectedType = ref("");
const selectedDateRange = ref("all");
const searchQuery = ref("");
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
  if (selectedDateRange.value !== "all") {
    const now = new Date();
    let daysAgo = 0;

    switch (selectedDateRange.value) {
      case "week":
        daysAgo = 7;
        break;
      case "month":
        daysAgo = 30;
        break;
      case "quarter":
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
        a.description.toLowerCase().includes(query),
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
import { watch } from "vue";
watch([selectedType, selectedDateRange, searchQuery], () => {
  resetPagination();
});
</script>
