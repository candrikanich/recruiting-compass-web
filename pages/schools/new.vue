<template>
  <FormPageLayout
    back-to="/schools"
    back-text="Back to Schools"
    title="Add New School"
    description="Add a school to your recruiting list"
    header-color="blue"
  >
    <!-- Toggle: Autocomplete vs Manual -->
    <div class="mb-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
      <label class="flex items-center gap-3 cursor-pointer group">
        <input
          v-model="useAutocomplete"
          type="checkbox"
          class="w-5 h-5 text-blue-600 border-2 border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
        />
        <span
          class="text-slate-700 font-medium group-hover:text-blue-600 transition-colors"
          >Search college database</span
        >
      </label>
    </div>

    <!-- Selected College Confirmation -->
    <div
      v-if="selectedCollege"
      class="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl"
    >
      <div class="flex justify-between items-start gap-4">
        <div class="flex-1">
          <p class="text-sm text-green-800">
            <strong>Selected:</strong> {{ selectedCollege.name }}
          </p>
          <p class="text-xs text-green-700 mt-1">
            {{ selectedCollege.location }}
          </p>
          <div v-if="collegeDataLoading" class="mt-2 text-xs text-blue-600">
            Fetching college data...
          </div>
          <div
            v-else-if="collegeScorecardFetched"
            class="mt-2 text-xs text-green-700 flex items-center gap-1"
          >
            <CheckIcon class="w-3 h-3" />
            <span>College data and map coordinates loaded</span>
          </div>
        </div>
        <div v-if="schoolLogo" class="flex-shrink-0">
          <img
            :src="schoolLogo"
            :alt="`${selectedCollege.name} logo`"
            class="h-10 w-10 object-contain"
          />
        </div>
        <button
          type="button"
          @click="clearSelection"
          class="flex-shrink-0 text-xs text-green-600 hover:text-green-700 font-medium hover:underline"
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
  </FormPageLayout>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { CheckIcon } from "@heroicons/vue/24/solid";
import { useSchools } from "~/composables/useSchools";
import { useNcaaLookup } from "~/composables/useNcaaLookup";
import {
  useCollegeData,
  type CollegeDataResult,
} from "~/composables/useCollegeData";
import type { CollegeSearchResult } from "~/types/api";
import type { School } from "~/types/models";

definePageMeta({});

const { createSchool, loading, error } = useSchools();
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

const handleCollegeSelect = async (college: CollegeSearchResult) => {
  selectedCollege.value = college;

  autoFilledFields.name = true;
  autoFilledFields.location = !!college.location;
  autoFilledFields.website = !!college.website;

  // Fetch all data in parallel: NCAA lookup + College Scorecard
  const [ncaaResult, scorecardResult] = await Promise.all([
    // NCAA lookup for division, conference, logo
    lookupDivision(college.name).catch((err) => {
      console.debug("NCAA lookup failed for:", college.name, err);
      return null;
    }),
    // College Scorecard for academic data + lat/lng
    fetchByName(college.name).catch((err) => {
      console.debug("College Scorecard lookup failed for:", college.name, err);
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

    if (ncaaResult.logo) {
      schoolLogo.value = ncaaResult.logo;
    }
  }

  // Apply College Scorecard data (includes lat/lng for map)
  if (scorecardResult) {
    collegeScorecardData.value = scorecardResult;
    collegeScorecardFetched.value = true;
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

const handleSchoolFormSubmit = async (formData: any) => {
  await createSchoolWithData(formData);
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
    console.error("Failed to create school:", message);
  }
};
</script>
