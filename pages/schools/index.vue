<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Timeline Status Snippet -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      <StatusSnippet context="schools" />
    </div>

    <!-- Athlete Selector (for parents) -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-4" v-if="isParent">
      <AthleteSelector />
    </div>

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">Schools</h1>
            <p class="text-slate-600">
              {{ filteredSchools.length }} school{{
                filteredSchools.length !== 1 ? "s" : ""
              }}
              found
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button
              v-if="filteredSchools.length > 0"
              @click="handleExportCSV"
              class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700"
            >
              <ArrowDownTrayIcon class="w-4 h-4" />
              CSV
            </button>
            <button
              v-if="filteredSchools.length > 0"
              @click="handleExportPDF"
              class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700"
            >
              <ArrowDownTrayIcon class="w-4 h-4" />
              PDF
            </button>
            <NuxtLink
              to="/schools/new"
              class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2"
            >
              <PlusIcon class="w-4 h-4" />
              Add School
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Filter Panel -->
      <SchoolsFilterPanel
        :filter-values="typedFilterValues"
        :has-active-filters="hasActiveFilters"
        :active-filters-display="activeFiltersDisplay"
        :state-options="stateOptions"
        :user-home-location="userHomeLocation"
        :sort-by="sortBy"
        :priority-tier-filter="priorityTierFilter"
        @update:filter="handleFilterUpdate"
        @remove-filter="handleRemoveFilter"
        @clear-filters="clearFilters"
        @update:sort="sortBy = $event"
        @update:priority-tier="priorityTierFilter = $event"
      />

      <!-- Results Intro -->
      <div v-if="!loading" class="mb-6">
        <p class="text-sm text-slate-600">
          <span class="font-semibold text-slate-900">{{
            filteredSchools.length
          }}</span>
          result{{ filteredSchools.length !== 1 ? "s" : "" }} found
        </p>
      </div>

      <!-- Loading State -->
      <div
        v-if="loading"
        class="text-center py-12"
        role="status"
        aria-live="polite"
      >
        <div
          class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          aria-hidden="true"
        ></div>
        <p class="text-slate-600">Loading schools...</p>
      </div>

      <!-- Error State -->
      <div
        v-if="error"
        role="alert"
        class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700"
      >
        {{ error }}
      </div>

      <!-- 30+ Schools Warning -->
      <div
        v-if="shouldShowSchoolWarning"
        class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            <svg
              class="h-5 w-5 text-amber-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-amber-900">
              You have {{ schools.length }} schools on your list
            </h3>
            <p class="text-sm text-amber-800 mt-1">
              Consider organizing your schools with priority tiers (A, B, C) to
              better manage your recruiting strategy.
            </p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="!loading && filteredSchools.length === 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <MagnifyingGlassIcon class="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 class="text-lg font-semibold text-slate-900 mb-2">
          No schools found
        </h3>
        <p class="text-slate-600 mb-6">
          Try adjusting your filters or search terms
        </p>
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition"
        >
          Clear Filters
        </button>
        <NuxtLink
          v-else
          to="/schools/new"
          class="inline-block px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition"
        >
          Add Your First School
        </NuxtLink>
      </div>

      <!-- Schools Grid -->
      <div
        v-if="!loading && filteredSchools.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <SchoolListCard
          v-for="school in filteredSchools"
          :key="school.id"
          :school="school"
          @toggle-favorite="toggleFavorite"
          @delete="handleDeleteSchool"
        />
      </div>
    </main>

    <!-- Live Region for Screen Reader Announcements -->
    <div v-bind="liveRegionAttrs">{{ announcement }}</div>

    <!-- Confirm Delete Dialog -->
    <DesignSystemConfirmDialog
      :is-open="isDeleteDialogOpen"
      title="Delete School"
      message="Are you sure you want to delete this school? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDeleteSchool"
      @cancel="cancelDeleteSchool"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from "vue";
