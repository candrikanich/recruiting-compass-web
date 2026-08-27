<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Skip Link -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:rounded-br-lg focus:bg-blue-600 focus:p-4 focus:font-medium focus:text-white"
    >
      Skip to main content
    </a>

    <!-- Page Header -->
    <PageHeader
      title="Coaches"
      description="Track and manage your coach contacts"
    >
      <template #actions>
        <NuxtLink
          to="/coaches/new"
          class="flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:from-blue-600 hover:to-blue-700"
        >
          <UIcon name="i-heroicons-plus" class="h-4 w-4" />
          Add Coach
        </NuxtLink>
        <button
          v-if="filteredCoaches.length > 0"
          @click="handleExportCSV"
          :disabled="exportLoading"
          :aria-busy="exportLoading"
          aria-label="Export coaches to CSV"
          class="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <UIcon
            name="i-heroicons-arrow-down-tray"
            class="h-4 w-4"
            aria-hidden="true"
          />
          {{ exportLoading ? "Exporting..." : "CSV" }}
        </button>
        <button
          v-if="filteredCoaches.length > 0"
          @click="handleExportPDF"
          :disabled="exportLoading"
          :aria-busy="exportLoading"
          aria-label="Export coaches to PDF"
          class="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <UIcon
            name="i-heroicons-arrow-down-tray"
            class="h-4 w-4"
            aria-hidden="true"
          />
          {{ exportLoading ? "Exporting..." : "PDF" }}
        </button>
        <div
          v-if="exportMessage"
          role="status"
          aria-live="polite"
          class="mt-2 text-sm text-green-700"
        >
          {{ exportMessage }}
        </div>
      </template>
    </PageHeader>

    <main
      id="main-content"
      class="mx-auto max-w-7xl px-4 py-8 sm:px-6"
      :aria-busy="loading"
    >
      <!-- Summary Tiles -->
      <StatsTiles
        v-if="allCoaches.length > 0"
        :stats="coachStats"
        aria-label="Coaches Statistics"
      />

      <!-- Filter Bar -->
      <div
        v-if="allCoaches.length > 0"
        class="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
      >
        <CoachFilters
          :filter-values="filterValues"
          :sort-by="sortBy"
          @update:filter="handleFilterUpdate"
          @update:sort="sortBy = $event"
        />

        <ActiveCoachFilterChips
          :filter-values="filterValues"
          :has-active-filters="hasActiveFilters"
          :active-filter-count="activeFilterCount"
          :filtered-count="filteredCoaches.length"
          @remove:filter="handleFilterUpdate($event, null)"
          @clear:all="clearFilters"
        />
      </div>

      <!-- Loading State -->
      <div
        v-if="loading && allCoaches.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"
          aria-hidden="true"
        ></div>
        <p class="text-slate-600">Loading coaches...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="mb-6 border-l-4 border-red-600 bg-red-50 p-4"
        role="alert"
        aria-live="assertive"
      >
        <div class="flex items-start gap-3">
          <svg
            class="mt-0.5 h-5 w-5 shrink-0 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 class="mb-1 font-semibold text-red-800">
              Error loading coaches
            </h3>
            <p class="text-red-700">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Empty State: No schools followed yet -->
      <div
        v-else-if="schools.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
        role="status"
      >
        <svg
          class="mx-auto mb-4 h-12 w-12 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
          />
        </svg>
        <h2 class="mb-2 font-semibold text-slate-900">Add schools first</h2>
        <p class="mb-6 text-slate-600">
          Coaches are added through school pages. Follow a school to start
          tracking coaches there.
        </p>
        <NuxtLink
          to="/schools/new"
          class="inline-block rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700"
        >
          Add a School
        </NuxtLink>
      </div>

      <!-- Empty State: Has schools but no coaches -->
      <div
        v-else-if="allCoaches.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
        role="status"
      >
        <UIcon
          name="i-heroicons-user-group"
          class="mx-auto mb-4 h-12 w-12 text-slate-400"
          aria-hidden="true"
        />
        <h2 class="mb-2 font-semibold text-slate-900">No coaches yet</h2>
        <p class="mb-6 text-slate-600">
          Visit a school's page to add coaches from their staff.
        </p>
        <NuxtLink
          to="/schools"
          class="inline-block rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700"
        >
          Go to Schools
        </NuxtLink>
      </div>

      <!-- No Results State -->
      <div
        v-else-if="filteredCoaches.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
        role="status"
      >
        <UIcon
          name="i-heroicons-magnifying-glass"
          class="mx-auto mb-4 h-12 w-12 text-slate-400"
          aria-hidden="true"
        />
        <h2 class="mb-2 font-semibold text-slate-900">
          No coaches match your filters
        </h2>
        <p class="text-slate-700">Try adjusting your search or filters</p>
      </div>

      <!-- Result Count Announcement -->
      <div
        v-if="filteredCoaches.length > 0"
        class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p class="text-sm text-blue-900">
          {{ filteredCoaches.length }} coach{{
            filteredCoaches.length !== 1 ? "es" : ""
          }}
          found
        </p>
      </div>

      <!-- Coaches Grid -->
      <ul
        v-if="paginatedCoaches.length > 0"
        class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <li
          v-for="coach in paginatedCoaches"
          :key="coach.id"
          v-memo="[coach.updated_at]"
        >
          <CoachCard
            :coach="coach"
            variant="full"
            :show-school-meta="true"
            :school="getSchoolById(coach.school_id, schools)"
            contact-mode="modal"
            back-to="/coaches"
            back-label="All Coaches"
            @open-communication="(id) => openCommunicationById(id)"
          />
        </li>
      </ul>

      <!-- Pagination Controls -->
      <div
        v-if="filteredCoaches.length > ITEMS_PER_PAGE"
        class="mt-8 flex items-center justify-center gap-4"
      >
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="!hasPrevPage"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span class="text-sm text-slate-600">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="!hasNextPage"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </main>

    <!-- Communication Panel Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showPanel && selectedCoach"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click="showPanel = false"
          role="presentation"
        >
          <div
            class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
            @click.stop
            role="dialog"
            aria-modal="true"
            aria-labelledby="communication-panel-title"
            @keydown.escape="showPanel = false"
          >
            <div
              class="sticky top-0 flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-white p-4"
            >
              <h2
                id="communication-panel-title"
                class="text-xl font-semibold text-slate-900"
              >
                Quick Communication
              </h2>
              <button
                @click="showPanel = false"
                aria-label="Close Quick Communication dialog"
                class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <UIcon
                  name="i-heroicons-x-mark"
                  class="h-5 w-5"
                  aria-hidden="true"
                />
              </button>
            </div>
            <div class="p-6">
              <CommunicationPanel
                :coach="selectedCoach"
                :school="selectedCoachSchool"
                :initial-type="communicationType"
                @close="showPanel = false"
                @interaction-logged="handleCoachInteractionLogged"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useCommunication } from "~/composables/useCommunication";
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";
import { useCoachPageFilters } from "~/composables/useCoachPageFilters";
import { useCoachExport } from "~/composables/useCoachExport";
import { useCoachListStats } from "~/composables/useCoachListStats";
import StatsTiles from "~/components/shared/StatsTiles.vue";
import CoachFilters from "~/components/Coach/CoachFilters.vue";
import ActiveCoachFilterChips from "~/components/Coach/ActiveCoachFilterChips.vue";
import CoachCard from "~/components/Coach/CoachCard.vue";
import { getSchoolById } from "~/utils/coachHelpers";

