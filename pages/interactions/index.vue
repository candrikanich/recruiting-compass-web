<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Skip Link -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
    >
      Skip to main content
    </a>

    <!-- Page Header -->
    <PageHeader
      :title="userStore.isAthlete ? 'My Interactions' : 'Interactions'"
      description="Log and review your recruiting communications"
    >
      <template #actions>
        <button
          v-if="filteredInteractions.length > 0"
          @click="handleExportCSV"
          class="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600"
        >
          <UIcon
            name="i-heroicons-arrow-down-tray"
            class="h-4 w-4"
            aria-hidden="true"
          />
          CSV
        </button>
        <button
          v-if="filteredInteractions.length > 0"
          @click="handleExportPDF"
          class="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600"
        >
          <UIcon
            name="i-heroicons-arrow-down-tray"
            class="h-4 w-4"
            aria-hidden="true"
          />
          PDF
        </button>
        <NuxtLink
          to="/interactions/add"
          data-testid="log-interaction-button"
          class="flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600"
        >
          <UIcon name="i-heroicons-plus" class="h-4 w-4" aria-hidden="true" />
          Log Interaction
        </NuxtLink>
      </template>
    </PageHeader>

    <main id="main-content" class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <!-- Analytics Cards -->
      <h2 class="sr-only">Statistics</h2>
      <AnalyticsCards
        v-if="allInteractions.length > 0"
        :total-count="allInteractions.length"
        :outbound-count="outboundCount"
        :inbound-count="inboundCount"
        :this-week-count="thisWeekCount"
      />

      <!-- Filter Bar -->
      <template v-if="allInteractions.length > 0">
        <h2 class="sr-only">Filter Options</h2>
        <div
          class="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
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
      </template>

      <!-- Filter Results Announcement -->
      <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
        {{ filteredInteractions.length }} interaction{{
          filteredInteractions.length !== 1 ? "s" : ""
        }}
        found{{ hasActiveFilters ? " with active filters" : "" }}
      </div>

      <!-- Loading State -->
      <div
        v-if="loading && allInteractions.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
        role="status"
        aria-live="polite"
      >
        <div
          class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"
          aria-hidden="true"
        ></div>
        <p class="text-slate-600">Loading interactions...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="mb-6 border-l-4 border-red-600 bg-red-50 p-4"
        role="alert"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Empty State: No coaches yet -->
      <div
        v-else-if="
          !loading && allInteractions.length === 0 && coaches.length === 0
        "
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
        role="status"
      >
        <UIcon
          name="i-heroicons-user-group"
          class="mx-auto mb-4 h-12 w-12 text-slate-400"
          aria-hidden="true"
        />
        <h2 class="mb-2 font-semibold text-slate-900">Add a coach first</h2>
        <p class="mb-6 text-slate-600">
          Interactions are linked to coaches. Visit a school page to add coaches
          to your list.
        </p>
        <NuxtLink
          to="/schools"
          class="inline-block rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700"
        >
          Go to Schools
        </NuxtLink>
      </div>

      <!-- Empty State: Has coaches but no interactions -->
      <div
        v-else-if="!loading && allInteractions.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
        role="status"
      >
        <UIcon
          name="i-heroicons-chat-bubble-left-right"
          class="mx-auto mb-4 h-12 w-12 text-slate-400"
          aria-hidden="true"
        />
        <h2 class="mb-2 font-semibold text-slate-900">No interactions yet</h2>
        <p class="mb-6 text-slate-600">
          Start logging your recruiting conversations with coaches.
        </p>
        <NuxtLink
          to="/interactions/add"
          class="inline-block rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700"
        >
          Log Your First Interaction
        </NuxtLink>
      </div>

      <!-- No Results State (has interactions but filters returned nothing) -->
      <div
        v-else-if="
          filteredInteractions.length === 0 && allInteractions.length > 0
        "
        role="status"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
      >
        <UIcon
          name="i-heroicons-magnifying-glass"
          class="mx-auto mb-4 h-12 w-12 text-slate-300"
          aria-hidden="true"
        />
        <p class="mb-2 font-medium text-slate-900">
          No interactions match your filters
        </p>
        <p class="text-sm text-slate-500">
          Try adjusting your search or filters
        </p>
      </div>

      <!-- Interactions Grid -->
      <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <InteractionCard
          v-for="interaction in filteredInteractions"
          :key="interaction.id"
          v-memo="[interaction.updated_at ?? interaction.occurred_at]"
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
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useInteractions } from "~/composables/useInteractions";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import { useLinkedAthletes } from "~/composables/useLinkedAthletes";
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import { useRealtimeInteractionsList } from "~/composables/useRealtimeInteractionsList";
import { useInteractionFilters } from "~/composables/useInteractionFilters";
import { useInteractionAnalytics } from "~/composables/useInteractionAnalytics";
import { useUserStore } from "~/stores/user";
import AnalyticsCards from "~/components/Interaction/AnalyticsCards.vue";
import InteractionFilters from "~/components/Interaction/InteractionFilters.vue";
import ActiveFilterChips from "~/components/Interaction/ActiveFilterChips.vue";
import InteractionCard from "~/components/Interaction/InteractionCard.vue";
import type { Interaction } from "~/types/models";
import {
  exportInteractionsToCSV,
  generateInteractionsPDF,
  type InteractionExportData,
} from "~/utils/exportUtils";
import { createClientLogger } from "~/utils/logger";

definePageMeta({
  middleware: "auth",
});

const logger = createClientLogger("InteractionsList");
const userStore = useUserStore();
const activeFamily = useFamilyCtx();
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
      logger.debug("Family changed, re-fetching interactions", {
        familyId: newFamilyId,
      });
      await fetchInteractions();
    }
  },
  { immediate: true },
);

// Live-update interactions list when data changes from another device/session.
useRealtimeInteractionsList(activeFamilyId, {
  onInteractionChange: async () => {
    if (!userStore.user) return;
    if (userStore.isAthlete) {
      await fetchInteractions({ loggedBy: userStore.user.id });
    } else {
      await fetchInteractions({});
    }
    allInteractions.value = interactionsData.value;
  },
});

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
    logger.error("Error loading interactions", err);
  } finally {
    loading.value = false;
  }
});
</script>
