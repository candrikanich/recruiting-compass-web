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
    <div class="border-b border-slate-200 bg-white">
      <div
        class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"
      >
        <NuxtLink
          :to="backLink.to"
          class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
          {{ backLink.text }}
        </NuxtLink>
      </div>
    </div>

    <main id="main-content" class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <!-- Loading State -->
      <div v-if="loading" class="py-12 text-center">
        <p class="text-slate-600">Loading coach profile...</p>
      </div>

      <!-- Error State -->
      <div
        v-if="error"
        class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Coach Not Found -->
      <div
        v-if="!loading && !coach"
        class="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs"
      >
        <p class="text-slate-600">Coach not found</p>
      </div>

      <!-- Coach Detail: header toolbar + two-column layout -->
      <div v-if="!loading && coach" class="space-y-5">
        <CoachDetailHeader
          :coach="coach"
          :school="school"
          :school-name="schoolName"
          @edit="editCoach"
          @delete="openDeleteModal"
        />

        <div class="flex flex-col items-start gap-5 lg:flex-row">
          <!-- Left rail -->
          <div class="w-full shrink-0 space-y-5 lg:w-[340px]">
            <CoachIdentityCard :coach="coach" :school="school" />
            <CoachChannelActions
              :coach="coach"
              @log-interaction="openLogInteraction"
              @open-social="handleOpenSocial"
            />
            <CoachInternalNotes :notes="coach.notes" @edit="editCoach" />
            <CoachTagsCard
              :tags="coach.tags"
              @add="handleAddTag"
              @remove="handleRemoveTag"
            />
            <CoachProfileMeta :coach="coach" />
            <CoachProfileLink
              :coach-id="coachId"
              :coach-email="coach.email"
              :coach-phone="coach.phone"
              :coach-last-name="coach.last_name"
              :school-id="coach.school_id ?? null"
            />
          </div>

          <!-- Right column -->
          <div class="w-full min-w-0 flex-1 space-y-5">
            <CoachAlerts
              :overdue="insights.overdueAlert.value"
              :days-since-contact="insights.daysSinceContact.value"
              :channel-preference="insights.channelPreferenceAlert.value"
              :preferred-channel="insights.preferredChannel.value"
            />
            <CoachStatCards
              :days-since-contact="insights.daysSinceContact.value"
              :is-overdue="insights.isOverdue.value"
              :total-interactions="insights.totalInteractions.value"
              :preferred-channel="insights.preferredChannel.value"
              :response-rate="insights.responseRate.value"
            />
            <CoachCommunicationAnalytics
              :sent="insights.sentReceived.value.sent"
              :received="insights.sentReceived.value.received"
              :response-rate="insights.responseRate.value"
            />
            <CoachInteractionsTable :interactions="recentInteractions" />
          </div>
        </div>
      </div>
    </main>

    <!-- Edit Coach Modal -->
    <EditCoachModal
      v-if="coach"
      :coach="coach"
      :is-open="uiState.showEditModal"
      :update-fn="updateCoach"
      @close="uiState.showEditModal = false"
      @updated="handleCoachUpdated"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmationModal
      :is-open="deleteModalOpen"
      :item-name="coach ? `${coach.first_name} ${coach.last_name}` : ''"
      item-type="coach"
      :is-loading="isDeleting"
      @cancel="closeDeleteModal"
      @confirm="deleteCoach"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCoaches } from "~/composables/useCoaches";
import { useCoachStore } from "~/stores/coaches";
import { useSchools } from "~/composables/useSchools";
import { useInteractions } from "~/composables/useInteractions";
import { useCoachInsights } from "~/composables/useCoachInsights";
import { useRealtimeCoachDetail } from "~/composables/useRealtimeCoachDetail";
import { useDeleteModal } from "~/composables/useDeleteModal";
import { deriveBackLink } from "~/composables/useBackLink";
import DeleteConfirmationModal from "~/components/DeleteConfirmationModal.vue";
import EditCoachModal from "~/components/EditCoachModal.vue";
import CoachDetailHeader from "~/components/Coach/detail/CoachDetailHeader.vue";
import CoachCommunicationAnalytics from "~/components/Coach/detail/CoachCommunicationAnalytics.vue";
import CoachIdentityCard from "~/components/Coach/detail/CoachIdentityCard.vue";
import CoachChannelActions from "~/components/Coach/detail/CoachChannelActions.vue";
import CoachInternalNotes from "~/components/Coach/detail/CoachInternalNotes.vue";
import CoachTagsCard from "~/components/Coach/detail/CoachTagsCard.vue";
import CoachProfileMeta from "~/components/Coach/detail/CoachProfileMeta.vue";
import CoachAlerts from "~/components/Coach/detail/CoachAlerts.vue";
import CoachStatCards from "~/components/Coach/detail/CoachStatCards.vue";
import CoachInteractionsTable from "~/components/Coach/detail/CoachInteractionsTable.vue";
import CoachProfileLink from "~/components/coaches/CoachProfileLink.vue";
import type { Coach, Interaction, School } from "~/types/models";
import { createClientLogger } from "~/utils/logger";
import { socialDmInteraction } from "~/utils/socialDm";

