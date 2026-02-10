<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/schools"
          class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          <ArrowLeftIcon class="w-4 h-4" aria-hidden="true" />
          Back to Schools
        </NuxtLink>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Loading State -->
      <div
        v-if="loading"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
        role="status"
        aria-live="polite"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
          aria-hidden="true"
        ></div>
        <p class="text-slate-600">Loading school...</p>
      </div>

      <!-- School Detail -->
      <div v-else-if="school" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content - Left Column -->
        <div class="lg:col-span-2 space-y-6">
          <!-- School Header Card -->
          <SchoolDetailHeader
            :school="school"
            :calculated-size="calculatedSize"
            :status-updating="statusUpdating"
            @update:status="handleStatusUpdate"
            @update:priority="handlePriorityUpdate"
            @toggle-favorite="handleToggleFavorite"
          />

          <!-- Status History Card -->
          <SchoolStatusHistory :school-id="id" />

          <!-- Fit Score Card -->
          <div
            v-if="fitScore"
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
          >
            <h2 class="text-lg font-semibold text-slate-900 mb-4">
              School Fit Analysis
            </h2>
            <FitScoreDisplay :fit-score="fitScore" :show-breakdown="true" />
          </div>

          <!-- Division Recommendations Card -->
          <DivisionRecommendationCard
            v-if="divisionRecommendation?.shouldConsiderOtherDivisions"
            :recommendation="divisionRecommendation"
          />

          <!-- Information Card -->
          <SchoolInformationCard
            :school="school"
            :calculated-distance="calculatedDistanceFromHome"
            :college-data-loading="collegeDataLoading"
            :college-data-error="collegeDataError"
            :editing-basic-info="editingBasicInfo"
            :edited-basic-info="editedBasicInfo"
            :is-saving="loading"
            @lookup-data="lookupCollegeData"
            @save="handleSaveBasicInfo"
            @toggle-edit="handleToggleEdit"
          />

          <!-- Notes Cards -->
          <SchoolNotesCard
            :notes="school.notes"
            :private-note="myPrivateNote"
            :school-id="id"
            :is-saving="loading"
            @update:notes="handleUpdateNotes"
            @update:private-notes="handleUpdatePrivateNotes"
          />

          <!-- Pros and Cons -->
          <SchoolProsConsCard
            :pros="school.pros ?? []"
            :cons="school.cons ?? []"
            @add-pro="handleAddPro"
            @add-con="handleAddCon"
            @remove-pro="handleRemovePro"
            @remove-con="handleRemoveCon"
          />

          <!-- Coaching Philosophy Card -->
          <SchoolCoachingPhilosophy
            :school="school"
            :school-id="id"
            @update="updateCoachingPhilosophy"
          />

          <!-- Shared Documents -->
          <SchoolDocumentsCard
            :school-id="id"
            :documents="schoolDocuments"
            @upload-success="handleDocumentUploadSuccess"
          />

          <!-- Email Send Modal -->
          <EmailSendModal
            v-if="showEmailModal"
            :is-open="showEmailModal"
            :recipient-email="
              schoolCoaches.length > 0 ? (schoolCoaches[0].email ?? '') : ''
            "
            :subject="`Contact from ${school?.name || 'Recruiting Compass'}`"
            :body="`Hello,\n\nI am reaching out regarding recruitment opportunities at ${school?.name || 'your school'}.\n\nBest regards`"
            @close="showEmailModal = false"
          />
        </div>

        <!-- Sidebar - Right Column -->
        <SchoolSidebar
          :school-id="id"
          :coaches="schoolCoaches"
          :school="school"
          @open-email-modal="showEmailModal = true"
          @delete="openDeleteConfirm"
        />
      </div>

      <!-- Not Found -->
      <div
        v-else
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <p class="text-slate-600 mb-4">School not found</p>
        <NuxtLink
          to="/schools"
          class="text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to Schools
        </NuxtLink>
      </div>
    </main>

    <!-- Live Region for Screen Reader Announcements -->
    <div v-bind="liveRegionAttrs">{{ announcement }}</div>

    <!-- Confirm Delete Dialog -->
    <DesignSystemConfirmDialog
      :is-open="isDeleteDialogOpen"
      title="Delete School"
      message="Are you sure you want to delete this school? This will also remove associated coaches, interactions, and related records."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="executeDelete"
      @cancel="closeDeleteDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { navigateTo } from "#app";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import { useDocumentsConsolidated } from "~/composables/useDocumentsConsolidated";