import { useSchools } from "~/composables/useSchools";
import { useSchoolLogos } from "~/composables/useSchoolLogos";
import { useSchoolMatching } from "~/composables/useSchoolMatching";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useOffers } from "~/composables/useOffers";
import { useInteractions } from "~/composables/useInteractions";
import { useCoaches } from "~/composables/useCoaches";
import { useFamilyContext } from "~/composables/useFamilyContext";
import { useUserStore } from "~/stores/user";
import { useUniversalFilter } from "~/composables/useUniversalFilter";
import { useSchoolExport } from "~/composables/useSchoolExport";
import { useSchoolDistance } from "~/composables/useSchoolDistance";
import { useLiveRegion } from "~/composables/useLiveRegion";
import type { School } from "~/types";
import type { FilterValue } from "~/types/filters";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowDownTrayIcon,
} from "@heroicons/vue/24/outline";
import StatusSnippet from "~/components/Timeline/StatusSnippet.vue";
import { createSchoolFilterConfigs } from "~/utils/schoolFilterConfigs";
import { extractStateFromLocation } from "~/utils/locationParser";

interface SchoolFilterValues {
  name?: string;
  division?: string;
  status?: string;
  state?: string;
  is_favorite?: boolean;
  fit_score?: { min: number; max: number };
  distance?: { max: number };
  show_matches?: boolean;
}

definePageMeta({});

const activeFamily =
  inject<ReturnType<typeof useActiveFamily>>("activeFamily") ||
  useFamilyContext();
const { activeFamilyId } = activeFamily;

const { schools, loading, error, fetchSchools, toggleFavorite, smartDelete } =
  useSchools();
const { fetchMultipleLogos } = useSchoolLogos();
const { calculateMatchScore } = useSchoolMatching();
const { getSchoolPreferences, getHomeLocation } = usePreferenceManager();
const { offers, fetchOffers } = useOffers();
const { interactions: interactionsData, fetchInteractions } = useInteractions();
const { coaches: coachesData, fetchAllCoaches } = useCoaches();

const userStore = useUserStore();

const allInteractions = ref<any[]>([]);
const allCoaches = ref<any[]>([]);
const priorityTierFilter = ref<("A" | "B" | "C")[] | null>(null);
const sortBy = ref<string>("a-z");

const isParent = computed(() => userStore.user?.role === "parent");

const { announcement, announce, liveRegionAttrs } = useLiveRegion();
const isDeleteDialogOpen = ref(false);
const schoolToDeleteId = ref<string | null>(null);

watch(
  () => userStore.user?.id,
  async (newUserId) => {
    if (newUserId && schools.value.length === 0) {
      await fetchSchools();
    }
  },
);

watch(
  () => activeFamilyId.value,
  async (newFamilyId) => {
    if (newFamilyId) {
      await fetchSchools();
    }
  },
  { immediate: true },
);

const userHomeLocation = computed(() => getHomeLocation());

const hasPreferences = computed(() => {
  const prefs = getSchoolPreferences();
  return (prefs?.preferences?.length || 0) > 0;
});

const shouldShowSchoolWarning = computed(() => schools.value.length >= 30);

const stateOptions = computed(() => {
  const states = new Set<string>();
  schools.value.forEach((school) => {
    let state: string | undefined =
      school.academic_info?.state || (school.state as string | undefined);
    if (!state && school.location) {
      state = extractStateFromLocation(school.location) || undefined;
    }
    if (state && typeof state === "string") {
      states.add(state);
    }
  });
  return Array.from(states)
    .sort()
    .map((state) => ({ value: state, label: state }));
});

const { distanceCache } = useSchoolDistance(
  computed(() => schools.value),
  computed(() => userHomeLocation.value),
);

const filterConfigs = createSchoolFilterConfigs(
  stateOptions,
  getHomeLocation,
  distanceCache,
);

const {
  filterValues,
  filteredItems,
  hasActiveFilters,
  setFilterValue,
  clearFilters,
} = useUniversalFilter(
  computed(() => schools.value as unknown as Record<string, unknown>[]),
  filterConfigs,
  { storageKey: "schools-filters", persistState: false },
);

const typedFilterValues = computed(
  () => filterValues.value as SchoolFilterValues,
);

