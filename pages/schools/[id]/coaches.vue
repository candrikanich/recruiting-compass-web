<template>
  <div class="min-h-screen bg-slate-50">
    <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink
          :to="`/schools/${id}`"
          class="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          ← Back to School
        </NuxtLink>
      </div>

      <!-- Header with gradient -->
      <div
        class="mb-8 rounded-2xl bg-linear-to-r from-slate-900 to-slate-800 px-8 py-8 text-white shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <SchoolLogo
              v-if="school"
              :school="school"
              size="lg"
              :transition-name="`school-logo-${id}`"
            />
            <div>
              <h1 class="text-3xl font-bold">Coaches</h1>
              <p class="mt-2 text-slate-300">{{ schoolName }}</p>
            </div>
          </div>
          <button
            @click="showAddForm = !showAddForm"
            class="rounded-xl bg-linear-to-r from-indigo-500 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-indigo-700"
          >
            {{ showAddForm ? "Cancel" : "+ Add Coach" }}
          </button>
        </div>
      </div>

      <!-- Filter Section -->
      <div
        class="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
      >
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <!-- Search Input -->
          <div>
            <label
              for="search"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Search
            </label>
            <input
              id="search"
              v-model="searchQuery"
              type="text"
              placeholder="Name, email, phone..."
              class="w-full rounded-xl border-2 border-slate-300 px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <!-- Role Filter -->
          <div>
            <label
              for="roleFilter"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Role
            </label>
            <select
              id="roleFilter"
              v-model="filters.role"
              class="w-full cursor-pointer appearance-none rounded-xl border-2 border-slate-300 bg-white px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              :style="selectDropdownStyle"
            >
              <option value="">All Roles</option>
              <option value="head">Head Coach</option>
              <option value="assistant">Assistant Coach</option>
              <option value="recruiting">Recruiting Coordinator</option>
            </select>
          </div>

          <!-- Sort -->
          <div>
            <label
              for="sortFilter"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Sort by
            </label>
            <select
              id="sortFilter"
              v-model="sortBy"
              class="w-full cursor-pointer appearance-none rounded-xl border-2 border-slate-300 bg-white px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
              :style="selectDropdownStyle"
            >
              <option value="name">Name (A-Z)</option>
              <option value="lastContact">Last Contact (Recent)</option>
            </select>
          </div>
        </div>

        <!-- Clear Filters Button -->
        <div
          v-if="searchQuery || filters.role || sortBy !== 'name'"
          class="mt-4 flex justify-end"
        >
          <button
            @click="clearFilters"
            class="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <!-- Add Coach Form -->
      <div
        v-if="showAddForm"
        class="mb-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl"
      >
        <h2 class="mb-6 text-2xl font-bold text-slate-900">Add New Coach</h2>

        <CoachForm
          :loading="loading"
          @submit="handleCoachFormSubmit"
          @cancel="showAddForm = false"
        />
      </div>

      <!-- Results Summary -->
      <div v-if="schoolCoaches.length > 0" class="mb-6">
        <p class="text-sm text-slate-600">
          Showing
          <span class="font-semibold">{{ filteredCoaches.length }}</span> of
          <span class="font-semibold">{{ schoolCoaches.length }}</span>
          {{ schoolCoaches.length === 1 ? "coach" : "coaches" }}
        </p>
      </div>

      <!-- Page State: Loading / Error / Empty -->
      <PageState
        :loading="loading && schoolCoaches.length === 0"
        :isEmpty="!loading && schoolCoaches.length === 0"
        loading-message="Loading coaches..."
        empty-title="No coaches added yet"
        empty-message="Add your first coach to get started"
      >
        <!-- No Results State (separate from empty) -->
        <div
          v-if="schoolCoaches.length > 0 && filteredCoaches.length === 0"
          class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg"
        >
          <p class="text-slate-600">No coaches match your filters</p>
        </div>

        <!-- Coaches Grid -->
        <div
          v-if="filteredCoaches.length > 0"
          class="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          <CoachCard
            v-for="coach in filteredCoaches"
            :key="coach.id"
            :coach="coach"
            variant="full"
            contact-mode="modal"
            :back-to="`/schools/${id}/coaches`"
            back-label="Coaches"
            @open-communication="(coachId) => openCommunicationForId(coachId)"
          />
        </div>
      </PageState>
    </div>

    <!-- Communication Panel Modal -->
    <Teleport to="body">
      <div
        v-if="showPanel && selectedCoach"
        class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
        @click="showPanel = false"
        @keydown.escape="showPanel = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="school-communication-panel-title"
          class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
          @click.stop
        >
          <div
            class="sticky top-0 flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-white p-4"
          >
            <h2
              id="school-communication-panel-title"
              class="text-xl font-bold text-slate-900"
            >
              Quick Communication
            </h2>
            <button
              @click="showPanel = false"
              aria-label="Close communication panel"
              class="text-slate-400 hover:text-slate-600"
            >
              <UIcon name="i-heroicons-x-mark" class="h-6 w-6" />
            </button>
          </div>
          <div class="p-6">
            <CommunicationPanel
              :coach="selectedCoach"
              :school="school"
              :initial-type="communicationType"
              @close="showPanel = false"
              @interaction-logged="handleSchoolCoachInteractionLogged"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";
