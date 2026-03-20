<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/schools"
          class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm"
        >
          <ArrowLeftIcon class="w-4 h-4" aria-hidden="true" />
          Back to Schools
        </NuxtLink>
      </div>
    </div>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <!-- Loading State -->
      <div
        v-if="isInitializing || loading"
        class="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center"
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
            @toggle-favorite="handleToggleFavorite"
          />

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
            :school-id="id"
            :is-saving="loading"
            @update:notes="handleUpdateNotes"
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
            @confirmed="handleEmailConfirmed"
          />

          <!-- Enrich Match Chooser -->
          <div
            v-if="showEnrichModal && enrichMatches.length > 1"
            class="bg-white rounded-xl border border-amber-200 shadow-xs p-6"
          >
            <h3 class="font-semibold text-slate-900 mb-2">
              Select the Correct School
            </h3>
            <p class="text-sm text-slate-600 mb-4">
              Multiple schools matched. Choose the correct one to import
              academic data.
            </p>
            <div class="space-y-2">
              <button
                v-for="match in enrichMatches"
                :key="match.scorecardId"
                class="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-sm"
                @click="confirmEnrich(match.scorecardId)"
              >
                <span class="font-medium text-slate-900">{{ match.name }}</span>
                <span class="text-slate-500 ml-2">
                  {{ match.city }}, {{ match.state }}
                </span>
              </button>
            </div>
            <button
              class="mt-3 text-sm text-slate-500 hover:text-slate-700"
              @click="showEnrichModal = false"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Sidebar - Right Column -->
        <SchoolSidebar
          :school-id="id"
          :coaches="schoolCoaches"
          :school="school"
          :personal-fit="fitSignals?.personalFit ?? null"
          :academic-fit="fitSignals?.academicFit ?? null"
          :division-recommendation="divisionRecommendation"
          @open-email-modal="showEmailModal = true"
          @delete="openDeleteConfirm"
          @enrich="handleEnrich"
        />
      </div>

      <!-- Not Found -->
      <div
        v-else
        class="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center"
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
import { ref, onMounted, computed, watch, defineAsyncComponent } from "vue";
import { useRoute } from "vue-router";
import { navigateTo } from "#app";
import { useSchools } from "~/composables/useSchools";
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import { useCoaches } from "~/composables/useCoaches";
import { useDocumentsConsolidated } from "~/composables/useDocumentsConsolidated";
import { useFitScore } from "~/composables/useFitScore";
import { useDivisionRecommendations } from "~/composables/useDivisionRecommendations";
import { useCollegeData } from "~/composables/useCollegeData";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useAppToast } from "~/composables/useAppToast";
import { useUserStore } from "~/stores/user";
import { useSchoolBasicInfo } from "~/composables/useSchoolBasicInfo";
import { useSchoolProsCons } from "~/composables/useSchoolProsCons";
import { useSchoolStatusManagement } from "~/composables/useSchoolStatusManagement";
import { useLiveRegion } from "~/composables/useLiveRegion";
import { useDeleteModal } from "~/composables/useDeleteModal";
import { useSingleSchoolDistance } from "~/composables/useSchoolDistance";
import { createUpdateHandler } from "~/utils/updateHandler";
import { getCarnegieSize } from "~/utils/schoolSize";
import type { Document, AcademicInfo } from "~/types/models";
import type { DivisionRecommendation } from "~/types/timeline";
import type {
  SchoolFitSignals,
  SchoolAcademicInfo,
  AthleteProfileForFit,
} from "~/types/schoolFit";
import type { School } from "~/types/models";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import SchoolDetailHeader from "~/components/School/SchoolDetailHeader.vue";
import DivisionRecommendationCard from "~/components/School/DivisionRecommendationCard.vue";
import SchoolInformationCard from "~/components/School/SchoolInformationCard.vue";
import SchoolDocumentsCard from "~/components/School/SchoolDocumentsCard.vue";
import SchoolNotesCard from "~/components/School/SchoolNotesCard.vue";
import SchoolProsConsCard from "~/components/School/SchoolProsConsCard.vue";
import SchoolCoachingPhilosophy from "~/components/School/CoachingPhilosophy.vue";
import SchoolSidebar from "~/components/School/SchoolSidebar.vue";
const EmailSendModal = defineAsyncComponent(
  () => import("~/components/EmailSendModal.vue"),
);
import DesignSystemConfirmDialog from "~/components/DesignSystem/ConfirmDialog.vue";



const route = useRoute();
const id = route.params.id as string;
const userStore = useUserStore();

// Core composables
const { getSchool, updateSchool, smartDelete, loading } = useSchools();
const { coaches: allCoaches, fetchCoaches } = useCoaches();
const { documents, fetchDocuments } = useDocumentsConsolidated();
const { calculateSignals, invalidate } = useFitScore();
const { createInteraction } = useInteractions();
const {
  fetchByName,
  loading: collegeDataLoading,
  error: collegeDataError,
} = useCollegeData();
const { getPlayerDetails, getHomeLocation, loadAllPreferences } = usePreferenceManager();
const { $fetchAuth } = useAuthFetch();
const { showToast } = useAppToast();
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

