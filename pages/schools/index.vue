<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Global Navigation -->

    <!-- Timeline Status Snippet -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      <StatusSnippet context="schools" />
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
      <!-- Filter Bar -->
      <div
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Search</label
            >
            <div class="relative">
              <MagnifyingGlassIcon
                class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                :value="String((filterValues.value as any)?.name ?? '')"
                @input="
                  handleFilterUpdate(
                    'name',
                    ($event.target as HTMLInputElement).value,
                  )
                "
                placeholder="School name or location..."
                class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <!-- Division -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Division</label
            >
            <select
              :value="String((filterValues.value as any)?.division ?? '')"
              @change="
                handleFilterUpdate(
                  'division',
                  ($event.target as HTMLSelectElement).value || null,
                )
              "
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- All --</option>
              <option value="D1">Division I</option>
              <option value="D2">Division II</option>
              <option value="D3">Division III</option>
              <option value="NAIA">NAIA</option>
              <option value="JUCO">JUCO</option>
            </select>
          </div>

          <!-- Status -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Status</label
            >
            <select
              :value="String((filterValues.value as any)?.status ?? '')"
              @change="
                handleFilterUpdate(
                  'status',
                  ($event.target as HTMLSelectElement).value || null,
                )
              "
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- All --</option>
              <option value="researching">Researching</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="offer_received">Offer Received</option>
              <option value="committed">Committed</option>
            </select>
          </div>

          <!-- Favorites -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Favorites Only</label
            >
            <select
              :value="(filterValues.value as any)?.is_favorite ? 'true' : ''"
              @change="
                handleFilterUpdate(
                  'is_favorite',
                  ($event.target as HTMLSelectElement).value === 'true' || null,
                )
              "
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- All --</option>
              <option value="true">Favorites Only</option>
            </select>
          </div>

          <!-- Priority Tier Filter -->
          <SchoolPriorityTierFilter
            :model-value="priorityTierFilter"
            @update:model-value="updatePriorityTierFilter"
          />

          <!-- Sort Selector -->
          <SortSelector
            :model-value="sortBy"
            :sort-order="sortOrder"
            @update:model-value="sortBy = $event"
            @update:sort-order="sortOrder = $event"
          />
        </div>

        <!-- Active Filters -->
        <div
          v-if="hasActiveFilters"
          class="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200"
        >
          <span class="text-sm text-slate-600">Active filters:</span>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(value, key) in activeFiltersDisplay"
              :key="key"
              class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
            >
              {{ value }}
              <button
                @click="handleRemoveFilter(key as string)"
                class="hover:text-blue-900"
              >
                <XMarkIcon class="w-3 h-3" />
              </button>
            </span>
          </div>
          <button
            @click="clearFilters"
            class="text-sm text-slate-500 hover:text-slate-700 ml-2"
          >
            Clear all
          </button>
        </div>
      </div>

      <!-- Results Count -->
      <div class="text-right text-slate-600 text-sm mb-4">
        {{ filteredSchools.length }} result{{
          filteredSchools.length !== 1 ? "s" : ""
        }}
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div
          class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
        ></div>
        <p class="text-slate-600">Loading schools...</p>
      </div>

      <!-- Error State -->
      <div
        v-if="error"
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
        <div
          v-for="school in filteredSchools"
          :key="school.id"
          class="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
        >
          <!-- Card Content -->
          <div class="p-5">
            <div class="flex items-start gap-4 mb-4">
              <!-- Logo -->
              <SchoolLogo
                :school="school"
                size="lg"
                fetch-on-mount
                class="shadow-md rounded-lg"
              />

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <h3 class="text-slate-900 font-semibold line-clamp-2 mb-1">
                  {{ school.name }}
                </h3>
                <p class="text-slate-600 text-sm">{{ school.location }}</p>
              </div>

              <!-- Favorite Star -->
              <button
                @click.stop="toggleFavorite(school.id, school.is_favorite)"
                :class="[
                  'flex-shrink-0 transition-all',
                  school.is_favorite
                    ? 'text-yellow-500'
                    : 'text-slate-300 hover:text-yellow-400',
                ]"
              >
                <StarIcon
                  :class="[
                    'w-5 h-5',
                    school.is_favorite ? 'fill-yellow-500' : '',
                  ]"
                />
              </button>
            </div>

            <!-- Badges -->
            <div class="flex flex-wrap gap-2 mb-4">
              <span
                v-if="school.division"
                class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700"
              >
                {{ school.division }}
              </span>
              <span
                :class="getStatusBadgeClass(school.status)"
                class="px-2 py-0.5 text-xs font-medium rounded-full"
              >
                {{ formatStatus(school.status) }}
              </span>
              <span
                v-if="
                  getCarnegieSize(
                    typeof school.academic_info?.student_size === 'string'
                      ? parseInt(school.academic_info.student_size)
                      : typeof school.academic_info?.student_size === 'number'
                        ? school.academic_info.student_size
                        : null,
                  )
                "
                :class="
                  getSizeBadgeClass(
                    getCarnegieSize(
                      typeof school.academic_info?.student_size === 'string'
                        ? parseInt(school.academic_info.student_size)
                        : typeof school.academic_info?.student_size === 'number'
                          ? school.academic_info.student_size
                          : null,
                    ),
                  )
                "
                class="px-2 py-0.5 text-xs font-medium rounded-full"
              >
                {{
                  getCarnegieSize(
                    typeof school.academic_info?.student_size === "string"
                      ? parseInt(school.academic_info.student_size)
                      : typeof school.academic_info?.student_size === "number"
                        ? school.academic_info.student_size
                        : null,
                  )
                }}
              </span>
            </div>

            <!-- Conference/Notes -->
            <p v-if="school.conference" class="text-slate-600 text-sm mb-2">
              {{ school.conference }}
            </p>
            <p v-if="school.notes" class="text-slate-600 text-sm line-clamp-2">
              {{ school.notes }}
            </p>
          </div>

          <!-- Actions -->
          <div class="px-5 pb-5 flex gap-2">
            <NuxtLink
              :to="`/schools/${school.id}`"
              class="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-center flex items-center justify-center gap-2"
            >
              <EyeIcon class="w-4 h-4" />
              View
            </NuxtLink>
            <button
              @click.stop="deleteSchool(school.id)"
              class="px-3 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useSchools } from "~/composables/useSchools";
