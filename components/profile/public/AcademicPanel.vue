<!-- components/profile/public/AcademicPanel.vue -->
<script setup lang="ts">
import type { PublicProfileData } from "~/types/models";
import SectionHeader from "~/components/profile/public/SectionHeader.vue";

defineProps<{
  academics: PublicProfileData["academics"];
  ncaaId: string | undefined;
}>();
</script>

<template>
  <section v-if="academics">
    <SectionHeader icon="i-heroicons-academic-cap" title="Academic Profile" />
    <DesignSystemCard padding="md">
      <div v-if="academics.high_school" class="mb-4">
        <p class="text-xs text-brand-slate-500">High School</p>
        <p class="mt-0.5 font-medium text-brand-slate-900">
          {{ academics.high_school }}
        </p>
      </div>

      <dl class="grid grid-cols-3 gap-x-6 gap-y-4 text-sm">
        <div v-if="academics.gpa != null" class="flex flex-col">
          <dt class="text-xs text-brand-slate-500">GPA</dt>
          <dd class="text-lg font-semibold text-brand-slate-900">
            {{ academics.gpa.toFixed(2) }}
          </dd>
        </div>
        <div v-if="academics.sat_score != null" class="flex flex-col">
          <dt class="text-xs text-brand-slate-500">SAT Score</dt>
          <dd class="text-lg font-semibold text-brand-slate-900">
            {{ academics.sat_score }}
          </dd>
        </div>
        <div v-if="academics.act_score != null" class="flex flex-col">
          <dt class="text-xs text-brand-slate-500">ACT Score</dt>
          <dd class="text-lg font-semibold text-brand-slate-900">
            {{ academics.act_score }}
          </dd>
        </div>
        <div v-if="academics.graduation_year" class="flex flex-col">
          <dt class="text-xs text-brand-slate-500">Graduation Year</dt>
          <dd class="font-medium text-brand-slate-900">
            Class of {{ academics.graduation_year }}
          </dd>
        </div>
        <div v-if="academics.intended_major" class="col-span-2 flex flex-col">
          <dt class="text-xs text-brand-slate-500">Desired Major</dt>
          <dd class="font-medium text-brand-slate-900">
            {{ academics.intended_major }}
          </dd>
        </div>
      </dl>

      <div v-if="academics.core_courses?.length" class="mt-4">
        <p class="mb-1.5 text-xs text-brand-slate-500">Core Courses</p>
        <p class="text-sm text-brand-slate-700">
          {{ academics.core_courses.join(", ") }}
        </p>
      </div>

      <div
        v-if="ncaaId"
        class="mt-4 rounded-lg bg-brand-slate-50 px-3 py-2 text-xs font-medium text-brand-slate-600"
      >
        NCAA Eligibility Center ID:
        <span class="font-mono text-brand-slate-900">{{ ncaaId }}</span>
      </div>
    </DesignSystemCard>
  </section>
</template>
