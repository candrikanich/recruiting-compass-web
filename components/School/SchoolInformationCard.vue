<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-slate-900">Information</h2>
      <div class="flex gap-2">
        <button
          v-if="!editingBasicInfo"
          @click="$emit('lookup-data')"
          :disabled="collegeDataLoading"
          class="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-1 disabled:opacity-50"
        >
          <MapPinIcon class="w-4 h-4" />
          {{ collegeDataLoading ? "Looking up..." : "Lookup" }}
        </button>
        <button
          @click="toggleEdit"
          class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition"
        >
          {{ editingBasicInfo ? "Cancel" : "Edit" }}
        </button>
      </div>
    </div>

    <div
      v-if="collegeDataError"
      class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm"
    >
      {{ collegeDataError }}
    </div>

    <!-- Map -->
    <div class="mb-4">
      <SchoolMap
        :latitude="school?.academic_info?.latitude as number | null | undefined"
        :longitude="
          school?.academic_info?.longitude as number | null | undefined
        "
        :school-name="school?.name"
      />
    </div>

    <!-- Distance from Home -->
    <div
      v-if="calculatedDistance"
      class="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200"
    >
      Distance from Home: <strong>{{ calculatedDistance }}</strong>
    </div>

    <!-- Edit Form -->
    <div v-if="editingBasicInfo" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Campus Address</label
          >
          <input
            v-model="editedBasicInfo.address"
            type="text"
            placeholder="Main campus address..."
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Baseball Facility</label
          >
          <input
            v-model="editedBasicInfo.baseball_facility_address"
            type="text"
            placeholder="Stadium address..."
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Mascot</label
          >
          <input
            v-model="editedBasicInfo.mascot"
            type="text"
            placeholder="School mascot..."
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Undergraduate Size</label
          >
          <input
            v-model="editedBasicInfo.undergrad_size"
            type="text"
            placeholder="e.g., 5,000-8,000..."
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Website</label
          >
          <input
            v-model="editedBasicInfo.website"
            type="url"
            placeholder="https://..."
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1"
            >Twitter Handle</label
          >
          <input
            v-model="editedBasicInfo.twitter_handle"
            type="text"
            placeholder="@handle..."
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <button
        @click="handleSave"
        :disabled="isSaving"
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
      >
        {{ isSaving ? "Saving..." : "Save Information" }}
      </button>
    </div>

    <!-- Display Info -->
    <div v-else class="space-y-4">
      <!-- School Information -->
      <div v-if="hasSchoolInfo(school)" class="space-y-3">
        <h4 class="font-medium text-slate-900">School Information</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-if="school.academic_info?.address"
            class="p-3 bg-slate-50 rounded-lg"
          >
            <p class="text-xs text-slate-600 mb-1 flex items-center gap-1">
              <MapPinIcon class="w-3.5 h-3.5" />
              Campus Address
            </p>
            <p class="text-sm font-medium text-slate-900">
              {{ school.academic_info.address }}
            </p>
          </div>
          <div
            v-if="school.academic_info?.baseball_facility_address"
            class="p-3 bg-slate-50 rounded-lg"
          >
            <p class="text-xs text-slate-600 mb-1">Baseball Facility</p>
            <p class="text-sm font-medium text-slate-900">
              {{ school.academic_info.baseball_facility_address }}
            </p>
          </div>
          <div
            v-if="school.academic_info?.mascot"
            class="p-3 bg-slate-50 rounded-lg"
          >
            <p class="text-xs text-slate-600 mb-1">Mascot</p>
            <p class="text-sm font-medium text-slate-900">
              {{ school.academic_info.mascot }}
            </p>
          </div>
          <div
            v-if="school.academic_info?.undergrad_size"
            class="p-3 bg-slate-50 rounded-lg"
          >
            <p class="text-xs text-slate-600 mb-1">Undergraduate Size</p>
            <p class="text-sm font-medium text-slate-900">
              {{ school.academic_info.undergrad_size }}
            </p>
          </div>
        </div>
      </div>

      <!-- Contact & Social -->
      <div
        v-if="hasContactInfo(school)"
        class="space-y-3 pt-2 border-t border-slate-200"
      >
        <h4 class="font-medium text-slate-900">Contact & Social</h4>
        <div class="space-y-2">
          <div v-if="school.website" class="flex items-start gap-2">
            <span class="text-slate-500 text-sm w-24">Website:</span>
            <a
              :href="school.website"
              target="_blank"
              class="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              {{ school.website }}
              <ArrowTopRightOnSquareIcon class="w-3 h-3" />
            </a>
          </div>
          <div v-if="school.twitter_handle" class="flex items-start gap-2">
            <span class="text-slate-500 text-sm w-24">Twitter:</span>
            <a
              :href="`https://twitter.com/${school.twitter_handle.replace('@', '')}`"
              target="_blank"
              class="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              {{ school.twitter_handle }}
              <ArrowTopRightOnSquareIcon class="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      <!-- College Scorecard Data -->
      <div
        v-if="hasCollegeScorecardData(school)"
        class="pt-2 border-t border-slate-200"
      >
        <h4 class="font-medium text-slate-900 mb-3">College Scorecard Data</h4>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div
            v-if="getAcademicInfo(school, 'student_size')"
            class="flex justify-between p-2 bg-slate-50 rounded"
          >
            <span class="text-slate-600">Students</span>
            <span class="font-medium text-slate-900">{{
              (
                getAcademicInfo(school, "student_size") as number
              ).toLocaleString()
            }}</span>
          </div>
          <div
            v-if="getAcademicInfo(school, 'tuition_in_state')"
            class="flex justify-between p-2 bg-slate-50 rounded"
          >
            <span class="text-slate-600">Tuition (In-State)</span>
            <span class="font-medium text-slate-900"
              >${{
                (
                  getAcademicInfo(school, "tuition_in_state") as number
                ).toLocaleString()
              }}</span
            >
          </div>
          <div
            v-if="getAcademicInfo(school, 'tuition_out_of_state')"
            class="flex justify-between p-2 bg-slate-50 rounded"
          >
            <span class="text-slate-600">Tuition (Out-of-State)</span>
            <span class="font-medium text-slate-900"
              >${{
                (
                  getAcademicInfo(school, "tuition_out_of_state") as number
                ).toLocaleString()
              }}</span
            >
          </div>
          <div
            v-if="getAcademicInfo(school, 'admission_rate')"
            class="flex justify-between p-2 bg-slate-50 rounded"
          >
            <span class="text-slate-600">Admission Rate</span>
            <span class="font-medium text-slate-900"
              >{{
                (
                  (getAcademicInfo(school, "admission_rate") as number) * 100
                ).toFixed(0)
              }}%</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { School } from "~/types/models";
import type { BasicInfoFormData } from "~/composables/useSchoolBasicInfo";
import {
  getAcademicInfo,
  hasSchoolInfo,
  hasContactInfo,
  hasCollegeScorecardData,
} from "~/utils/schoolHelpers";
import {
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/vue/24/outline";
import SchoolMap from "~/components/School/SchoolMap.vue";

defineProps<{
  school: School;
  calculatedDistance: string | null;
  collegeDataLoading: boolean;
  collegeDataError: string | null;
  editingBasicInfo: boolean;
  editedBasicInfo: BasicInfoFormData;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  "lookup-data": [];
  save: [];
  "toggle-edit": [];
}>();

const handleSave = () => {
  emit("save");
};

const toggleEdit = () => {
  emit("toggle-edit");
};
</script>
