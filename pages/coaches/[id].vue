<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Skip Link -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:font-medium focus:rounded-br-lg"
    >
      Skip to main content
    </a>

    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/coaches"
          class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to All Coaches
        </NuxtLink>
      </div>
    </div>

    <main id="main-content" class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-slate-600">Loading coach profile...</p>
      </div>

      <!-- Error State -->
      <div
        v-if="error"
        class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Coach Not Found -->
      <div
        v-if="!loading && !coach"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center"
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
          @save="saveNotes"
        />

        <!-- Private Notes Editor Component -->
        <CoachNotesEditor
          v-model="privateNotes"
          title="My Private Notes"
          subtitle="Only you can see these notes"
          placeholder="Add your private thoughts about this coach..."
          @save="savePrivateNotes"
        />

        <!-- Recent Interactions Component -->
        <CoachRecentInteractions
          :interactions="recentInteractions"
          :coach-name="`${coach.first_name} ${coach.last_name}`"
        />
      </div>
    </main>

    <!-- Communication Panel Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showPanel && coach"
          class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          @keydown.escape="handleCloseCommunicationPanel"
        >
          <div
            ref="communicationDialogRef"
            role="dialog"
            aria-modal="true"
            aria-labelledby="communication-panel-title"
            class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            @click.stop
          >
            <div
              class="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between rounded-t-xl"
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
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>
            <div class="p-6">
              <CommunicationPanel
                :coach="coach"
                :school-name="schoolName"
                :initial-type="communicationType"
                @close="handleCloseCommunicationPanel"
                @interaction-logged="handleCoachInteractionLogged"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit Coach Modal -->
    <EditCoachModal
      v-if="coach"
      :coach="coach"
      :is-open="uiState.showEditModal"
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
import {
  ref,
  computed,
  reactive,
  onMounted,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";
import { useInteractions } from "~/composables/useInteractions";
import { useCoachStats } from "~/composables/useCoachStats";
import { openTwitter, openInstagram } from "~/utils/socialMediaHandlers";
import { useUserStore } from "~/stores/user";
import { useDeleteModal } from "~/composables/useDeleteModal";
import { usePrivateNotes } from "~/composables/usePrivateNotes";
import { useCommunicationModal } from "~/composables/useCommunicationModal";
import { ArrowLeftIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import DeleteConfirmationModal from "~/components/DeleteConfirmationModal.vue";
import CoachHeader from "~/components/Coach/CoachHeader.vue";
import CoachStatsGrid from "~/components/Coach/CoachStatsGrid.vue";
import CoachNotesEditor from "~/components/Coach/CoachNotesEditor.vue";
import CoachRecentInteractions from "~/components/Coach/CoachRecentInteractions.vue";
import type { Coach, Interaction } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const router = useRouter();
const coachId = route.params.id as string;

const { getCoach, updateCoach, smartDelete } = useCoaches();
const { getSchool } = useSchools();
const { interactions, fetchInteractions } = useInteractions();
const userStore = useUserStore();

// Coach data and loading state
const coach = ref<Coach | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const schoolName = ref("");

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

// Notes v-models
const notes = computed({
  get: (): string => coach.value?.notes || "",
  set: (value: string) => {
    if (coach.value) {
      coach.value.notes = value;
    }
  },
});

// Private notes using composable
const privateNotes = usePrivateNotes(coach);

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
    window.location.href = `tel:${coach.value.phone}`;
  }
};

const handleOpenTwitter = () => {
  openTwitter(coach.value?.twitter_handle);
};

const handleOpenInstagram = () => {
  openInstagram(coach.value?.instagram_handle);
};

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
        await fetchInteractions({ schoolId: coach.value.school_id, coachId });
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
    console.error("Failed to delete coach:", err);
  }
};

// Notes save handlers
const saveNotes = async (value: string) => {
  if (!coach.value) return;
  await updateCoach(coach.value.id, { notes: value });
};

const savePrivateNotes = async (value: string) => {
  if (!coach.value || !userStore.user) return;
  await updateCoach(coach.value.id, {
    private_notes: {
      ...(coach.value.private_notes || {}),
      [userStore.user.id]: value,
    },
  });
};

// Data loading
onMounted(async () => {
  loading.value = true;
  error.value = null;

  try {
    const coachData = await getCoach(coachId);
    if (coachData) {
      coach.value = coachData;

      // Fetch school name
      if (coachData.school_id) {
        const schoolData = await getSchool(coachData.school_id);
        if (schoolData) {
          schoolName.value = String(schoolData.name);
        }
      }

      // Fetch interactions for this coach
      if (coachData.school_id) {
        await fetchInteractions({ schoolId: coachData.school_id, coachId });
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
</style>
