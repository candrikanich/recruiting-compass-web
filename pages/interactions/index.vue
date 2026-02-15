<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Skip Link -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-2 focus:outline-blue-600 focus:outline-offset-2"
    >
      Skip to main content
    </a>

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">
              {{ userStore.isAthlete ? "My Interactions" : "Interactions" }}
            </h1>
            <p class="text-slate-600">
              {{ filteredInteractions.length }} interaction{{
                filteredInteractions.length !== 1 ? "s" : ""
              }}
              found
            </p>
            <p v-if="userStore.isAthlete" class="text-sm text-slate-500 mt-1">
              Your recruiting interactions are visible to your linked parent(s)
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button
              v-if="filteredInteractions.length > 0"
              @click="handleExportCSV"
              class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
            >
              <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
              CSV
            </button>
            <button
              v-if="filteredInteractions.length > 0"
              @click="handleExportPDF"
              class="px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-700 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
            >
              <ArrowDownTrayIcon class="w-4 h-4" aria-hidden="true" />
              PDF
            </button>
            <NuxtLink
              to="/interactions/add"
              data-testid="log-interaction-button"
              class="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center gap-2 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
            >
              <PlusIcon class="w-4 h-4" aria-hidden="true" />
              Log Interaction
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <main id="main-content" class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Analytics Cards -->
      <h2 class="sr-only">Statistics</h2>
      <AnalyticsCards
        :total-count="allInteractions.length"
        :outbound-count="outboundCount"
        :inbound-count="inboundCount"
        :this-week-count="thisWeekCount"
      />

      <!-- Filter Bar -->
      <h2 class="sr-only">Filter Options</h2>
      <div
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6"
      >
        <InteractionFilters
          :filter-values="filterValues"
          :is-parent="userStore.isParent"
          :linked-athletes="linkedAthletes"
          :current-user-id="userStore.user?.id"
          @update:filter="handleFilterChange"
        />

        <!-- Active Filters -->
        <ActiveFilterChips
          :filter-values="filterValues"
          :linked-athletes="linkedAthletes"
          :current-user-id="userStore.user?.id"
          @remove:filter="({ field }) => handleFilterUpdate(field, null)"
          @clear:all="clearFilters"
        />
      </div>

      <!-- Filter Results Announcement -->
      <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
        {{ filteredInteractions.length }} interaction{{
          filteredInteractions.length !== 1 ? "s" : ""
        }}
        found{{ hasActiveFilters ? " with active filters" : "" }}
      </div>

      <!-- Page State (Loading/Error/Empty) -->
      <template
        v-if="filteredInteractions.length === 0 && allInteractions.length > 0"
      >
        <!-- No Results State (filtered but no matches) -->
        <div
          role="status"
          class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
        >
          <MagnifyingGlassIcon class="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p class="text-slate-900 font-medium mb-2">
            No interactions match your filters
          </p>
          <p class="text-sm text-slate-500">
            Try adjusting your search or filters
          </p>
        </div>
      </template>

      <!-- Main Content with PageState for Loading/Error/Empty -->
      <PageState
        v-else
        :loading="loading && allInteractions.length === 0"
        :error="error"
        :isEmpty="allInteractions.length === 0"
        loading-message="Loading interactions..."
        empty-title="No interactions yet"
        empty-message=""
        :empty-icon="ChatBubbleLeftRightIcon"
      >
        <!-- Interactions Timeline -->
        <h2 class="sr-only">Interaction Timeline</h2>
        <div class="space-y-4">
          <InteractionCard
            v-for="interaction in filteredInteractions"
            :key="interaction.id"
            :interaction="interaction"
            :school-name="getSchoolName(interaction.school_id)"
            :coach-name="
              interaction.coach_id
                ? getCoachName(interaction.coach_id)
                : undefined
            "
            :current-user-id="userStore.user?.id || ''"
            :is-parent="userStore.isParent"
            @view="viewInteraction"
          />
        </div>

        <template #empty-action>
          <NuxtLink
            to="/interactions/add"
            class="text-blue-600 hover:text-blue-700 font-medium underline"
          >
            Log your first interaction
          </NuxtLink>
        </template>
      </PageState>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, inject } from "vue";