definePageMeta({
  middleware: "auth",
});

const activeFamily = useFamilyCtx();
const { activeFamilyId } = activeFamily;
const {
  showPanel,
  selectedCoach,
  communicationType,
  openCommunication,
  handleInteractionLogged,
} = useCommunication();
const { coaches: allCoaches, loading, fetchCoachesBySchools } = useCoaches();
const { schools, fetchSchools } = useSchools();
const error = ref<string | null>(null);

// Summary statistics
const { stats: coachStats } = useCoachListStats(allCoaches);
const sortBy = ref("name");

// Pagination
const ITEMS_PER_PAGE = 12;
const currentPage = ref(1);

const paginatedCoaches = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  return filteredCoaches.value.slice(start, end);
});

const totalPages = computed(() =>
  Math.ceil(filteredCoaches.value.length / ITEMS_PER_PAGE),
);

const hasNextPage = computed(() => currentPage.value < totalPages.value);
const hasPrevPage = computed(() => currentPage.value > 1);

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

// Use filter composable for stateful filter management
const {
  filterValues,
  filteredCoaches,
  hasActiveFilters,
  activeFilterCount,
  handleFilterUpdate,
  clearFilters,
} = useCoachPageFilters(allCoaches, schools, sortBy);

// Use export composable for CSV/PDF exports
const { handleExportCSV, handleExportPDF } = useCoachExport({
  filteredCoaches,
  schools,
});

// Export state
const exportLoading = ref(false);
const exportMessage = ref("");

const selectedCoachSchool = computed(() => {
  return selectedCoach.value
    ? getSchoolById(selectedCoach.value.school_id, schools.value)
    : undefined;
});

const openCommunicationById = (coachId: string) => {
  const coach = allCoaches.value.find((c) => c.id === coachId);
  if (coach) openCommunication(coach, "email");
};

const handleCoachInteractionLogged = async (interactionData: any) => {
  try {
    await handleInteractionLogged(interactionData);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to log interaction";
  }
};

const refreshData = async () => {
  await fetchSchools();
  if (schools.value.length > 0) {
    await fetchCoachesBySchools(schools.value.map((s) => s.id));
  }
};

onMounted(refreshData);

// Re-fetch coaches when active athlete changes (for parents switching between children)
watch(
  () => activeFamilyId.value,
  async (newFamilyId) => {
    if (newFamilyId) {
      await refreshData();
    }
  },
);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
