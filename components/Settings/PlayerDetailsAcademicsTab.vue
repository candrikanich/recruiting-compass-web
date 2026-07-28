<template>
  <div class="space-y-6">
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

    <!-- Social Media -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 class="text-base font-bold text-slate-900 mb-6">Social Handles</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="social in socialInputs" :key="social.key" class="relative">
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >{{ social.label }}</label
          >
          <div class="flex items-center">
            <span
              v-if="social.prefix"
              class="absolute left-4 text-slate-400 font-bold"
              >{{ social.prefix }}</span
            >
            <input
              v-model="form[social.key]"
              type="text"
              @blur="
                (e) =>
                  handleSocialBlur(
                    String(social.key),
                    (e.target as HTMLInputElement).value,
                  )
              "
              :placeholder="social.placeholder"
              :class="[
                'w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition font-medium text-slate-700',
                social.prefix ? 'pl-9 pr-4' : 'px-4',
              ]"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Contact -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 class="text-base font-bold text-slate-900 mb-6">
        Contact &amp; Privacy
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >Phone Number</label
          >
          <input
            v-model="form.phone"
            type="tel"
            autocomplete="tel"
            @blur="triggerSave"
            placeholder="(555) 000-0000"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          />
        </div>
        <div>
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >Public Email</label
          >
          <input
            v-model="form.email"
            type="email"
            autocomplete="email"
            @blur="triggerSave"
            placeholder="athlete@example.com"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          />
        </div>
      </div>

      <div class="bg-slate-50 rounded-2xl p-4 space-y-4">
        <label class="flex items-center gap-3 cursor-pointer group">
          <div class="relative flex items-center">
            <input
              v-model="form.allow_share_phone"
              type="checkbox"
              @change="triggerSave"
              class="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white checked:bg-blue-600 checked:border-blue-600 transition-all shadow-sm"
            />
            <UIcon
              name="i-heroicons-check"
              class="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 left-1 top-1 pointer-events-none stroke-[3]"
            />
          </div>
          <span
            class="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition"
            >Show phone number to verified coaches</span
          >
        </label>
        <label class="flex items-center gap-3 cursor-pointer group">
          <div class="relative flex items-center">
            <input
              v-model="form.allow_share_email"
              type="checkbox"
              @change="triggerSave"
              class="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white checked:bg-blue-600 checked:border-blue-600 transition-all shadow-sm"
            />
            <UIcon
              name="i-heroicons-check"
              class="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 left-1 top-1 pointer-events-none stroke-[3]"
            />
          </div>
          <span
            class="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition"
            >Show email to verified coaches</span
          >
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PlayerDetails } from "~/types/models";

defineProps<{
  form: PlayerDetails;
  isParentRole: boolean;
  triggerSave: () => void;
  socialInputs: {
    key: keyof PlayerDetails;
    label: string;
    prefix?: string;
    placeholder: string;
  }[];
  handleSocialBlur: (key: string, value: string) => void;
  addCourse: () => void;
  removeCourse: (idx: number) => void;
}>();

const newCourseInput = defineModel<string>("newCourseInput", {
  required: true,
});
</script>