const activeFiltersDisplay = computed(() => {
  const display: Record<string, string> = {};
  Object.entries(filterValues.value).forEach(
    ([key, value]: [string, FilterValue]) => {
      if (value) {
        if (key === "is_favorite") {
          display[key] = "Favorites";
        } else if (key === "name") {
          display[key] = `"${value}"`;
        } else if (key === "fit_score") {
          if (typeof value === "object" && value !== null && "min" in value) {
            const rangeValue = value as { min?: number; max?: number };
            const min = rangeValue.min ?? 0;
            const max = rangeValue.max ?? 100;
            if (min === 0 && max === 100) return;
            display[key] = `${min} - ${max}`;
          }
        } else if (key === "distance") {
          if (typeof value === "object" && value !== null && "max" in value) {
            const rangeValue = value as { max?: number };
            const max = rangeValue.max ?? 3000;
            if (max === 3000) return;
            display[key] = `Within ${max} miles`;
          }
        } else {
          display[key] = String(value);
        }
      }
    },
  );
  if (priorityTierFilter.value && priorityTierFilter.value.length > 0) {
    display["priority_tier"] = priorityTierFilter.value.join(", ");
  }
  return display;
});

const filteredSchools = computed(() => {
  let filtered = filteredItems.value as unknown as School[];

  if (priorityTierFilter.value && priorityTierFilter.value.length > 0) {
    filtered = filtered.filter((s: School) =>
      priorityTierFilter.value?.includes(s.priority_tier as "A" | "B" | "C"),
    );
  }

  const showMatches = typedFilterValues.value.show_matches;
  if (showMatches && hasPreferences.value) {
    filtered = filtered.filter((s: School) => {
      const match = calculateMatchScore(s);
      return match.score >= 60 && !match.hasDealbreakers;
    });
  }

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case "fit-score":
        return (b.fit_score ?? -1) - (a.fit_score ?? -1);
      case "distance": {
        if (
          !userHomeLocation.value?.latitude ||
          !userHomeLocation.value?.longitude
        ) {
          return a.name.localeCompare(b.name);
        }
        const distA = distanceCache.value.get(a.id) ?? Infinity;
        const distB = distanceCache.value.get(b.id) ?? Infinity;
        return distA - distB;
      }
      case "last-contact":
        return (
          new Date(b.updated_at || 0).getTime() -
          new Date(a.updated_at || 0).getTime()
        );
      case "a-z":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return sorted;
});

const handleFilterUpdate = (field: string, value: any) => {
  setFilterValue(field, value);
};

const handleRemoveFilter = (field: string) => {
  if (field === "priority_tier") {
    priorityTierFilter.value = null;
  } else {
    setFilterValue(field, null);
  }
};

const handleDeleteSchool = (schoolId: string) => {
  schoolToDeleteId.value = schoolId;
  isDeleteDialogOpen.value = true;
};

const confirmDeleteSchool = async () => {
  if (!schoolToDeleteId.value) return;
  const deletingId = schoolToDeleteId.value;
  isDeleteDialogOpen.value = false;
  schoolToDeleteId.value = null;
  try {
    const result = await smartDelete(deletingId);
    const message = result.cascadeUsed
      ? "School and related records deleted"
      : "School deleted";
    announce(message);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete school";
    announce(message);
    console.error("Delete failed:", err);
  }
};

const cancelDeleteSchool = () => {
  isDeleteDialogOpen.value = false;
  schoolToDeleteId.value = null;
};

const { handleExportCSV, handleExportPDF } = useSchoolExport({
  filteredSchools,
  offers,
  allInteractions,
  allCoaches,
  userHomeLocation,
});

onMounted(async () => {
  await Promise.all([fetchOffers(), fetchAllCoaches(), fetchInteractions({})]);
  allInteractions.value = interactionsData.value;
  allCoaches.value = coachesData.value;

  if (schools.value.length > 0) {
    fetchMultipleLogos(schools.value).catch((err) => {
      console.warn("Failed to fetch logos:", err);
    });
  }
});
</script>