const { statusUpdating, updateStatus, toggleFavorite } =
  useSchoolStatusManagement(id);

const { activeFamilyId } = useFamilyCtx();

// State
const school = ref<School | null>(null);
const isInitializing = ref(true);
const divisionRecommendation = ref<DivisionRecommendation | null>(null);
const showEmailModal = ref(false);
const enrichMatches = ref<
  Array<{ scorecardId: number; name: string; state: string; city: string }>
>([]);
const showEnrichModal = ref(false);

// Delete modal management
const {
  isOpen: isDeleteDialogOpen,
  isDeleting: deleteInProgress,
  open: openDeleteDialog,
  close: closeDeleteDialog,
  confirm: confirmDelete,
} = useDeleteModal(smartDelete);

// Computed — fit signals
const athleteProfile = computed<AthleteProfileForFit>(() => {
  const player = getPlayerDetails();
  return {
    school_state: player?.school_state ?? null,
    gpa: player?.gpa ?? null,
    sat_score: player?.sat_score ?? null,
    act_score: player?.act_score ?? null,
    campus_size_preference: null,
    cost_sensitivity: null,
  };
});

const schoolAcademicInfo = computed<SchoolAcademicInfo>(() => {
  const info = school.value?.academic_info;
  return (typeof info === "object" && info !== null ? info : {}) as SchoolAcademicInfo;
});

const fitSignals = computed<SchoolFitSignals | null>(() => {
  if (!school.value) return null;
  return calculateSignals(id, athleteProfile.value, schoolAcademicInfo.value);
});

// Computed — school data
const schoolCoaches = computed(() =>
  allCoaches.value.filter((c) => c.school_id === id),
);
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
const calculatedDistanceFromHome = useSingleSchoolDistance(school, getHomeLocation);

// Handlers - Status Management (using createUpdateHandler utility)
const handleStatusUpdate = createUpdateHandler(school, updateStatus);
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

// Handlers - Email
const handleEmailConfirmed = async () => {
  if (!school.value) return;

  try {
    const coachId =
      schoolCoaches.value.length > 0 ? schoolCoaches.value[0].id : null;
    const subject = `Contact from ${school.value.name || "Recruiting Compass"}`;
    const body = `Hello,\n\nI am reaching out regarding recruitment opportunities at ${school.value.name || "your school"}.\n\nBest regards`;

    await createInteraction(
      {
        school_id: id,
        coach_id: coachId,
        event_id: null,
        type: "email",
        direction: "outbound",
        subject,
        content: body,
        sentiment: null,
        occurred_at: new Date().toISOString(),
        logged_by: "",
        attachments: [],
      },
      undefined,
    );

    announce("Email interaction logged successfully");
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to log email interaction:", errorMsg);
    announce(`Failed to log interaction: ${errorMsg}`);
  }
};

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

// Enrich handlers
async function handleEnrich() {
  if (!school.value) return;
  showToast("Looking up academic data...", "info");
  try {
    const result = await $fetchAuth<{
      success: boolean;
      data: {
        matches: Array<{
          scorecardId: number;
          name: string;
          state: string;
          city: string;
        }>;
      };
    }>(`/api/schools/${id}/enrich`, {
      method: "POST",
      body: { schoolName: school.value.name },
    });

    if (result?.data?.matches?.length === 1) {
      await confirmEnrich(result.data.matches[0].scorecardId);
    } else if ((result?.data?.matches?.length ?? 0) > 1) {
      enrichMatches.value = result.data.matches;
      showEnrichModal.value = true;
    } else {
      showToast("No matching schools found in College Scorecard", "error");
    }
  } catch {
    showToast("Failed to search College Scorecard", "error");
  }
}

async function confirmEnrich(scorecardId: number) {
  try {
    await $fetchAuth(`/api/schools/${id}/enrich`, {
      method: "POST",
      body: { scorecardId, confirmed: true },
    });
    showEnrichModal.value = false;
    school.value = await getSchool(id);
    invalidate(id);
    showToast("Academic data updated from College Scorecard", "success");
  } catch {
    showToast("Failed to save academic data", "error");
  }
}

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
        student_size: result.studentSize || null,
        carnegie_size: result.carnegieSize,
        enrollment_all: result.enrollmentAll,
        admission_rate: result.admissionRate,
        tuition_in_state: result.tuitionInState,
        tuition_out_of_state: result.tuitionOutOfState,
        avg_net_price: result.avgNetPrice,
        graduation_rate: result.graduationRate,
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

const loadPageData = async () => {
  const { getRecommendedDivisions } = useDivisionRecommendations();
  await loadAllPreferences();
  school.value = await getSchool(id);
  if (school.value) {
    initializeForm(school.value);
    await fetchCoaches(id);
    await fetchDocuments();
    divisionRecommendation.value = getRecommendedDivisions(
      school.value.division,
      null,
    );
  }
  isInitializing.value = false;
};

onMounted(() => {
  if (activeFamilyId.value) {
    loadPageData();
  } else {
    // Family context not ready yet (e.g. hard refresh) — wait for it
    const stop = watch(activeFamilyId, (familyId) => {
      if (familyId) {
        stop();
        loadPageData();
      }
    });
  }
});
</script>
