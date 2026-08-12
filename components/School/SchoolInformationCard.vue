<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
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

    <!-- Contact & Social -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">Contact &amp; Social</h3>
        <button
          @click="toggleEdit"
          class="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition"
        >
          {{ editingBasicInfo ? "Cancel" : "Edit" }}
        </button>
      </div>

      <!-- Edit form -->
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
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Phone</label
            >
            <input
              v-model="editedBasicInfo.phone"
              type="tel"
              placeholder="(555) 123-4567"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"
              >Instagram Handle</label
            >
            <input
              v-model="editedBasicInfo.instagram_handle"
              type="text"
              placeholder="@handle..."
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          @click="handleSave"
          :disabled="isSaving"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {{ isSaving ? "Saving..." : "Save" }}
        </button>
      </div>

      <!-- Display -->
      <div v-else-if="hasContactInfo(school)" class="space-y-2">
        <div
          v-if="school.academic_info?.address"
          class="flex items-start gap-2"
        >
          <span class="text-slate-500 text-sm w-24 shrink-0">Address:</span>
          <span
            class="text-sm text-slate-900 flex items-center gap-1"
          >
            <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5 text-slate-500" />
            {{ school.academic_info.address }}
          </span>
        </div>
        <div v-if="school.phone" class="flex items-start gap-2">
          <span class="text-slate-500 text-sm w-24 shrink-0">Phone:</span>
          <a
            :href="`tel:${school.phone}`"
            class="text-blue-600 hover:text-blue-700 text-sm"
          >
            {{ school.phone }}
          </a>
        </div>
        <div v-if="school.website" class="flex items-start gap-2">
          <span class="text-slate-500 text-sm w-24 shrink-0">Website:</span>
          <a
            :href="school.website"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 break-all"
          >
            {{ school.website }}
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="w-3 h-3 shrink-0"
            />
          </a>
        </div>
        <div v-if="school.twitter_handle" class="flex items-start gap-2">
          <span class="text-slate-500 text-sm w-24 shrink-0">Twitter:</span>
          <a
            :href="`https://twitter.com/${school.twitter_handle.replace('@', '')}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            {{ school.twitter_handle }}
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="w-3 h-3 shrink-0"
            />
          </a>
        </div>
        <div v-if="school.instagram_handle" class="flex items-start gap-2">
          <span class="text-slate-500 text-sm w-24 shrink-0">Instagram:</span>
          <a
            :href="`https://instagram.com/${school.instagram_handle.replace('@', '')}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            {{ school.instagram_handle }}
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="w-3 h-3 shrink-0"
            />
          </a>
        </div>
      </div>
      <p v-else class="text-sm text-slate-500">
        No contact info yet. Use Edit to add a website, socials, or phone.
      </p>
    </section>

    <!-- College Data -->
    <section class="mt-4 pt-4 border-t border-slate-200 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">College Data</h3>
        <button
          v-if="!editingBasicInfo"
          @click="$emit('lookup-data')"
          :disabled="collegeDataLoading"
          class="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-1 disabled:opacity-50"
        >
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4" />
          {{ collegeDataLoading ? "Looking up..." : "Lookup" }}
        </button>
      </div>

      <div
        v-if="collegeDataError"
        class="p-3 bg-red-50 text-red-700 rounded-lg text-sm"
      >
        {{ collegeDataError }}
      </div>

      <div
        v-if="hasCollegeScorecardData(school)"
        class="grid grid-cols-2 gap-2 text-sm"
      >
        <div
          v-if="getAcademicInfo(school, 'student_size')"
          class="flex justify-between p-2 bg-slate-50 rounded-sm"
        >
          <span class="text-slate-600">Students</span>
          <span class="font-medium text-slate-900">{{
            (getAcademicInfo(school, "student_size") as number).toLocaleString()
          }}</span>
        </div>
        <div
          v-if="getAcademicInfo(school, 'tuition_in_state')"
          class="flex justify-between p-2 bg-slate-50 rounded-sm"
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
          class="flex justify-between p-2 bg-slate-50 rounded-sm"
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
          class="flex justify-between p-2 bg-slate-50 rounded-sm"
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
        <div
          v-if="getAcademicInfo(school, 'avg_net_price')"
          class="flex justify-between p-2 bg-slate-50 rounded-sm"
        >
          <span class="text-slate-600">Avg Net Price</span>
          <span class="font-medium text-slate-900"
            >${{
              (
                getAcademicInfo(school, "avg_net_price") as number
              ).toLocaleString()
            }}/yr</span
          >
        </div>
        <div
          v-if="getAcademicInfo(school, 'graduation_rate')"
          class="flex justify-between p-2 bg-slate-50 rounded-sm"
        >
          <span class="text-slate-600">Graduation Rate</span>
          <span class="font-medium text-slate-900"
            >{{
              (
                (getAcademicInfo(school, "graduation_rate") as number) * 100
              ).toFixed(0)
            }}%</span
          >
        </div>
      </div>
      <p v-else class="text-sm text-slate-500">
        No college data yet. Use Lookup to pull it from the College Scorecard.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { School } from "~/types/models";
import type { BasicInfoFormData } from "~/composables/useSchoolBasicInfo";
import {
  getAcademicInfo,
  hasContactInfo,
  hasCollegeScorecardData,
} from "~/utils/schoolHelpers";
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
