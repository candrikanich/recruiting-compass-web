<template>
  <div class="space-y-6">
    <!-- School Info -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="mb-6 text-base font-bold text-slate-900">High School</h2>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="md:col-span-2">
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
            >High School Name</label
          >
          <SharedHighSchoolSearchInput
            data-testid="hs-name"
            :model-value="{
              name: form.school_name ?? '',
              nces_school_id: form.nces_school_id || null,
              city: form.school_city || null,
              state: form.school_state || null,
              zip: form.school_zip || null,
            }"
            :state-hint="form.school_state || ''"
            :disabled="isParentRole"
            @update:model-value="
              (v: HighSchoolSelection) => {
                form.school_name = v.name;
                form.high_school = v.name;
                form.nces_school_id = v.nces_school_id ?? '';
                if (v.city) form.school_city = v.city;
                if (v.state) form.school_state = v.state;
                if (v.zip) form.school_zip = v.zip;
                triggerSave();
              }
            "
          />
        </div>
        <div class="md:col-span-2">
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
            >School Address</label
          >
          <input
            v-model="form.school_address"
            :disabled="isParentRole"
            type="text"
            placeholder="123 Main St"
            @blur="triggerSave"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700 transition focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
            >School City</label
          >
          <input
            v-model="form.school_city"
            :disabled="isParentRole"
            type="text"
            placeholder="Atlanta"
            @blur="triggerSave"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700 transition focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
            >School State</label
          >
          <input
            v-model="form.school_state"
            :disabled="isParentRole"
            type="text"
            placeholder="GA"
            maxlength="2"
            @blur="triggerSave"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700 uppercase transition focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
            >School Zip</label
          >
          <input
            v-model="form.school_zip"
            :disabled="isParentRole"
            type="text"
            placeholder="30301"
            maxlength="10"
            @blur="triggerSave"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700 transition focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Academics -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2
        class="mb-6 flex items-center gap-2 text-base font-bold text-slate-900"
      >
        <UIcon name="i-heroicons-academic-cap" class="h-5 w-5 text-blue-600" />
        Academic Standing
      </h2>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
            >GPA</label
          >
          <input
            v-model.number="form.gpa"
            type="number"
            step="0.01"
            @blur="triggerSave"
            placeholder="e.g. 3.85"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium"
          />
        </div>
        <div>
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
            >SAT Score</label
          >
          <input
            v-model.number="form.sat_score"
            type="number"
            @blur="triggerSave"
            placeholder="1200"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium"
          />
        </div>
        <div>
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
            >ACT Score</label
          >
          <input
            v-model.number="form.act_score"
            type="number"
            @blur="triggerSave"
            placeholder="28"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium"
          />
        </div>
        <div class="sm:col-span-2">
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
            >Intended Major</label
          >
          <input
            v-model="form.intended_major"
            type="text"
            @blur="triggerSave"
            placeholder="e.g. Mechanical Engineering"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium"
          />
        </div>
      </div>
    </div>

    <!-- Core Courses -->
    <div
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div class="border-b border-slate-100 bg-slate-50/50 p-5">
        <h2 class="text-base font-bold text-slate-900">Core Courses</h2>
        <p class="text-xs font-medium text-slate-500">
          AP, honors, or notable courses for your recruiting profile.
        </p>
      </div>
      <div class="space-y-4 p-6">
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(course, idx) in form.core_courses"
            :key="idx"
            class="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800"
          >
            {{ course }}
            <button
              v-if="!isParentRole"
              @click="removeCourse(idx)"
              type="button"
              class="text-blue-400 transition hover:text-blue-600"
              :aria-label="`Remove ${course}`"
            >
              <UIcon name="i-heroicons-x-mark" class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div
          v-if="!isParentRole && (form.core_courses?.length ?? 0) < 20"
          class="flex gap-2"
        >
          <input
            v-model="newCourseInput"
            type="text"
            placeholder="e.g., AP Chemistry"
            @keydown.enter.prevent="addCourse"
            class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition focus:ring-2 focus:ring-blue-500"
            maxlength="60"
          />
          <button
            @click="addCourse"
            type="button"
            :disabled="!newCourseInput.trim()"
            class="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <p
          v-if="(form.core_courses?.length ?? 0) >= 20"
          class="text-xs text-slate-500"
        >
          Maximum 20 courses added.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PlayerDetails } from "~/types/models";
import type { HighSchoolSelection } from "~/composables/useHighSchoolSearch";

defineProps<{
  form: PlayerDetails;
  isParentRole: boolean;
  triggerSave: () => void;
  addCourse: () => void;
  removeCourse: (idx: number) => void;
}>();

const newCourseInput = defineModel<string>("newCourseInput", {
  required: true,
});
</script>