import { useSchoolLogos } from "~/composables/useSchoolLogos";
import { useSchoolMatching } from "~/composables/useSchoolMatching";
import { useUserPreferences } from "~/composables/useUserPreferences";
import { useOffers } from "~/composables/useOffers";
import { useInteractions } from "~/composables/useInteractions";
import { useCoaches } from "~/composables/useCoaches";
import { useUniversalFilter } from "~/composables/useUniversalFilter";
import type { School } from "~/types";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  StarIcon,
  EyeIcon,
  TrashIcon,
} from "@heroicons/vue/24/outline";
import SchoolLogo from "~/components/School/SchoolLogo.vue";
import StatusSnippet from "~/components/Timeline/StatusSnippet.vue";
import SortSelector from "~/components/Schools/SortSelector.vue";
import {
  exportSchoolComparisonToCSV,
  generateSchoolComparisonPDF,
  type SchoolComparisonData,
} from "~/utils/exportUtils";
import { getCarnegieSize } from "~/utils/schoolSize";
import { calculateDistance } from "~/utils/distance";
import type { FilterConfig } from "~/types/filters";

definePageMeta({});

const { schools, loading, error, fetchSchools, toggleFavorite, deleteSchool } =
  useSchools();
const { fetchMultipleLogos } = useSchoolLogos();
const { calculateMatchScore } = useSchoolMatching();
const { fetchPreferences, schoolPreferences, homeLocation } =
  useUserPreferences();