import { useFitScore } from "~/composables/useFitScore";
import { useDivisionRecommendations } from "~/composables/useDivisionRecommendations";
import { useCollegeData } from "~/composables/useCollegeData";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useUserStore } from "~/stores/user";
import { useSchoolBasicInfo } from "~/composables/useSchoolBasicInfo";
import { useSchoolProsCons } from "~/composables/useSchoolProsCons";
import { useSchoolStatusManagement } from "~/composables/useSchoolStatusManagement";
import { useLiveRegion } from "~/composables/useLiveRegion";
import { useDeleteModal } from "~/composables/useDeleteModal";
import { usePrivateNotes } from "~/composables/usePrivateNotes";
import { useSingleSchoolDistance } from "~/composables/useSchoolDistance";
import { createUpdateHandler } from "~/utils/updateHandler";
import { getCarnegieSize } from "~/utils/schoolSize";
import type { Document, AcademicInfo } from "~/types/models";
import type { FitScoreResult, DivisionRecommendation } from "~/types/timeline";
import type { School } from "~/types/models";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import SchoolDetailHeader from "~/components/School/SchoolDetailHeader.vue";
import DivisionRecommendationCard from "~/components/School/DivisionRecommendationCard.vue";
import SchoolInformationCard from "~/components/School/SchoolInformationCard.vue";
import SchoolDocumentsCard from "~/components/School/SchoolDocumentsCard.vue";
import SchoolStatusHistory from "~/components/School/SchoolStatusHistory.vue";
import SchoolNotesCard from "~/components/School/SchoolNotesCard.vue";
import SchoolProsConsCard from "~/components/School/SchoolProsConsCard.vue";
import SchoolCoachingPhilosophy from "~/components/School/CoachingPhilosophy.vue";
import SchoolSidebar from "~/components/School/SchoolSidebar.vue";
import EmailSendModal from "~/components/EmailSendModal.vue";
import FitScoreDisplay from "~/components/FitScore/FitScoreDisplay.vue";
import DesignSystemConfirmDialog from "~/components/DesignSystem/ConfirmDialog.vue";

definePageMeta({});

const route = useRoute();
const id = route.params.id as string;
const userStore = useUserStore();

// Core composables
const { getSchool, updateSchool, smartDelete, loading } = useSchools();
const { coaches: allCoaches, fetchCoaches } = useCoaches();
const { documents, fetchDocuments } = useDocumentsConsolidated();
const { calculateSchoolFitScore, getFitScore } = useFitScore();
const {
  fetchByName,
  loading: collegeDataLoading,
  error: collegeDataError,
} = useCollegeData();
const { getHomeLocation } = usePreferenceManager();
const { announcement, announce, liveRegionAttrs } = useLiveRegion();

// Feature composables
const {
  editingBasicInfo,
  editedBasicInfo,
  initializeForm,
  saveBasicInfo,
  cancelEdit,
  startEdit,
} = useSchoolBasicInfo(id);

const { addPro, removePro, addCon, removeCon } = useSchoolProsCons(id);

const { statusUpdating, updateStatus, updatePriority, toggleFavorite } =
  useSchoolStatusManagement(id);

// State
const school = ref<School | null>(null);
const fitScore = ref<FitScoreResult | null>(null);
const divisionRecommendation = ref<DivisionRecommendation | null>(null);
const showEmailModal = ref(false);

// Delete modal management
const {
  isOpen: isDeleteDialogOpen,
  isDeleting: deleteInProgress,
  open: openDeleteDialog,
  close: closeDeleteDialog,
  confirm: confirmDelete,
} = useDeleteModal(smartDelete);

// Computed
const schoolCoaches = computed(() => allCoaches.value);
const schoolDocuments = computed(() =>
  documents.value.filter((doc: Document) =>
    (doc.shared_with_schools as string[] | undefined)?.includes(id),
  ),
);
const calculatedSize = computed(() =>
  getCarnegieSize(
    school.value?.academic_info?.student_size as number | null | undefined,
  ),
);
// Distance calculation using composable
const calculatedDistanceFromHome = useSingleSchoolDistance(school);

// Private notes using composable
const myPrivateNote = usePrivateNotes(school);

// Handlers - Status Management (using createUpdateHandler utility)
const handleStatusUpdate = createUpdateHandler(school, updateStatus);
const handlePriorityUpdate = createUpdateHandler(school, updatePriority);
const handleToggleFavorite = async () => {
  if (!school.value) return;
  const updated = await toggleFavorite(school.value);
  if (updated) school.value = updated;
};

