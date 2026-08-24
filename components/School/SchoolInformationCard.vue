<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
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
      class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-700"
    >
      Distance from Home: <strong>{{ calculatedDistance }}</strong>
    </div>

    <!-- Contact & Social -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">
          Contact &amp; Social
        </h3>
        <button
          @click="toggleEdit"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {{ editingBasicInfo ? "Cancel" : "Edit" }}
        </button>
      </div>

      <!-- Edit form -->
      <div v-if="editingBasicInfo" class="space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700"
              >Campus Address</label
            >
            <input
              v-model="editedBasicInfo.address"
              type="text"
              placeholder="Main campus address..."
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700"
              >Phone</label
            >
            <input
              :value="editedBasicInfo.phone"
              type="tel"
              autocomplete="tel"
              inputmode="tel"
              maxlength="14"
              placeholder="(555) 123-4567"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              @input="
                editedBasicInfo.phone = formatPhoneNational(
                  ($event.target as HTMLInputElement).value,
                )
              "
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700"
              >Website</label
            >
            <input
              v-model="editedBasicInfo.website"
              type="url"
              placeholder="https://..."
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700"
              >Athletics Website</label
            >
            <input
              v-model="editedBasicInfo.athletics_url"
              type="url"
              placeholder="goashlandeagles.com"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700"
              >Twitter Handle</label
            >
            <input
              v-model="editedBasicInfo.twitter_handle"
              type="text"
              placeholder="@handle..."
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700"
              >Instagram Handle</label
            >
            <input
              v-model="editedBasicInfo.instagram_handle"
              type="text"
              placeholder="@handle..."
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          @click="handleSave"
          :disabled="isSaving"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
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
          <span class="w-24 shrink-0 text-sm text-slate-500">Address:</span>
          <span class="flex items-center gap-1 text-sm text-slate-900">
            <UIcon
              name="i-heroicons-map-pin"
              class="h-3.5 w-3.5 text-slate-500"
            />
            {{ school.academic_info.address }}
          </span>
        </div>
        <div v-if="school.phone" class="flex items-start gap-2">
          <span class="w-24 shrink-0 text-sm text-slate-500">Phone:</span>
          <a
            :href="toTelHref(school.phone)"
            class="text-sm text-blue-600 hover:text-blue-700"
          >
            {{ formatPhoneDisplay(school.phone) }}
          </a>
        </div>
        <div v-if="school.website" class="flex items-start gap-2">
          <span class="w-24 shrink-0 text-sm text-slate-500">Website:</span>
          <a
            :href="school.website"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1 text-sm break-all text-blue-600 hover:text-blue-700"
          >
            {{ school.website }}
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="h-3 w-3 shrink-0"
            />
          </a>
        </div>
        <div v-if="school.athletics_url" class="flex items-start gap-2">
          <span class="w-24 shrink-0 text-sm text-slate-500">Athletics:</span>
          <a
            :href="school.athletics_url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1 text-sm break-all text-blue-600 hover:text-blue-700"
          >
            {{ school.athletics_url }}
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="h-3 w-3 shrink-0"
            />
          </a>
        </div>
        <div v-if="school.twitter_handle" class="flex items-start gap-2">
          <span class="w-24 shrink-0 text-sm text-slate-500">Twitter:</span>
          <a
            :href="`https://twitter.com/${school.twitter_handle.replace('@', '')}`"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            {{ school.twitter_handle }}
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="h-3 w-3 shrink-0"
            />
          </a>
        </div>
        <div v-if="school.instagram_handle" class="flex items-start gap-2">
          <span class="w-24 shrink-0 text-sm text-slate-500">Instagram:</span>
          <a
            :href="`https://instagram.com/${school.instagram_handle.replace('@', '')}`"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            {{ school.instagram_handle }}
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="h-3 w-3 shrink-0"
            />
          </a>
        </div>
      </div>
      <p v-else class="text-sm text-slate-500">
        No contact info yet. Use Edit to add a website, socials, or phone.
      </p>
    </section>

    <!-- College Data -->
    <section class="mt-4 space-y-3 border-t border-slate-200 pt-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">College Data</h3>
        <button
          v-if="!editingBasicInfo"
          @click="$emit('lookup-data')"
          :disabled="collegeDataLoading"
          class="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50"
        >
          <UIcon name="i-heroicons-magnifying-glass" class="h-4 w-4" />
          {{ collegeDataLoading ? "Looking up..." : "Lookup" }}
        </button>
      </div>

      <div
        v-if="collegeDataError"
        class="rounded-lg bg-red-50 p-3 text-sm text-red-700"
      >
        {{ collegeDataError }}
      </div>

      <div
        v-if="hasCollegeScorecardData(school)"
        class="grid grid-cols-2 gap-2 text-sm"
      >
        <div
          v-if="getAcademicInfo(school, 'student_size')"
          class="flex justify-between rounded-sm bg-slate-50 p-2"
        >
          <span class="text-slate-600">Students</span>
          <span class="font-medium text-slate-900">{{
            (getAcademicInfo(school, "student_size") as number).toLocaleString()
          }}</span>
        </div>
        <div
          v-if="getAcademicInfo(school, 'tuition_in_state')"
          class="flex justify-between rounded-sm bg-slate-50 p-2"
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
          class="flex justify-between rounded-sm bg-slate-50 p-2"
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
          class="flex justify-between rounded-sm bg-slate-50 p-2"
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
          class="flex justify-between rounded-sm bg-slate-50 p-2"
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
          class="flex justify-between rounded-sm bg-slate-50 p-2"
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

    <!-- Recruiting -->
    <section class="mt-4 space-y-3 border-t border-slate-200 pt-4">
      <h3 class="text-lg font-semibold text-slate-900">Recruiting</h3>
      <label class="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
          :checked="school.questionnaire_completed === true"
          @change="
            $emit(
              'set-questionnaire',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        <span class="text-sm">
          <span class="font-medium text-slate-900"
            >Recruiting questionnaire completed</span
          >
          <span class="block text-slate-500">
            Enables the "I've completed your recruiting questionnaire" line in
            coach outreach templates for this school.
          </span>
        </span>
      </label>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { School } from "~/types/models";
import type { BasicInfoFormData } from "~/composables/useSchoolBasicInfo";
import {
  formatPhoneDisplay,
  formatPhoneNational,
  toTelHref,
} from "~/utils/phone";
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
  "set-questionnaire": [completed: boolean];
}>();

const handleSave = () => {
  emit("save");
};

const toggleEdit = () => {
  emit("toggle-edit");
};
</script>