const logger = createClientLogger("CoachDetail");

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const router = useRouter();
const coachId = route.params.id as string;
const backLink = computed(() => deriveBackLink(route.query));

const { getCoach, updateCoach, smartDelete, fetchCoaches } = useCoaches();
const coachStore = useCoachStore();
const { getSchool } = useSchools();
const { interactions, fetchInteractions, createInteraction } =
  useInteractions();

// Coach data and loading state
const coach = ref<Coach | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const schoolName = ref("");
const school = ref<School | undefined>(undefined);

// Delete modal management
const {
  isOpen: deleteModalOpen,
  isDeleting,
  open: openDeleteModal,
  close: closeDeleteModal,
  confirm: confirmDelete,
} = useDeleteModal(smartDelete);

// Edit modal state
const uiState = reactive({
  showEditModal: false,
});

// Computed properties
const recentInteractions = computed<Interaction[]>(() => {
  return (interactions.value || [])
    .filter((i) => i.coach_id === coachId)
    .sort((a, b) => {
      const dateA = a.occurred_at ? new Date(a.occurred_at).getTime() : 0;
      const dateB = b.occurred_at ? new Date(b.occurred_at).getTime() : 0;
      return dateB - dateA;
    });
});

const insights = useCoachInsights(coach, recentInteractions);

// "Log Interaction" now routes to the interaction-create page, prefilling this
// coach + school via query params (the inline composer was removed from the page).
const openLogInteraction = () => {
  const schoolId = coach.value?.school_id ?? "";
  navigateTo(`/interactions/add?coachId=${coachId}&schoolId=${schoolId}`);
};

// School-wide refresh (not coach-filtered): the interactions table filters by
// coach in-page, but ranking/analytics elsewhere need the school's full set.
// No-op for a coach without a school.
const refreshSchoolInteractions = async (): Promise<void> => {
  if (coach.value?.school_id) {
    await fetchInteractions({ schoolId: coach.value.school_id });
  }
};

// Live-update coach detail when data changes from another device/session.
const coachSchoolId = computed(() => coach.value?.school_id ?? null);
useRealtimeCoachDetail({
  coachId,
  schoolId: coachSchoolId,
  onInteractionChange: refreshSchoolInteractions,
  onCoachChange: async () => {
    const updated = await getCoach(coachId);
    if (updated) coach.value = updated;
  },
});

// Best-effort: opening a social profile is a hand-off, so like mailto/sms this logs
// on click. createInteraction is player-role + family gated, so a parent-viewed
// coach simply won't log — never surface that as an error.
async function logSocialDm(): Promise<void> {
  if (!coach.value) return;
  try {
    await createInteraction({
      ...socialDmInteraction(coach.value),
      occurred_at: new Date().toISOString(),
    });
    await refreshSchoolInteractions();
  } catch {
    // swallow — logging is best-effort
  }
}

const handleOpenSocial = (_platform: "twitter" | "instagram") => {
  void logSocialDm();
};

// Coach management handlers
const editCoach = () => {
  uiState.showEditModal = true;
};

const handleCoachUpdated = async (updated: Coach) => {
  coach.value = updated;
};

// Delete handler using composable
const deleteCoach = async () => {
  if (!coach.value?.id) return;

  try {
    await confirmDelete(coach.value.id, () => {
      router.push("/coaches");
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete coach";
    error.value = message;
    logger.error("Failed to delete coach", err);
  }
};

// Tag handlers
const handleAddTag = async (tag: string) => {
  if (!coach.value) return;
  const trimmed = tag.trim();
  if (!trimmed) return;
  if (trimmed.length > 40) return;
  if (coach.value.tags.includes(trimmed)) return;
  if (coach.value.tags.length >= 20) return;

  const nextTags = [...coach.value.tags, trimmed];
  const updated = await coachStore.updateCoachTags(coach.value.id, nextTags);
  if (updated) coach.value = updated;
};

const handleRemoveTag = async (tag: string) => {
  if (!coach.value) return;
  const nextTags = coach.value.tags.filter((t) => t !== tag);
  const updated = await coachStore.updateCoachTags(coach.value.id, nextTags);
  if (updated) coach.value = updated;
};

// Data loading
onMounted(async () => {
  loading.value = true;
  error.value = null;

  try {
    const coachData = await getCoach(coachId);
    if (coachData) {
      coach.value = coachData;

      // Fetch the school — full object drives Quick Comm prefill/save of
      // per-school why-program / why-fit answers, not just the name.
      if (coachData.school_id) {
        const schoolData = await getSchool(coachData.school_id);
        if (schoolData) {
          schoolName.value = String(schoolData.name);
          school.value = schoolData;
        }
      }

      // Fetch school-wide interactions + coaches so downstream ranking can
      // compare this coach against the school's others; the table filters
      // by coach in-page.
      if (coachData.school_id) {
        await Promise.all([
          fetchInteractions({ schoolId: coachData.school_id }),
          fetchCoaches(coachData.school_id),
        ]);
      }
    } else {
      error.value = "Coach not found";
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load coach";
  } finally {
    loading.value = false;
  }
});
</script>
