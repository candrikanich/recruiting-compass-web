<template>
  <div class="min-h-screen bg-slate-50">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-6">
        <NuxtLink
          to="/schools"
          class="text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          ← Back to Schools
        </NuxtLink>
      </div>

      <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
        <!-- Gradient Header -->
        <div
          class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-6"
        >
          <h1 class="text-2xl font-bold mb-1">Add New School</h1>
          <p class="text-blue-100 text-sm">
            Add a school to your recruiting list
          </p>
        </div>

        <div class="p-8">
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
                <div
                  v-if="collegeDataLoading"
                  class="mt-2 text-xs text-blue-600"
                >
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

          <!-- School Name with Autocomplete Toggle -->
          <div class="mb-6">
            <label
              for="name"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              School Name <span class="text-red-600">*</span>
              <span
                v-if="autoFilledFields.name"
                class="text-xs text-blue-600 font-normal"
                >(auto-filled)</span
              >
            </label>
            <div v-if="useAutocomplete" class="mb-4">
              <SchoolAutocomplete
                @select="handleCollegeSelect"
                :disabled="loading"
              />
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
            }"
            :initialAutoFilledFields="autoFilledFields"
            @submit="handleSchoolFormSubmit"
            @collegeSelect="handleCollegeSelect"
            @cancel="() => navigateTo('/schools')"
          />

          <!-- Duplicate School Dialog -->
          <DuplicateSchoolDialog
            :isOpen="isDuplicateDialogOpen"
            :duplicate="duplicateSchool!"
            :matchType="duplicateMatchType"
            @confirm="proceedWithDuplicate"
            @cancel="closeDuplicateDialog"
          />

          <!-- College Scorecard Data (Display Only) -->
          <div
            v-if="collegeScorecardData"
            class="border-t border-slate-200 pt-6 mt-6"
          >
            <h3 class="text-sm font-semibold text-slate-900 mb-4">
              College Scorecard Data
            </h3>
            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl text-sm"
            >
              <div v-if="collegeScorecardData.studentSize">
                <p class="text-slate-600">Student Size</p>
                <p class="font-semibold text-slate-900">
                  {{ collegeScorecardData.studentSize.toLocaleString() }}
                </p>
              </div>
              <div v-if="collegeScorecardData.carnegieSize">
                <p class="text-slate-600">Size Category</p>
                <p class="font-semibold text-slate-900">
                  {{ collegeScorecardData.carnegieSize }}
                </p>
              </div>
              <div v-if="collegeScorecardData.enrollmentAll">
                <p class="text-slate-600">Total Enrollment</p>
                <p class="font-semibold text-slate-900">
                  {{ collegeScorecardData.enrollmentAll.toLocaleString() }}
                </p>
              </div>
              <div v-if="collegeScorecardData.admissionRate">
                <p class="text-slate-600">Admission Rate</p>
                <p class="font-semibold text-slate-900">
                  {{ (collegeScorecardData.admissionRate * 100).toFixed(1) }}%
                </p>
              </div>
              <div v-if="collegeScorecardData.studentFacultyRatio">
                <p class="text-slate-600">Student-Faculty Ratio</p>
                <p class="font-semibold text-slate-900">
                  {{ collegeScorecardData.studentFacultyRatio }}:1
                </p>
              </div>
              <div v-if="collegeScorecardData.tuitionInState">
                <p class="text-slate-600">Tuition (In-State)</p>
                <p class="font-semibold text-slate-900">
                  ${{ collegeScorecardData.tuitionInState.toLocaleString() }}
                </p>
              </div>
              <div v-if="collegeScorecardData.tuitionOutOfState">
                <p class="text-slate-600">Tuition (Out-of-State)</p>
                <p class="font-semibold text-slate-900">
                  ${{ collegeScorecardData.tuitionOutOfState.toLocaleString() }}
                </p>
              </div>
              <div
                v-if="
                  collegeScorecardData.latitude &&
                  collegeScorecardData.longitude
                "
              >
                <p class="text-slate-600">Location</p>
                <p class="font-semibold text-green-700">
                  Map coordinates available
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { CheckIcon } from "@heroicons/vue/24/solid";
import { useSchools } from "~/composables/useSchools";
import { useSchoolDuplication } from "~/composables/useSchoolDuplication";
import { useNcaaLookup } from "~/composables/useNcaaLookup";
import {
  useCollegeData,
  type CollegeDataResult,
} from "~/composables/useCollegeData";
import type { CollegeSearchResult } from "~/types/api";
import type { School } from "~/types/models";

definePageMeta({});

const { createSchool, loading, error } = useSchools();
const { findDuplicate } = useSchoolDuplication();
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

// Duplicate dialog state
const isDuplicateDialogOpen = ref(false);
const duplicateSchool = ref<School | null>(null);
const duplicateMatchType = ref<"name" | "domain" | "ncaa_id" | null>(null);
const pendingSchoolData = ref<any>(null);

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

  // Apply NCAA data
  if (ncaaResult) {
    autoFilledFields.division = true;

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
  // Check for duplicates
  const { duplicate, matchType } = findDuplicate(formData);

  if (duplicate) {
    duplicateSchool.value = duplicate;
    duplicateMatchType.value = matchType;
    pendingSchoolData.value = formData;
    isDuplicateDialogOpen.value = true;
    return;
  }

  // No duplicate found, proceed with creation
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

const proceedWithDuplicate = async () => {
  closeDuplicateDialog();
  await createSchoolWithData(pendingSchoolData.value);
};

const closeDuplicateDialog = () => {
  isDuplicateDialogOpen.value = false;
  duplicateSchool.value = null;
  duplicateMatchType.value = null;
  pendingSchoolData.value = null;
};
</script>
