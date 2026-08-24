<template>
  <div class="space-y-6">
    <!-- Recruiting Status -->
    <SchoolRecruitingStatusSection
      :status="school.status"
      :status-updating="statusUpdating"
      @update:status="emit('update:status', $event)"
    />

    <!-- Quick Actions -->
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <h3 class="mb-4 font-semibold text-slate-900">Quick Actions</h3>
      <div class="space-y-3">
        <NuxtLink
          :to="`/schools/${schoolId}/interactions`"
          class="block flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <UIcon
            name="i-heroicons-chat-bubble-left-right"
            class="h-4 w-4"
            aria-hidden="true"
          />
          Log Interaction
        </NuxtLink>
        <button
          @click="emit('open-email-modal')"
          class="block flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-purple-500 to-purple-600 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:from-purple-600 hover:to-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <UIcon
            name="i-heroicons-envelope"
            class="h-4 w-4"
            aria-hidden="true"
          />
          Send Email
        </button>
        <NuxtLink
          :to="`/schools/${schoolId}/coaches`"
          class="block flex w-full items-center justify-center gap-2 rounded-lg bg-slate-600 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-slate-700 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          <UIcon name="i-heroicons-users" class="h-4 w-4" aria-hidden="true" />
          Manage Coaches
        </NuxtLink>
      </div>
    </div>

    <!-- Coaches -->
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-user-circle"
            class="h-5 w-5 text-slate-400"
          />
          <h3 class="font-semibold text-slate-900">Coaches</h3>
        </div>
        <NuxtLink
          :to="`/schools/${schoolId}/coaches`"
          class="rounded-sm text-sm font-medium text-blue-600 hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
      <div v-else class="py-4 text-center text-sm text-slate-500">
        No coaches added yet
      </div>
    </div>

    <!-- Fit Signals Card -->
    <div
      v-if="personalFit || academicFit"
      class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <h3 class="mb-4 font-semibold text-slate-900">School Fit</h3>
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
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <h4 class="mb-3 font-semibold text-slate-900">Attribution</h4>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-slate-600">Created by:</span>
          <span class="text-slate-900">Parent</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Last updated:</span>
          <span class="text-slate-900">Parent</span>
        </div>
        <div v-if="school.updated_at" class="text-xs text-slate-500">
          {{ new Date(school.updated_at).toLocaleDateString() }}
        </div>
      </div>
    </div>

    <!-- Delete School -->
    <button
      @click="emit('delete')"
      class="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      <UIcon name="i-heroicons-trash" class="h-4 w-4" aria-hidden="true" />
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