import { useInteractions } from "~/composables/useInteractions";
import { useCommunication } from "~/composables/useCommunication";
import { useUserStore } from "~/stores/user";
import type { School } from "~/types";
import { createClientLogger } from "~/utils/logger";
import CoachCard from "~/components/Coach/CoachCard.vue";

const logger = createClientLogger("SchoolCoaches");
import { useCoachFilters } from "~/composables/useCoachFilters";
import type { CoachSortOption } from "~/composables/useCoachFilters";
import { useEntityNames } from "~/composables/useEntityNames";
import { usePageFilters } from "~/composables/usePageFilters";
import PageState from "~/components/shared/PageState.vue";

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const id = route.params.id as string;

// Dropdown style for selects
const selectDropdownStyle = computed(() => ({
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: "right 0.75rem center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "1.5em 1.5em",
  paddingRight: "2.5rem",
}));

const { coaches, loading, error, fetchCoaches, createCoach } = useCoaches();
const { getSchool } = useSchools();
const { fetchInteractions } = useInteractions();
const {
  showPanel,
  selectedCoach,
  communicationType,
  openCommunication,
  handleInteractionLogged,
} = useCommunication();
const userStore = useUserStore();

const showAddForm = ref(false);
const schoolName = ref("");
const schoolData = ref<School | null>(null);
const localError = ref("");

// Use shared utilities
useEntityNames();
const { searchQuery, filters, sortBy, clearFilters } =
  usePageFilters<CoachSortOption>({
    defaultSort: "name",
  });

// Create a school object from schoolName for CommunicationPanel
const school = computed((): School | undefined => {
  if (schoolData.value) return schoolData.value;
  if (!schoolName.value) return undefined;
  return {
    id: id,
    user_id: "",
    name: schoolName.value,
    location: null,
    division: null,
    conference: null,
    website: null,
    favicon_url: null,
    twitter_handle: null,
    instagram_handle: null,
    status: "researching",
    notes: null,
    pros: [],
    cons: [],
    is_favorite: false,
  };
});

const { applyFiltersAndSort } = useCoachFilters();

const schoolCoaches = computed(() =>
  coaches.value.filter((c) => c.school_id === id),
);

const filteredCoaches = computed(() =>
  applyFiltersAndSort(
    schoolCoaches.value,
    searchQuery.value,
    (filters.value.role as string) || "",
    sortBy.value as CoachSortOption,
  ),
);

const handleCoachFormSubmit = async (formData: any) => {
  try {
    await createCoach(id, {
      role: formData.role as "head" | "assistant" | "recruiting",
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email || null,
      phone: formData.phone || null,
      twitter_handle: formData.twitter_handle || null,
      instagram_handle: formData.instagram_handle || null,
      notes: formData.notes || null,
      last_contact_date: null,
    });

    showAddForm.value = false;

    // Refresh list
    await fetchCoaches(id);
  } catch (err) {
    logger.error("Failed to add coach", err);
  }
};

const openCommunicationForId = (coachId: string) => {
  const coach = coaches.value.find((c) => c.id === coachId);
  if (coach) openCommunication(coach, "email");
};

const handleSchoolCoachInteractionLogged = async (interactionData: any) => {
  try {
    const refreshData = async () => {
      await fetchCoaches(id);
    };

    await handleInteractionLogged(interactionData, refreshData);
  } catch (err) {
    localError.value =
      err instanceof Error ? err.message : "Failed to log interaction";
  }
};

// Expose reactive variables for testing
defineExpose({
  showAddForm,
  searchQuery,
  filters,
  sortBy,
  schoolCoaches,
  filteredCoaches,
  handleCoachFormSubmit,
  clearFilters,
});

onMounted(async () => {
  const school = await getSchool(id);
  if (school) {
    schoolName.value = school.name;
    schoolData.value = school;
  }
  await fetchCoaches(id);
});
</script>