import { useInteractions } from "~/composables/useInteractions";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import { useEntityNames } from "~/composables/useEntityNames";
import { useLinkedAthletes } from "~/composables/useLinkedAthletes";
import { useFamilyContext } from "~/composables/useFamilyContext";
import { useInteractionFilters } from "~/composables/useInteractionFilters";
import { useInteractionAnalytics } from "~/composables/useInteractionAnalytics";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";
import { useUserStore } from "~/stores/user";
import AnalyticsCards from "~/components/Interaction/AnalyticsCards.vue";
import InteractionFilters from "~/components/Interaction/InteractionFilters.vue";
import ActiveFilterChips from "~/components/Interaction/ActiveFilterChips.vue";
import InteractionCard from "~/components/Interaction/InteractionCard.vue";
import PageState from "~/components/shared/PageState.vue";
import type { Interaction } from "~/types/models";
import {
  ArrowDownTrayIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/vue/24/outline";
import {
  exportInteractionsToCSV,
  generateInteractionsPDF,
  type InteractionExportData,
} from "~/utils/exportUtils";

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
// Inject family context provided at app.vue level (with singleton fallback)
const activeFamily = (inject<UseActiveFamilyReturn>("activeFamily") ||
  useFamilyContext()) as UseActiveFamilyReturn;
const { activeFamilyId } = activeFamily;
const { interactions: interactionsData, fetchInteractions } = useInteractions();
const { schools, fetchSchools } = useSchools();
const { coaches, fetchAllCoaches } = useCoaches();

// Create local name resolution functions using the same refs we're fetching
const getSchoolName = (schoolId?: string): string => {
  if (!schoolId) return "Unknown";
  const school = schools.value.find((s) => s.id === schoolId);
  return school?.name || "Unknown";
};

const getCoachName = (coachId?: string): string => {
  if (!coachId) return "Unknown";
  const coach = coaches.value.find((c) => c.id === coachId);
  if (!coach) return "Unknown";
  const name = `${coach.first_name || ""} ${coach.last_name || ""}`.trim();
  return name || "Unknown";
};
const { linkedAthletes, fetchLinkedAthletes } = useLinkedAthletes();

// Data
const allInteractions = ref<Interaction[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Use extracted composables for filtering and analytics
const {
  filterValues,
  hasActiveFilters,
  handleFilterUpdate,
  clearFilters,
  filteredInteractions,
} = useInteractionFilters(allInteractions);
const { outboundCount, inboundCount, thisWeekCount } =
  useInteractionAnalytics(allInteractions);

// Handle filter updates from InteractionFilters component
const handleFilterChange = (payload: {
  field: string;
  value: string | null;
}) => {
  handleFilterUpdate(payload.field, payload.value);
};

const viewInteraction = async (interaction: Interaction) => {
  await navigateTo(`/interactions/${interaction.id}`);
};

// Export functions
const getExportData = (): InteractionExportData[] => {
  return filteredInteractions.value.map((interaction) => ({
    ...interaction,
    schoolName: getSchoolName(interaction.school_id),
    coachName: interaction.coach_id
      ? getCoachName(interaction.coach_id)
      : undefined,
  }));
};

const handleExportCSV = () => {
  const data = getExportData();
  if (data.length === 0) return;
  exportInteractionsToCSV(data);
};

const handleExportPDF = () => {
  const data = getExportData();
  if (data.length === 0) return;
  generateInteractionsPDF(data);
};

// Re-fetch interactions when active athlete changes (for parents switching between children)
watch(
  () => activeFamilyId.value,
  async (newFamilyId) => {
    if (newFamilyId) {
      console.debug(
        `[Interactions] Family changed: familyId=${newFamilyId}, re-fetching interactions`,
      );
      await fetchInteractions();
    }
  },
  { immediate: true },
);

// Load data
onMounted(async () => {
  if (!userStore.user) return;

  try {
    loading.value = true;

    await fetchSchools();
    await fetchAllCoaches();

    // Load linked athletes if parent
    if (userStore.isParent) {
      await fetchLinkedAthletes(userStore.user.id);
    }

    // Fetch interactions
    if (userStore.isAthlete) {
      // Athletes only see their own interactions by default
      await fetchInteractions({ loggedBy: userStore.user.id });
    } else {
      // Parents see all interactions
      await fetchInteractions({});
    }

    allInteractions.value = interactionsData.value;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load interactions";
    error.value = message;
    console.error("Error loading interactions:", err);
  } finally {
    loading.value = false;
  }
});
</script>