const { offers, fetchOffers } = useOffers();
const { interactions: interactionsData, fetchInteractions } = useInteractions();
const { coaches: coachesData, fetchAllCoaches } = useCoaches();

const allInteractions = ref<any[]>([]);
const allCoaches = ref<any[]>([]);
const priorityTierFilter = ref<("A" | "B" | "C")[] | null>(null);
const sortBy = ref<string>("a-z");
const sortOrder = ref<"asc" | "desc">("asc");

const hasPreferences = computed(() => {
  return (schoolPreferences.value?.preferences?.length || 0) > 0;
});

const shouldShowSchoolWarning = computed(() => {
  return schools.value.length >= 30;
});

// Filter configurations
const filterConfigs: FilterConfig[] = [
  {
    type: "text",
    field: "name",
    label: "Search",
    placeholder: "School name or location...",
    filterFn: (item: School, filterValue: string) => {
      if (!filterValue) return true;
      const query = String(filterValue).toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query)
      );
    },
  },
  {
    type: "select",
    field: "division",
    label: "Division",
    options: [
      { value: "D1", label: "Division 1" },
      { value: "D2", label: "Division 2" },
      { value: "D3", label: "Division 3" },
      { value: "NAIA", label: "NAIA" },
      { value: "JUCO", label: "JUCO" },
    ],
  },
  {
    type: "select",
    field: "status",
    label: "Status",
    options: [
      { value: "researching", label: "Researching" },
      { value: "contacted", label: "Contacted" },
      { value: "interested", label: "Interested" },
      { value: "offer_received", label: "Offer Received" },
      { value: "committed", label: "Committed" },
    ],
  },
  { type: "boolean", field: "is_favorite", label: "Favorites Only" },
];

const {
  filterValues,
  filteredItems,
  activeFilterCount,
  hasActiveFilters,
  setFilterValue,
  clearFilters,
  getFilterDisplayValue,
} = useUniversalFilter(schools as any, filterConfigs, {
  storageKey: "schools-filters",
});

// Computed for active filters display
const activeFiltersDisplay = computed(() => {
  const display: Record<string, string> = {};
  Object.entries(filterValues.value).forEach(([key, value]: [string, any]) => {
    if (value) {
      if (key === "is_favorite") {
        display[key] = "Favorites";
      } else if (key === "name") {
        display[key] = `"${value}"`;
      } else {
        display[key] = String(value);
      }
    }
  });
  return display;
});

// Apply additional filtering and sorting
const filteredSchools = computed(() => {
  let filtered = filteredItems.value as unknown as School[];

  // Apply priority tier filter if selected
  if (priorityTierFilter.value && priorityTierFilter.value.length > 0) {
    filtered = filtered.filter((s: School) =>
      priorityTierFilter.value?.includes(s.priority_tier as "A" | "B" | "C"),
    );
  }

  // Apply match filter if enabled
  const showMatches = filterValues.value.show_matches;
  if (showMatches && hasPreferences.value) {
    filtered = filtered.filter((s: School) => {
      const match = calculateMatchScore(s);
      return match.score >= 60 && !match.hasDealbreakers;
    });
  }

  // Apply sorting
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;

    switch (sortBy.value) {
      case "fit-score": {
        const scoreA = a.fit_score ?? -1;
        const scoreB = b.fit_score ?? -1;
        comparison = scoreA - scoreB;
        break;
      }
      case "distance": {
        if (!homeLocation.value?.latitude || !homeLocation.value?.longitude) {
          // Fall back to A-Z if home location not set
          comparison = a.name.localeCompare(b.name);
          break;
        }

        const getDistance = (school: School): number => {
          if (!school.academic_info) return Infinity;
          const lat = school.academic_info["latitude"] as number | undefined;
          const lng = school.academic_info["longitude"] as number | undefined;

          if (!lat || !lng) return Infinity;

          return calculateDistance(
            { latitude: homeLocation.value!.latitude, longitude: homeLocation.value!.longitude },
            { latitude: lat, longitude: lng },
          );
        };

        const distA = getDistance(a);
        const distB = getDistance(b);
        comparison = distA - distB;
        break;
      }
      case "last-contact": {
        const dateA = new Date(a.updated_at || 0).getTime();
        const dateB = new Date(b.updated_at || 0).getTime();
        comparison = dateB - dateA; // Reverse for most recent first
        break;
      }
      case "a-z":
      default:
        comparison = a.name.localeCompare(b.name);
        break;
    }

    // Apply sort order (desc reverses the comparison)
    return sortOrder.value === "asc" ? comparison : -comparison;
  });

  return sorted;
});

