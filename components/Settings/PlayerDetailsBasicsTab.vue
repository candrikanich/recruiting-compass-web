<template>
  <div
    class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
  >
    <div class="p-5 border-b border-slate-100 bg-slate-50/50">
      <h2 class="text-base font-bold text-slate-900">Essential Info</h2>
      <p class="text-xs text-slate-500 font-medium">
        The core details recruiters see first.
      </p>
    </div>

    <div class="p-6 space-y-8">
      <!-- Profile Photo -->
      <div class="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
        <SettingsProfilePhotoUpload />
        <div class="flex-1 space-y-5 w-full">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
              >
                Graduation Year <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.graduation_year"
                :disabled="isParentRole"
                @change="triggerSave"
                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 appearance-none font-medium text-slate-700"
              >
                <option :value="undefined">Select Year</option>
                <option
                  v-for="year in graduationYears"
                  :key="year"
                  :value="year"
                >
                  {{ year }}
                </option>
              </select>
            </div>
            <div>
              <label
                class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
                >Primary Sport</label
              >
              <select
                v-model="form.primary_sport"
                :disabled="isParentRole"
                @change="triggerSave"
                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 appearance-none font-medium text-slate-700"
              >
                <option :value="undefined">Select Sport</option>
                <option
                  v-for="sport in commonSports"
                  :key="sport"
                  :value="sport"
                >
                  {{ sport }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- School Info -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-100"
      >
        <div class="md:col-span-2">
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >High School Name</label
          >
          <SharedHighSchoolSearchInput
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

      <!-- Recruiting Contact (separate from login credentials) -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-100"
      >
        <div>
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >Recruiting Email</label
          >
          <input
            v-model="form.email"
            :disabled="isParentRole"
            type="email"
            placeholder="you@example.com"
            @blur="triggerSave"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition font-medium text-slate-700"
          />
          <p class="text-xs text-slate-400 mt-1.5 ml-1">
            The email coaches reply to — can differ from your login.
          </p>
        </div>
        <div>
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
            >Recruiting Phone</label
          >
          <input
            v-model="form.phone"
            :disabled="isParentRole"
            type="tel"
            placeholder="440-555-0134"
            @blur="triggerSave"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition font-medium text-slate-700"
          />
          <p class="text-xs text-slate-400 mt-1.5 ml-1">
            The number coaches can text.
          </p>
        </div>
      </div>

      <!-- College Preferences -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-100"
      >
        <div>
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
          >
            Campus Size Preference
          </label>
          <div class="flex p-1 bg-slate-100 rounded-xl">
            <button
              v-for="opt in campusSizeOptions"
              :key="opt.value"
              type="button"
              :disabled="isParentRole"
              @click="
                form.campus_size_preference = opt.value;
                triggerSave();
              "
              :class="[
                'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
                form.campus_size_preference === opt.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              ]"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="text-xs text-slate-400 mt-1.5 ml-1">
            Used for personal fit analysis
          </p>
        </div>
        <div>
          <label
            class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
          >
            Cost Sensitivity
          </label>
          <div class="flex p-1 bg-slate-100 rounded-xl">
            <button
              v-for="opt in costSensitivityOptions"
              :key="opt.value"
              type="button"
              :disabled="isParentRole"
              @click="
                form.cost_sensitivity = opt.value;
                triggerSave();
              "
              :class="[
                'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
                form.cost_sensitivity === opt.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              ]"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="text-xs text-slate-400 mt-1.5 ml-1">
            Used for personal fit analysis
          </p>
        </div>
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
  graduationYears: number[];
  commonSports: string[];
  campusSizeOptions: { value: "small" | "medium" | "large"; label: string }[];
  costSensitivityOptions: {
    value: "high" | "medium" | "low";
    label: string;
  }[];
  triggerSave: () => void;
}>();
</script>
