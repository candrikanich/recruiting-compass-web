<template>
  <div class="space-y-6">
    <!-- Recruiting Status -->
    <SchoolRecruitingStatusSection
      :status="school.status"
      :status-updating="statusUpdating"
      @update:status="emit('update:status', $event)"
    />

    <!-- Quick Actions -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
      <h3 class="font-semibold text-slate-900 mb-4">Quick Actions</h3>
      <div class="space-y-3">
        <NuxtLink
          :to="`/schools/${schoolId}/interactions`"
          class="block w-full px-4 py-2.5 bg-linear-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-center flex items-center justify-center gap-2 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <UIcon
            name="i-heroicons-chat-bubble-left-right"
            class="w-4 h-4"
            aria-hidden="true"
          />
          Log Interaction
        </NuxtLink>
        <button
          @click="emit('open-email-modal')"
          class="block w-full px-4 py-2.5 bg-linear-to-r from-purple-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition text-center flex items-center justify-center gap-2 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <UIcon
            name="i-heroicons-envelope"
            class="w-4 h-4"
            aria-hidden="true"
          />
          Send Email
        </button>
        <NuxtLink
          :to="`/schools/${schoolId}/coaches`"
          class="block w-full px-4 py-2.5 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition text-center flex items-center justify-center gap-2 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          <UIcon name="i-heroicons-users" class="w-4 h-4" aria-hidden="true" />
          Manage Coaches
        </NuxtLink>
      </div>
    </div>

    <!-- Coaches -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-user-circle"
            class="w-5 h-5 text-slate-400"
          />
          <h3 class="font-semibold text-slate-900">Coaches</h3>
        </div>
        <NuxtLink
          :to="`/schools/${schoolId}/coaches`"
          class="text-sm text-blue-600 hover:text-blue-700 font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm"
        >
          Manage Coaches <span aria-hidden="true">&rarr;</span>
        </NuxtLink>
      </div>
      <div v-if="coaches.length > 0" class="space-y-3">
        <CoachCard
          v-for="coach in coaches"
          :key="coach.id"
          :coach="coach"
          variant="compact"
          :back-to="`/schools/${schoolId}`"
          :back-label="school?.name ?? 'School'"
        />
      </div>
      <div v-else class="text-center py-4 text-slate-500 text-sm">
        No coaches added yet
      </div>
    </div>

    <!-- Fit Signals Card -->
    <div
      v-if="personalFit || academicFit"
      class="bg-white rounded-xl border border-slate-200 shadow-xs p-6"
    >
      <h3 class="font-semibold text-slate-900 mb-4">School Fit</h3>
      <SchoolFitSignals
        v-if="personalFit && academicFit"
        :personal-fit="personalFit"
        :academic-fit="academicFit"
        @enrich="emit('enrich')"
      />
    </div>

    <!-- Status History -->
    <SchoolStatusHistory :school-id="schoolId" />

    <!-- Attribution -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <h4 class="font-semibold text-slate-900 mb-3">Attribution</h4>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-slate-600">Created by:</span>
          <span class="text-slate-900">Parent</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Last updated:</span>
          <span class="text-slate-900">Parent</span>
        </div>
        <div v-if="school.updated_at" class="text-slate-500 text-xs">
          {{ new Date(school.updated_at).toLocaleDateString() }}
        </div>
      </div>
    </div>

    <!-- Delete School -->
    <button
      @click="emit('delete')"
      class="w-full px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      <UIcon name="i-heroicons-trash" class="w-4 h-4" aria-hidden="true" />
      Delete School
    </button>
  </div>
</template>

<script setup lang="ts">
import type { School, Coach } from "~/types/models";
import type { DivisionRecommendation } from "~/types/timeline";
import type {
  PersonalFitAnalysis,
  AcademicFitAnalysis,
} from "~/types/schoolFit";
import SchoolStatusHistory from "~/components/School/SchoolStatusHistory.vue";
import SchoolFitSignals from "~/components/School/SchoolFitSignals.vue";
import SchoolRecruitingStatusSection from "~/components/School/SchoolRecruitingStatusSection.vue";
import CoachCard from "~/components/Coach/CoachCard.vue";
import type { SchoolStatusValue } from "~/utils/schoolStatusOptions";

defineProps<{
  schoolId: string;
  coaches: Coach[];
  school: School;
  statusUpdating: boolean;
  personalFit?: PersonalFitAnalysis | null;
  academicFit?: AcademicFitAnalysis | null;
  divisionRecommendation?: DivisionRecommendation | null;
}>();

const emit = defineEmits<{
  "open-email-modal": [];
  "update:status": [status: SchoolStatusValue];
  delete: [];
  enrich: [];
}>();
</script>
