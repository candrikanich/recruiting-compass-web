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

        <div v-if="coach" class="flex items-center gap-2">
          <button
            type="button"
            data-test="edit-coach-btn"
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            @click="editCoach"
          >
            Edit
          </button>
          <button
            type="button"
            data-test="coach-detail-delete-btn"
            class="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            @click="openDeleteModal"
          >
            Delete
          </button>
        </div>
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

      <!-- Coach Detail: two-column layout -->
      <div v-if="!loading && coach" class="grid gap-6 lg:grid-cols-[340px_1fr]">
        <!-- Left rail -->
        <div class="space-y-4">
          <CoachIdentityCard :coach="coach" />
          <CoachChannelActions :coach="coach" @log-interaction="openLogInteraction" />
          <CoachInternalNotes :notes="coach.notes" @edit="editCoach" />
          <CoachTagsCard :tags="coach.tags" @add="handleAddTag" @remove="handleRemoveTag" />
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
        <div class="space-y-6">
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
          <div ref="communicationPanelEl">
            <CommunicationPanel
              :coach="coach"
              :school="school"
              :school-name="schoolName"
              @interaction-logged="handleCoachInteractionLogged"
            />
          </div>
          <CoachInteractionsTable :interactions="recentInteractions" />
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
import { useCommunication } from "~/composables/useCommunication";
import { useDeleteModal } from "~/composables/useDeleteModal";
import { deriveBackLink } from "~/composables/useBackLink";
import DeleteConfirmationModal from "~/components/DeleteConfirmationModal.vue";
import EditCoachModal from "~/components/EditCoachModal.vue";
import CommunicationPanel from "~/components/CommunicationPanel.vue";
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
const { interactions, fetchInteractions } = useInteractions();

// Coach data and loading state
const coach = ref<Coach | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const schoolName = ref("");
const school = ref<School | undefined>(undefined);
const communicationPanelEl = ref<HTMLElement | null>(null);

// The inline CommunicationPanel composes+sends and emits interaction-logged;
// this composable's handleInteractionLogged does the create-record +
// last_contact_date bookkeeping that used to live behind a modal drawer.
const { openCommunication, handleInteractionLogged } = useCommunication();

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

// Communication handlers: the panel is embedded inline (not a modal), so
// "Log Interaction" brings it into view rather than opening a drawer.
const openLogInteraction = () => {
  communicationPanelEl.value?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};

// School-wide refresh (not coach-filtered): the interactions table filters by
// coach in-page, but ranking/analytics elsewhere need the school's full set.
// No-op for a coach without a school.
const refreshSchoolInteractions = async (): Promise<void> => {
  if (coach.value?.school_id) {
    await fetchInteractions({ schoolId: coach.value.school_id });
  }
};

const handleCoachInteractionLogged = async (interactionData: {
  type: string;
  direction: string;
  content: string;
}) => {
  if (!coach.value) return;
  try {
    // Prime the composable's selectedCoach — CommunicationPanel is inline, so
    // there's no separate "open" step to have set it already.
    openCommunication(coach.value, "email");

    const refreshData = async () => {
      const updatedCoach = await getCoach(coachId);
      if (updatedCoach) {
        coach.value = updatedCoach;
      }
      await refreshSchoolInteractions();
    };

    await handleInteractionLogged(interactionData as any, refreshData);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to log interaction";
  }
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
  const nextTags = [...coach.value.tags, tag];
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
