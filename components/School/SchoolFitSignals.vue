<template>
  <div class="space-y-4">
    <!-- Personal Fit Card -->
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div class="mb-3 flex items-center justify-between">
        <h4 class="text-sm font-semibold text-slate-900">Personal Fit</h4>
        <span class="text-xs text-slate-400">Based on your preferences</span>
      </div>

      <div
        v-if="personalFit.availableSignals === 0"
        class="py-2 text-sm text-slate-500"
      >
        <p>
          Add your home state, campus size preference, and cost sensitivity in
          your
          <NuxtLink
            to="/settings/player-details"
            class="text-blue-600 underline hover:text-blue-700"
          >
            profile
          </NuxtLink>
          to see personal fit.
        </p>
      </div>

      <div v-else class="space-y-4">
        <SchoolFitSignalRow
          v-for="signal in personalSignals"
          :key="signal.label"
          :signal="signal"
        />
      </div>
    </div>

    <!-- Academic Fit Card -->
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div class="mb-3 flex items-center justify-between">
        <h4 class="text-sm font-semibold text-slate-900">Academic Fit</h4>
        <span class="text-xs text-slate-400">Test score comparison</span>
      </div>

      <div
        v-if="!academicFit.hasSchoolData"
        class="py-2 text-sm text-slate-500"
      >
        <p>No academic data for this school yet.</p>
        <button
          class="mt-2 text-xs text-blue-600 underline hover:text-blue-700 focus:outline-none"
          @click="emit('enrich')"
        >
          Look up this school's academic profile →
        </button>
      </div>

      <div v-else class="space-y-4">
        <SchoolFitSignalRow
          v-for="signal in academicSignals"
          :key="signal.label"
          :signal="signal"
        />

        <div
          v-if="academicFit.admissionRate !== null"
          class="border-t border-slate-100 pt-3 text-xs text-slate-500"
        >
          Acceptance rate:
          <span class="font-medium text-slate-700">
            {{ formatAdmissionRate(academicFit.admissionRate) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Data source note -->
    <p class="px-1 text-xs text-slate-400">
      Academic data from the
      <a
        href="https://collegescorecard.ed.gov"
        target="_blank"
        rel="noopener noreferrer"
        class="underline hover:text-slate-600"
        >US College Scorecard</a
      >. Personal fit based on your profile preferences.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  PersonalFitAnalysis,
  AcademicFitAnalysis,
} from "~/types/schoolFit";

const props = defineProps<{
  personalFit: PersonalFitAnalysis;
  academicFit: AcademicFitAnalysis;
}>();

const emit = defineEmits<{ enrich: [] }>();

const personalSignals = computed(() =>
  Object.values(props.personalFit.signals),
);
const academicSignals = computed(() =>
  Object.values(props.academicFit.signals),
);

function formatAdmissionRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
</script>
