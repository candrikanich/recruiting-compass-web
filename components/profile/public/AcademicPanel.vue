<!-- components/profile/public/AcademicPanel.vue -->
<script setup lang="ts">
import type { PublicProfileData } from "~/types/models";

defineProps<{
  academics: PublicProfileData["academics"];
  ncaaId: string | undefined;
}>();
</script>

<template>
  <section v-if="academics">
    <h2 class="mb-3 text-sm font-semibold text-brand-slate-900">Academics</h2>
    <DSCard padding="md">
      <dl class="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
        <div v-if="academics.gpa != null" class="flex flex-col">
          <dt class="text-xs text-brand-slate-500">GPA</dt>
          <dd class="font-medium text-brand-slate-900">
            {{ academics.gpa.toFixed(2) }}
          </dd>
        </div>
        <div v-if="academics.sat_score != null" class="flex flex-col">
          <dt class="text-xs text-brand-slate-500">SAT</dt>
          <dd class="font-medium text-brand-slate-900">
            {{ academics.sat_score }}
          </dd>
        </div>
        <div v-if="academics.act_score != null" class="flex flex-col">
          <dt class="text-xs text-brand-slate-500">ACT</dt>
          <dd class="font-medium text-brand-slate-900">
            {{ academics.act_score }}
          </dd>
        </div>
        <div v-if="academics.graduation_year" class="flex flex-col">
          <dt class="text-xs text-brand-slate-500">Grad Year</dt>
          <dd class="font-medium text-brand-slate-900">
            {{ academics.graduation_year }}
          </dd>
        </div>
        <div v-if="academics.high_school" class="flex flex-col">
          <dt class="text-xs text-brand-slate-500">High School</dt>
          <dd class="font-medium text-brand-slate-900">
            {{ academics.high_school }}
          </dd>
        </div>
        <div v-if="ncaaId" class="flex flex-col">
          <dt class="text-xs text-brand-slate-500">NCAA Eligibility ID</dt>
          <dd class="font-mono font-medium text-brand-slate-900">
            {{ ncaaId }}
          </dd>
        </div>
      </dl>
      <div v-if="academics.core_courses?.length" class="mt-4">
        <p class="mb-1.5 text-xs text-brand-slate-500">Core Courses</p>
        <p class="text-sm text-brand-slate-700">
          {{ academics.core_courses.join(", ") }}
        </p>
      </div>
    </DSCard>
  </section>
</template>
