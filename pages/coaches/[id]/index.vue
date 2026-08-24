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
      <div class="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <NuxtLink
          :to="backLink.to"
          class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
          {{ backLink.text }}
        </NuxtLink>
      </div>
    </div>

    <main id="main-content" class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
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

      <!-- Coach Detail -->
      <div v-if="!loading && coach" class="space-y-6">
        <!-- Header Component -->
        <CoachHeader
          :coach="coach"
          :school-name="schoolName"
          @send-email="sendEmail"
          @send-text="sendText"
          @call-coach="callCoach"
          @open-twitter="handleOpenTwitter"
          @open-instagram="handleOpenInstagram"
          @edit-coach="editCoach"
          @delete-coach="openDeleteModal"
        />

        <!-- Stats Grid Component -->
        <CoachStatsGrid :stats="stats" />

        <!-- Notes Editor Component -->
        <CoachNotesEditor
          v-model="notes"
          title="Notes"
          placeholder="Add notes about this coach..."
          :save-fn="saveNotes"
        />

        <!-- Communication Analytics (folded in from the former /analytics page) -->
        <CoachMetricsPanel
          :metrics="coachMetrics"
          :comparison="coachComparison"
          :insights="coachInsightsList"
        />

        <!-- Interactions Log (filter + expand; folded in from /communications) -->
        <CoachInteractionsLog
          :interactions="recentInteractions"
          :coach-name="`${coach.first_name} ${coach.last_name}`"
        />

        <!-- Send Profile -->
        <CoachProfileLink
          :coach-id="coachId"
          :coach-email="coach?.email ?? null"
          :coach-phone="coach?.phone ?? null"
          :coach-last-name="coach?.last_name ?? null"
          :school-id="coach?.school_id ?? null"
        />
      </div>
    </main>

    <!-- Communication Panel Drawer (right-anchored: keeps the coach page in view) -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showPanel && coach"
          class="fixed inset-0 z-50 bg-black/40"
          @click.self="handleCloseCommunicationPanel"
          @keydown.escape="handleCloseCommunicationPanel"
        >
          <Transition name="drawer">
            <div
              v-if="showPanel && coach"
              ref="communicationDialogRef"
              role="dialog"
              aria-modal="true"
              aria-labelledby="communication-panel-title"
              class="absolute top-0 right-0 h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
              @click.stop
            >
              <div
                class="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-4"
              >
                <h2
                  id="communication-panel-title"
                  class="text-xl font-bold text-slate-900"
                >
                  Quick Communication
                </h2>
                <button
                  @click="handleCloseCommunicationPanel"
                  aria-label="Close communication panel"
                  class="text-slate-400 hover:text-slate-600"
                >
                  <UIcon name="i-heroicons-x-mark" class="h-6 w-6" />
                </button>
              </div>
              <div class="p-6">
                <CommunicationPanel
                  :coach="coach"
                  :school="school"
                  :school-name="schoolName"
                  :initial-type="communicationType"
                  @close="handleCloseCommunicationPanel"
                  @interaction-logged="handleCoachInteractionLogged"
                />
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

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
import { useSchools } from "~/composables/useSchools";
import { useInteractions } from "~/composables/useInteractions";
import { useCoachStats } from "~/composables/useCoachStats";
import {
  calcCoachMetrics,
  compareCoachToSchool,
  coachInsights,
} from "~/composables/useCoachAnalytics";
import { toTelHref } from "~/utils/phone";
import { openTwitter, openInstagram } from "~/utils/socialMediaHandlers";
import { socialDmInteraction } from "~/utils/socialDm";
import { useUserStore } from "~/stores/user";
import { useDeleteModal } from "~/composables/useDeleteModal";
import { useCommunicationModal } from "~/composables/useCommunicationModal";
import { deriveBackLink } from "~/composables/useBackLink";
import DeleteConfirmationModal from "~/components/DeleteConfirmationModal.vue";
import CoachHeader from "~/components/Coach/CoachHeader.vue";
import CoachStatsGrid from "~/components/Coach/CoachStatsGrid.vue";
import CoachNotesEditor from "~/components/Coach/CoachNotesEditor.vue";
import CoachMetricsPanel from "~/components/Coach/CoachMetricsPanel.vue";
import CoachInteractionsLog from "~/components/Coach/CoachInteractionsLog.vue";
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

const { getCoach, updateCoach, smartDelete, coaches, fetchCoaches } =
  useCoaches();
const { getSchool } = useSchools();
const { interactions, fetchInteractions, createInteraction } =
  useInteractions();
const userStore = useUserStore();

// Coach data and loading state
const coach = ref<Coach | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const schoolName = ref("");
const school = ref<School | undefined>(undefined);

// Communication modal with focus trap management
const {
  dialogRef: communicationDialogRef,
  showPanel,
  communicationType,
  openCommunication,
  handleInteractionLogged,
  handleClose: handleCloseCommunicationPanel,
} = useCommunicationModal();

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

// Use the coach stats composable
const { stats } = useCoachStats(coach, recentInteractions);

// Communication analytics — computed from the school-wide interactions this page
// already loads (ranking needs every coach at the school), plus the coaches list.
const coachMetrics = computed(() =>
  calcCoachMetrics(interactions.value || [], coachId),
);
const coachComparison = computed(() =>
  compareCoachToSchool(
    interactions.value || [],
    coaches.value || [],
    coachId,
    coach.value?.school_id ?? undefined,
  ),
);
const coachInsightsList = computed(() =>
  coachInsights(interactions.value || [], coachId),
);

// Notes v-models
const notes = computed({
  get: (): string => coach.value?.notes || "",
  set: (value: string) => {
    if (coach.value) {
      coach.value.notes = value;
    }
  },
});

// Communication handlers
const sendEmail = () => {
  if (coach.value) {
    openCommunication(coach.value, "email");
  }
};

const sendText = () => {
  if (coach.value) {
    openCommunication(coach.value, "text");
  }
};

const callCoach = () => {
  if (coach.value?.phone) {
    window.location.href = toTelHref(coach.value.phone);
  }
};

const handleOpenTwitter = () => {
  openTwitter(coach.value?.twitter_handle);
  void logSocialDm();
};

const handleOpenInstagram = () => {
  openInstagram(coach.value?.instagram_handle);
  void logSocialDm();
};

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
    if (coach.value.school_id) {
      // School-wide (not coach-filtered): the metrics panel ranks this coach
      // against the school's other coaches; the log/recent list filter by coach.
      await fetchInteractions({ schoolId: coach.value.school_id });
    }
  } catch {
    // swallow — logging is best-effort
  }
}

const handleCoachInteractionLogged = async (interactionData: {
  type: string;
  direction: string;
  content: string;
}) => {
  try {
    const refreshData = async () => {
      const updatedCoach = await getCoach(coachId);
      if (updatedCoach) {
        coach.value = updatedCoach;
      }

      if (coach.value?.school_id) {
        // School-wide (not coach-filtered): the metrics panel ranks this coach
        // against the school's other coaches; the log/recent list filter by coach.
        await fetchInteractions({ schoolId: coach.value.school_id });
      }
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

// Notes save handlers
const saveNotes = async (value: string) => {
  if (!coach.value) return;
  const updated = await updateCoach(coach.value.id, { notes: value });
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

      // Fetch school-wide interactions + coaches so the metrics panel can rank
      // this coach against the school's others; the log filters by coach in-page.
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

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
