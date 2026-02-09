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

    <!-- Global Navigation -->

    <!-- Timeline Status Snippet -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      <StatusSnippet context="interactions" />
    </div>

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

      <!-- Loading State -->
      <div
        v-if="loading && allInteractions.length === 0"
        role="status"
        aria-live="polite"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-slate-600">Loading interactions...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        role="status"
        class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="allInteractions.length === 0"
        role="alert"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <ChatBubbleLeftRightIcon
          class="w-12 h-12 text-slate-300 mx-auto mb-4"
        />
        <p class="text-slate-900 font-medium mb-2">No interactions yet</p>
        <NuxtLink
          to="/interactions/add"
          class="text-blue-600 hover:text-blue-700 font-medium underline"
        >
          Log your first interaction
        </NuxtLink>
      </div>

      <!-- No Results State -->
      <div
        v-else-if="filteredInteractions.length === 0"
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

      <!-- Interactions Timeline -->
      <h2 class="sr-only">Interaction Timeline</h2>
      <div v-else class="space-y-4">
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
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, inject } from "vue";
import { useInteractions } from "~/composables/useInteractions";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import { useFamilyContext } from "~/composables/useFamilyContext";
import { useInteractionFilters } from "~/composables/useInteractionFilters";
import { useInteractionAnalytics } from "~/composables/useInteractionAnalytics";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";
import { useUserStore } from "~/stores/user";
import { useSupabase } from "~/composables/useSupabase";
import StatusSnippet from "~/components/Timeline/StatusSnippet.vue";
import AnalyticsCards from "~/components/Interaction/AnalyticsCards.vue";
import InteractionFilters from "~/components/Interaction/InteractionFilters.vue";
import ActiveFilterChips from "~/components/Interaction/ActiveFilterChips.vue";
import InteractionCard from "~/components/Interaction/InteractionCard.vue";
import type { User, School, Coach } from "~/types/models";
import {
  ArrowDownTrayIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/vue/24/outline";
import type { Interaction } from "~/types/models";
import {
  exportInteractionsToCSV,
  generateInteractionsPDF,
  type InteractionExportData,
} from "~/utils/exportUtils";

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
const supabase = useSupabase();
// Inject family context provided at app.vue level (with singleton fallback)
const activeFamily = (inject<UseActiveFamilyReturn>("activeFamily") ||
  useFamilyContext()) as UseActiveFamilyReturn;
const { activeFamilyId } = activeFamily;
const { interactions: interactionsData, fetchInteractions } = useInteractions();
const { schools: schoolsData, fetchSchools } = useSchools();
const { coaches: coachesData, fetchAllCoaches } = useCoaches();

// Data
const allInteractions = ref<Interaction[]>([]);
const schools = ref<School[]>([]);
const coaches = ref<Coach[]>([]);
const linkedAthletes = ref<User[]>([]);
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

const getSchoolName = (schoolId: string | undefined): string => {
  if (!schoolId) return "Unknown";
  const school = schools.value.find((s) => s.id === schoolId);
  return school?.name || "Unknown";
};

const getCoachName = (coachId: string | undefined): string => {
  if (!coachId) return "Unknown";
  const coach = coaches.value.find((c) => c.id === coachId);
  return coach
    ? `${coach.first_name || ""} ${coach.last_name || ""}`.trim()
    : "Unknown";
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
      const { data: accountLinks, error: linksError } = (await supabase
        .from("account_links")
        .select("player_user_id")
        .eq("parent_user_id", userStore.user.id)) as {
        data: Array<{ player_user_id: string | null }> | null;
        error: any;
      };

      if (!linksError && accountLinks && accountLinks.length > 0) {
        const athleteIds = accountLinks
          .map((link) => link.player_user_id)
          .filter((id): id is string => id !== null);

        if (athleteIds.length > 0) {
          const { data: athletes, error: athletesError } = await supabase
            .from("users")
            .select("*")
            .in("id", athleteIds);

          if (!athletesError && athletes) {
            linkedAthletes.value = athletes;
          }
        }
      }
    }

    // Fetch interactions
    if (userStore.isAthlete) {
      // Athletes only see their own interactions by default
      await fetchInteractions({ loggedBy: userStore.user.id });
    } else {
      // Parents see all interactions
      await fetchInteractions({});
    }

    schools.value = schoolsData.value;
    coaches.value = coachesData.value;
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
