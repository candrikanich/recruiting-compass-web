<template>
  <FormPageLayout
    back-to="/schools"
    back-text="Back to Schools"
    title="Add New School"
    description="Add a school to your recruiting list"
    header-color="blue"
  >
    <!-- Toggle: Autocomplete vs Manual -->
    <div class="mb-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
      <label class="group flex cursor-pointer items-center gap-3">
        <input
          v-model="useAutocomplete"
          type="checkbox"
          class="h-5 w-5 rounded-sm border-2 border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
        />
        <span
          class="font-medium text-slate-700 transition-colors group-hover:text-blue-600"
          >Search college database</span
        >
      </label>
    </div>

    <!-- Selected College Confirmation -->
    <div
      v-if="selectedCollege"
      class="mb-6 rounded-xl border-2 border-green-200 bg-green-50 p-4"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <p class="text-sm text-green-800">
            <strong>Selected:</strong> {{ selectedCollege.name }}
          </p>
          <p class="mt-1 text-xs text-green-700">
            {{ selectedCollege.location }}
          </p>
          <div v-if="collegeDataLoading" class="mt-2 text-xs text-blue-600">
            Fetching college data...
          </div>
          <div
            v-else-if="collegeScorecardFetched"
            class="mt-2 flex items-center gap-1 text-xs text-green-700"
          >
            <UIcon name="i-heroicons-check-solid" class="h-3 w-3" />
            <span>College data and map coordinates loaded</span>
          </div>
        </div>
        <div v-if="schoolLogo" class="shrink-0">
          <img
            :src="schoolLogo"
            :alt="`${selectedCollege.name} logo`"
            class="h-10 w-10 object-contain"
            loading="lazy"
          />
        </div>
        <button
          type="button"
          @click="clearSelection"
          class="shrink-0 text-xs font-medium text-green-600 hover:text-green-700 hover:underline"
        >
          Clear
        </button>
      </div>
      <div v-if="collegeDataError" class="mt-3 text-xs text-red-600">
        {{ collegeDataError }}
      </div>
    </div>

    <!-- School Form with Validation -->
    <SchoolForm
      :loading="loading"
      :useAutocomplete="useAutocomplete"
      :collegeScorecardData="collegeScorecardData"
      :initialData="{
        name: selectedCollege?.name || '',
        location: selectedCollege?.location || '',
        website: selectedCollege?.website || '',
        division: selectedCollege?.division || '',
        conference: selectedCollege?.conference || '',
      }"
      :initialAutoFilledFields="autoFilledFields"
      @submit="handleSchoolFormSubmit"
      @collegeSelect="handleCollegeSelect"
      @cancel="() => navigateTo('/schools')"
    />

    <SchoolDuplicateDialog
      v-if="duplicateSchool"
      :is-open="showDuplicateDialog"
      :duplicate="duplicateSchool"
      :match-type="duplicateMatchType"
      @confirm="confirmDuplicateCreate"
      @cancel="cancelDuplicateCreate"
    />
  </FormPageLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

import { ref, reactive, onMounted } from "vue";
import { useSchools } from "~/composables/useSchools";
import { useNcaaLookup } from "~/composables/useNcaaLookup";
import {
  useCollegeData,
  type CollegeDataResult,
} from "~/composables/useCollegeData";
import type { CollegeSearchResult } from "~/types/api";
import type { School } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("SchoolNew");

const { createSchool, findDuplicate, fetchSchools, loading, error } =
  useSchools();

// The duplicate gate matches against the in-memory school list, so it must be
// loaded before the first add attempt or a genuine duplicate slips through.
onMounted(() => {
  fetchSchools().catch((err) => {
    logger.warn("Failed to preload schools for duplicate check", err);
  });
});
const { lookupDivision } = useNcaaLookup();
const {
  fetchByName,
  loading: collegeDataLoading,
  error: collegeDataError,
} = useCollegeData();

const useAutocomplete = ref(true);
const selectedCollege = ref<CollegeSearchResult | null>(null);
const schoolLogo = ref<string | null>(null);
const collegeScorecardData = ref<CollegeDataResult | null>(null);
const collegeScorecardFetched = ref(false);
const autoFilledFields = reactive({
  name: false,
  location: false,
  website: false,
  division: false,
  conference: false,
});

import { getSchoolLogo } from "~/utils/school-logo";