// Filter event handlers
const handleFilterUpdate = (field: string, value: any) => {
  setFilterValue(field, value);
};

const handleRemoveFilter = (field: string) => {
  setFilterValue(field, null);
};

const updatePriorityTierFilter = (tiers: ("A" | "B" | "C")[] | null) => {
  priorityTierFilter.value = tiers;
};

// Badge helpers
const getStatusBadgeClass = (status: string): string => {
  const classes: Record<string, string> = {
    researching: "bg-slate-100 text-slate-700",
    contacted: "bg-yellow-100 text-yellow-700",
    interested: "bg-emerald-100 text-emerald-700",
    offer_received: "bg-green-100 text-green-700",
    committed: "bg-purple-100 text-purple-700",
    declined: "bg-red-100 text-red-700",
  };
  return classes[status] || "bg-slate-100 text-slate-700";
};

const getSizeBadgeClass = (size: string | null | undefined): string => {
  if (!size) return "";
  const classes: Record<string, string> = {
    "Very Small": "bg-indigo-100 text-indigo-700",
    Small: "bg-blue-100 text-blue-700",
    Medium: "bg-emerald-100 text-emerald-700",
    Large: "bg-orange-100 text-orange-700",
    "Very Large": "bg-purple-100 text-purple-700",
  };
  return classes[size] || "bg-slate-100 text-slate-700";
};

const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

// Export functions
const getExportData = (): SchoolComparisonData[] => {
  return filteredSchools.value.map((school) => {
    const schoolOffers = offers.value.filter((o) => o.school_id === school.id);
    const interactionCount = allInteractions.value.filter(
      (i) => i.school_id === school.id,
    ).length;
    const coachCount = allCoaches.value.filter(
      (c) => c.school_id === school.id,
    ).length;

    let distance: number | null = null;
    if (
      homeLocation.value?.latitude &&
      homeLocation.value?.longitude &&
      school.academic_info
    ) {
      const lat = school.academic_info["latitude"] as number | undefined;
      const lng = school.academic_info["longitude"] as number | undefined;
      if (lat && lng) {
        distance = calculateDistance(
          {
            latitude: homeLocation.value.latitude,
            longitude: homeLocation.value.longitude,
          },
          { latitude: lat, longitude: lng },
        );
      }
    }

    return {
      ...school,
      favicon_url: null, // Add missing field for SchoolComparisonData
      coachCount,
      interactionCount,
      offer: schoolOffers.length > 0 ? schoolOffers[0] : null,
      distance,
    };
  });
};

const handleExportCSV = () => {
  const data = getExportData();
  if (data.length === 0) return;
  exportSchoolComparisonToCSV(data);
};

const handleExportPDF = () => {
  const data = getExportData();
  if (data.length === 0) return;
  generateSchoolComparisonPDF(data);
};

onMounted(async () => {
  await Promise.all([
    fetchSchools(),
    fetchPreferences(),
    fetchOffers(),
    fetchAllCoaches(),
    fetchInteractions({}),
  ]);
  allInteractions.value = interactionsData.value;
  allCoaches.value = coachesData.value;

  if (schools.value.length > 0) {
    fetchMultipleLogos(schools.value).catch((err) => {
      console.warn("Failed to fetch logos:", err);
    });
  }
});
</script>
