<template>
  <div class="space-y-6">
    <!-- School Info -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 class="text-base font-bold text-slate-900 mb-6">High School</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="md:col-span-2">
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >High School Name</label
          >
          <SharedHighSchoolSearchInput
            data-testid="hs-name"
            :model-value="{
              name: form.school_name ?? '',
              nces_school_id: form.nces_school_id || null,
            }"
            :state-hint="form.school_state || ''"
            :disabled="isParentRole"
            @update:model-value="
              (v: HighSchoolSelection) => {
                form.school_name = v.name;
                form.high_school = v.name;
                form.nces_school_id = v.nces_school_id ?? '';
                triggerSave();
              }
            "
          />
        </div>
        <div>
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >School City</label
          >
          <input
            v-model="form.school_city"
            :disabled="isParentRole"
            type="text"
            placeholder="Atlanta"
            @blur="triggerSave"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition font-medium text-slate-700"
          />
        </div>
        <div>
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >School State</label
          >
          <input
            v-model="form.school_state"
            :disabled="isParentRole"
            type="text"
            placeholder="GA"
            maxlength="2"
            @blur="triggerSave"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 uppercase transition font-medium text-slate-700"
          />
        </div>
      </div>
    </div>

    <!-- Academics -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2
        class="text-base font-bold text-slate-900 mb-6 flex items-center gap-2"
      >
        <UIcon name="i-heroicons-academic-cap" class="w-5 h-5 text-blue-600" />
        Academic Standing
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >GPA</label
          >
          <input
            v-model.number="form.gpa"
            type="number"
            step="0.01"
            @blur="triggerSave"
            placeholder="e.g. 3.85"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          />
        </div>
        <div>
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >SAT Score</label
          >
          <input
            v-model.number="form.sat_score"
            type="number"
            @blur="triggerSave"
            placeholder="1200"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          />
        </div>
        <div>
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >ACT Score</label
          >
          <input
            v-model.number="form.act_score"
            type="number"
            @blur="triggerSave"
            placeholder="28"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          />
        </div>
      </div>
    </div>

    <!-- Core Courses -->
    <div
      class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div class="p-5 border-b border-slate-100 bg-slate-50/50">
        <h2 class="text-base font-bold text-slate-900">Core Courses</h2>
        <p class="text-xs text-slate-500 font-medium">
          AP, honors, or notable courses for your recruiting profile.
        </p>
      </div>
      <div class="p-6 space-y-4">
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(course, idx) in form.core_courses"
            :key="idx"
            class="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium px-3 py-1.5 rounded-full"
          >
            {{ course }}
            <button
              v-if="!isParentRole"
              @click="removeCourse(idx)"
              type="button"
              class="text-blue-400 hover:text-blue-600 transition"
              :aria-label="`Remove ${course}`"
            >
              <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5" />
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
            class="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition"
            maxlength="60"
          />
          <button
            @click="addCourse"
            type="button"
            :disabled="!newCourseInput.trim()"
            class="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