const handleCollegeSelect = async (college: CollegeSearchResult) => {
  selectedCollege.value = college;

  autoFilledFields.name = true;
  autoFilledFields.location = !!college.location;
  autoFilledFields.website = !!college.website;

  // Fetch all data in parallel: NCAA lookup + College Scorecard
  const [ncaaResult, scorecardResult] = await Promise.all([
    // NCAA lookup for division, conference, logo
    // Pass the ID (UnitID) for 100% accuracy if it's in our metadata
    lookupDivision(college.name, college.id).catch((err) => {
      logger.debug("NCAA lookup failed", { collegeName: college.name, err });
      return null;
    }),
    // College Scorecard for academic data + lat/lng
    fetchByName(college.name).catch((err) => {
      logger.debug("College Scorecard lookup failed", {
        collegeName: college.name,
        err,
      });
      return null;
    }),
  ]);

  // Apply NCAA data - update selectedCollege to include division and conference
  if (ncaaResult) {
    // Extend selectedCollege with NCAA data so it flows to initialData
    selectedCollege.value = {
      ...selectedCollege.value,
      division: ncaaResult.division,
      conference: ncaaResult.conference,
    };

    autoFilledFields.division = true;
    autoFilledFields.conference = !!ncaaResult.conference;

    // Set logo from NCAA lookup result or fallback to our utility
    schoolLogo.value =
      ncaaResult.logo || getSchoolLogo(college.name, college.website);
  } else {
    // Fallback logo if no NCAA record found
    schoolLogo.value = getSchoolLogo(college.name, college.website);
  }

  // Apply College Scorecard data (includes lat/lng for map)
  if (scorecardResult) {
    collegeScorecardData.value = scorecardResult;
    collegeScorecardFetched.value = true;

    // Update website if scorecard has a better one
    if (scorecardResult.website && !selectedCollege.value.website) {
      selectedCollege.value.website = scorecardResult.website;
      autoFilledFields.website = true;
      // Re-run logo utility with website if we didn't have it before
      if (!schoolLogo.value || schoolLogo.value.includes("ui-avatars")) {
        schoolLogo.value = getSchoolLogo(college.name, scorecardResult.website);
      }
    }
  }
};

const clearSelection = () => {
  selectedCollege.value = null;
  schoolLogo.value = null;
  collegeScorecardData.value = null;
  collegeScorecardFetched.value = false;
  autoFilledFields.name = false;
  autoFilledFields.location = false;
  autoFilledFields.website = false;
  autoFilledFields.division = false;
  autoFilledFields.conference = false;
};

// Duplicate-confirmation dialog state
const showDuplicateDialog = ref(false);
const duplicateSchool = ref<School | null>(null);
const duplicateMatchType = ref<"name" | "domain" | "ncaa_id" | null>(null);
const pendingFormData = ref<any>(null);

const handleSchoolFormSubmit = async (formData: any) => {
  const { duplicate, matchType } = findDuplicate(formData);
  if (duplicate) {
    // Hold the submission and let the user confirm this is a distinct program.
    duplicateSchool.value = duplicate;
    duplicateMatchType.value = matchType;
    pendingFormData.value = formData;
    showDuplicateDialog.value = true;
    return;
  }
  await createSchoolWithData(formData);
};

const confirmDuplicateCreate = async () => {
  showDuplicateDialog.value = false;
  const formData = pendingFormData.value;
  pendingFormData.value = null;
  if (formData) {
    await createSchoolWithData(formData);
  }
};

const cancelDuplicateCreate = () => {
  showDuplicateDialog.value = false;
  duplicateSchool.value = null;
  duplicateMatchType.value = null;
  pendingFormData.value = null;
};

const createSchoolWithData = async (formData: any) => {
  try {
    const academic_info = collegeScorecardData.value
      ? {
          student_size: collegeScorecardData.value.studentSize,
          carnegie_size: collegeScorecardData.value.carnegieSize,
          enrollment_all: collegeScorecardData.value.enrollmentAll,
          admission_rate: collegeScorecardData.value.admissionRate,
          tuition_in_state: collegeScorecardData.value.tuitionInState,
          tuition_out_of_state: collegeScorecardData.value.tuitionOutOfState,
          latitude: collegeScorecardData.value.latitude,
          longitude: collegeScorecardData.value.longitude,
        }
      : {};

    const school = await createSchool({
      ...formData,
      academic_info,
      favicon_url: null,
      is_favorite: false,
      user_id: "",
    });

    if (school) {
      await navigateTo(`/schools/${school.id}`);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create school";
    logger.error("Failed to create school", message);
  }
};
</script>
