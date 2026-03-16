<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Skip Link -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:font-medium focus:rounded-br-lg"
    >
      Skip to main content
    </a>

    <!-- Page Header -->
    <PageHeader title="Coaches" description="Track and manage your coach contacts">
      <template #actions>
        <NuxtLink
          to="/coaches/new"
          class="px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2 shadow-xs"
        >
          <PlusIcon class="w-4 h-4" />
          Add Coach
        </NuxtLink>
        <button
          v-if="filteredCoaches.length > 0"
          @click="handleExportCSV"
          :disabled="exportLoading"
          :aria-busy="exportLoading"
          aria-label="Export coaches to CSV"
          class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 disabled:opacity-50 focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
        >
          <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
          {{ exportLoading ? "Exporting..." : "CSV" }}
        </button>
        <button
          v-if="filteredCoaches.length > 0"
          @click="handleExportPDF"
          :disabled="exportLoading"
          :aria-busy="exportLoading"
          aria-label="Export coaches to PDF"
          class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 disabled:opacity-50 focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
        >
          <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
          {{ exportLoading ? "Exporting..." : "PDF" }}
        </button>
        <div
          v-if="exportMessage"
          role="status"
          aria-live="polite"
          class="text-sm mt-2 text-green-700"
        >
          {{ exportMessage }}
        </div>
      </template>
    </PageHeader>

    <main
      id="main-content"
      class="max-w-7xl mx-auto px-4 sm:px-6 py-8"
      :aria-busy="loading"
    >
      <!-- Summary Tiles -->
      <StatsTiles :stats="coachStats" aria-label="Coaches Statistics" />

      <!-- Filter Bar -->
      <div
        class="bg-white rounded-xl border border-slate-200 shadow-xs p-4 mb-6"
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
        class="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
          aria-hidden="true"
        ></div>
        <p class="text-slate-600">Loading coaches...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-50 border-l-4 border-red-600 p-4 mb-6"
        role="alert"
        aria-live="assertive"
      >
        <div class="flex items-start gap-3">
          <svg
            class="w-5 h-5 text-red-600 shrink-0 mt-0.5"
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
            <h3 class="font-semibold text-red-800 mb-1">
              Error loading coaches
            </h3>
            <p class="text-red-700">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="allCoaches.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center"
        role="status"
      >
        <UserGroupIcon
          class="w-12 h-12 text-slate-400 mx-auto mb-4"
          aria-hidden="true"
        />
        <h2 class="text-slate-900 font-semibold mb-2">No coaches found</h2>
        <p class="text-slate-700">Add coaches through school detail pages</p>
      </div>

      <!-- No Results State -->
      <div
        v-else-if="filteredCoaches.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center"
        role="status"
      >
        <MagnifyingGlassIcon
          class="w-12 h-12 text-slate-400 mx-auto mb-4"
          aria-hidden="true"
        />
        <h2 class="text-slate-900 font-semibold mb-2">
          No coaches match your filters
        </h2>
        <p class="text-slate-700">Try adjusting your search or filters</p>
      </div>

      <!-- Result Count Announcement -->
      <div
        v-if="filteredCoaches.length > 0"
        class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
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
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <CoachListCard
          v-for="coach in paginatedCoaches"
          :key="coach.id"
          v-memo="[coach.updated_at]"
          :coach="coach"
          :school="getSchoolById(coach.school_id, schools)"
          @open-communication="(id) => openCommunicationById(id)"
          @delete-coach="openDeleteModal"
        />
      </ul>

      <!-- Pagination Controls -->
      <div
        v-if="filteredCoaches.length > ITEMS_PER_PAGE"
        class="flex items-center justify-center gap-4 mt-8"
      >
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="!hasPrevPage"
          class="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span class="text-sm text-slate-600">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="!hasNextPage"
          class="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
          class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          @click="showPanel = false"
          aria-hidden="true"
          role="presentation"
        >
          <div
            class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            @click.stop
            role="dialog"
            aria-modal="true"
            aria-labelledby="communication-panel-title"
            @keydown.escape="showPanel = false"
          >
            <div
              class="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between rounded-t-xl"
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
                class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <XMarkIcon class="w-5 h-5" aria-hidden="true" />
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

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmationModal
      :is-open="deleteModalOpen"
      :item-name="
        selectedDeleteCoach
          ? `${selectedDeleteCoach.first_name} ${selectedDeleteCoach.last_name}`
          : ''
      "
      item-type="coach"
      :is-loading="isDeleting"
      @cancel="closeDeleteModal"
      @confirm="deleteCoach"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  defineAsyncComponent,
} from "vue";
import { createClientLogger } from "~/utils/logger";
import { useCommunication } from "~/composables/useCommunication";
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";
import { useCoachPageFilters } from "~/composables/useCoachPageFilters";
import { useCoachExport } from "~/composables/useCoachExport";
import { useCoachListStats } from "~/composables/useCoachListStats";
import StatsTiles from "~/components/shared/StatsTiles.vue";
const DeleteConfirmationModal = defineAsyncComponent(
  () => import("~/components/DeleteConfirmationModal.vue"),
);
import CoachFilters from "~/components/Coach/CoachFilters.vue";
import ActiveCoachFilterChips from "~/components/Coach/ActiveCoachFilterChips.vue";
import CoachListCard from "~/components/Coach/CoachListCard.vue";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  PlusIcon,
} from "@heroicons/vue/24/outline";
import { getSchoolById } from "~/utils/coachHelpers";
import type { Coach } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const logger = createClientLogger("coaches/index");
const activeFamily = useFamilyCtx();
const { activeFamilyId } = activeFamily;
const {
  showPanel,
  selectedCoach,
  communicationType,
  openCommunication,
  handleInteractionLogged,
} = useCommunication();
const {
  coaches: allCoaches,
  loading,
  fetchCoachesBySchools,
  smartDelete,
} = useCoaches();
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

// Delete modal state
const deleteModalOpen = ref(false);
const selectedDeleteCoach = ref<Coach | null>(null);
const isDeleting = ref(false);

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


const openDeleteModal = (coach: Coach) => {
  selectedDeleteCoach.value = coach;
  deleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  deleteModalOpen.value = false;
  selectedDeleteCoach.value = null;
};

const deleteCoach = async () => {
  if (!selectedDeleteCoach.value?.id) return;

  isDeleting.value = true;
  try {
    await smartDelete(selectedDeleteCoach.value.id);
    closeDeleteModal();
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete coach";
    error.value = message;
    logger.error("Failed to delete coach", err);
  } finally {
    isDeleting.value = false;
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