// Handlers - Basic Info
const handleToggleEdit = () => {
  if (editingBasicInfo.value) {
    cancelEdit();
  } else {
    startEdit();
  }
};

const handleSaveBasicInfo = async () => {
  if (!school.value) return;
  const updated = await saveBasicInfo(school.value);
  if (updated) {
    school.value = updated;
  }
};

// Handlers - Notes (using createUpdateHandler utility)
const handleUpdateNotes = createUpdateHandler(
  school,
  async (notesValue: string) => {
    return await updateSchool(id, { notes: notesValue });
  },
);

const handleUpdatePrivateNotes = createUpdateHandler(
  school,
  async (privateNotesValue: string) => {
    if (!school.value || !userStore.user) return null;
    return await updateSchool(id, {
      private_notes: {
        ...(school.value.private_notes || {}),
        [userStore.user.id]: privateNotesValue,
      },
    });
  },
);

// Handlers - Pros/Cons (using createUpdateHandler utility)
const handleAddPro = createUpdateHandler(school, async (proValue: string) => {
  if (!school.value) return null;
  return await addPro(school.value, proValue);
});

const handleRemovePro = createUpdateHandler(school, async (index: number) => {
  if (!school.value) return null;
  return await removePro(school.value, index);
});

const handleAddCon = createUpdateHandler(school, async (conValue: string) => {
  if (!school.value) return null;
  return await addCon(school.value, conValue);
});

const handleRemoveCon = createUpdateHandler(school, async (index: number) => {
  if (!school.value) return null;
  return await removeCon(school.value, index);
});

// Handlers - Other
const updateCoachingPhilosophy = createUpdateHandler(
  school,
  async (data: Partial<School>) => {
    return await updateSchool(id, data);
  },
);

// Delete handlers
const openDeleteConfirm = () => {
  openDeleteDialog();
};

const executeDelete = async () => {
  try {
    await confirmDelete(id, async () => {
      closeDeleteDialog();
      announce("School and related records deleted");
      await navigateTo("/schools");
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Failed to delete school. Please try again.";
    announce(errorMessage);
    console.error("Failed to delete school:", err);
  }
};

const handleDocumentUploadSuccess = async () => {
  await fetchDocuments();
};

const loadFitScore = async () => {
  if (!school.value) return;
  try {
    const { getRecommendedDivisions } = useDivisionRecommendations();

    const cachedScore = getFitScore(id);
    if (cachedScore) {
      fitScore.value = cachedScore;
    } else {
      const studentSize = school.value.academic_info?.student_size;
      const numericSize =
        typeof studentSize === "number" ? studentSize : undefined;
      fitScore.value = await calculateSchoolFitScore(id, undefined, {
        campusSize: numericSize,
        avgGpa: school.value.academic_info?.gpa_requirement ?? undefined,
        offeredMajors: [],
      });
    }

    if (fitScore.value) {
      divisionRecommendation.value = getRecommendedDivisions(
        school.value.division,
        fitScore.value.score,
      );
    }
  } catch (err) {
    console.error("Failed to load fit score:", err);
  }
};

const lookupCollegeData = async () => {
  if (!school.value) return;
  const result = await fetchByName(school.value.name);
  if (result) {
    const updates = {
      website: result.website || school.value.website,
      academic_info: {
        ...(school.value.academic_info || {}),
        address: result.address || school.value.academic_info?.address,
        city: result.city || school.value.academic_info?.city,
        state: result.state || school.value.academic_info?.state,
        student_size: String(result.studentSize || ""),
        carnegie_size: result.carnegieSize,
        enrollment_all: result.enrollmentAll,
        admission_rate: result.admissionRate,
        tuition_in_state: result.tuitionInState,
        tuition_out_of_state: result.tuitionOutOfState,
        latitude: result.latitude,
        longitude: result.longitude,
      } as unknown as AcademicInfo,
    };
    const updated = await updateSchool(id, updates);
    if (updated) {
      school.value = updated;
      editedBasicInfo.value.address = String(
        updated.academic_info?.address || "",
      );
      editedBasicInfo.value.website = String(updated.website || "");
    }
  }
};

onMounted(async () => {
  school.value = await getSchool(id);
  if (school.value) {
    initializeForm(school.value);
    await fetchCoaches(id);
    await fetchDocuments();
    await loadFitScore();
  }
});
</script>
