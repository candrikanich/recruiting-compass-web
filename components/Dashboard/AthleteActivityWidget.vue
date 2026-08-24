<template>
  <div
    v-if="linkedAthletes.length > 0"
    class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
  >
    <!-- Header -->
    <div class="border-b border-slate-200 bg-slate-50 px-6 py-4">
      <h2 class="text-lg font-semibold text-slate-900">Athlete Activity</h2>
      <p class="mt-1 text-sm text-slate-600">
        Recent interactions logged by your linked athlete{{
          linkedAthletes.length > 1 ? "s" : ""
        }}
      </p>
    </div>

    <!-- Content -->
    <div v-if="loading" class="p-6 text-center">
      <div
        class="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"
      ></div>
      <p class="mt-2 text-sm text-slate-600">Loading activity...</p>
    </div>

    <div v-else-if="recentInteractions.length === 0" class="p-6 text-center">
      <UIcon
        name="i-heroicons-chat-bubble-left-right"
        class="mx-auto mb-2 h-8 w-8 text-slate-300"
      />
      <p class="text-sm text-slate-600">
        No interactions logged yet by your athlete
      </p>
    </div>

    <div v-else class="divide-y divide-slate-200">
      <!-- Interaction Items -->
      <div
        v-for="interaction in recentInteractions"
        :key="interaction.id"
        role="button"
        tabindex="0"
        class="cursor-pointer px-6 py-4 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
        @click="navigateToInteraction(interaction.id)"
        @keydown.enter="navigateToInteraction(interaction.id)"
        @keydown.space.prevent="navigateToInteraction(interaction.id)"
      >
        <div class="flex items-start gap-3">
          <!-- Type Icon -->
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            :class="getTypeIconBg(interaction.type)"
          >
            <component
              :is="getTypeIcon(interaction.type)"
              class="h-4 w-4"
              :class="getTypeIconColor(interaction.type)"
            />
          </div>

          <div class="min-w-0 flex-1">
            <!-- Title and Metadata -->
            <div class="mb-1 flex flex-wrap items-center gap-2">
              <span class="font-medium text-slate-900">
                {{ formatType(interaction.type) }}
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="
                  interaction.direction === 'outbound'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-emerald-100 text-emerald-700'
                "
              >
                {{ formatDirection(interaction.direction) }}
              </span>
            </div>

            <!-- Subject/Preview -->
            <p
              v-if="interaction.subject"
              class="truncate text-sm font-medium text-slate-700"
            >
              {{ interaction.subject }}
            </p>

            <!-- School and Coach -->
            <p class="mt-1 text-xs text-slate-500">
              {{ getSchoolName(interaction.school_id) }}
              <span v-if="interaction.coach_id" class="text-slate-400">
                • {{ getCoachName(interaction.coach_id) }}
              </span>
            </p>

            <!-- Date -->
            <p class="mt-1 text-xs text-slate-400">
              {{
                formatDate(interaction.occurred_at || interaction.created_at)
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- View All Link -->
      <div class="border-t border-slate-200 bg-slate-50 px-6 py-3">
        <NuxtLink
          to="/interactions"
          class="text-sm font-medium text-blue-600 transition hover:text-blue-700"
        >
          View all athlete interactions →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useUserStore } from "~/stores/user";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import { useAthleteActivity } from "~/composables/useAthleteActivity";
import {
  getTypeIcon,
  getTypeIconBg,
  getTypeIconColor,
  formatType,
} from "~/utils/interactionFormatters";

const userStore = useUserStore();
const { schools: schoolsData } = useSchools();
const { coaches: coachesData } = useCoaches();
const {
  linkedAthletes: activityLinkedAthletes,
  recentInteractions: activityRecentInteractions,
  loading: activityLoading,
  fetchAthleteActivity,
} = useAthleteActivity();

const linkedAthletes = computed(() => activityLinkedAthletes.value);
const recentInteractions = computed(() => activityRecentInteractions.value);
const loading = computed(() => activityLoading.value);

const schools = computed(() => schoolsData.value);
const coaches = computed(() => coachesData.value);

const formatDirection = (direction: string): string => {
  return direction === "outbound" ? "Outbound" : "Inbound";
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getSchoolName = (schoolId: string | undefined): string => {
  if (!schoolId) return "Unknown";
  return schools.value.find((s) => s.id === schoolId)?.name || "Unknown";
};

const getCoachName = (coachId: string | undefined): string => {
  if (!coachId) return "Unknown";
  const coach = coaches.value.find((c) => c.id === coachId);
  return coach ? `${coach.first_name} ${coach.last_name}` : "Unknown";
};

const navigateToInteraction = (interactionId: string) => {
  navigateTo(`/interactions/${interactionId}`);
};

onMounted(() => {
  if (!userStore.isParent || !userStore.user) {
    return;
  }
  fetchAthleteActivity();
});
</script>
