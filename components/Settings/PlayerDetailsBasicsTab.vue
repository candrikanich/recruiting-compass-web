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
        <SettingsProfilePhotoUpload
          :target-user-id="activeAthleteId ?? undefined"
        />
        <div class="flex-1 space-y-5 w-full">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1 whitespace-nowrap"
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
                class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1 whitespace-nowrap"
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
            data-testid="contact-email"
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
            :value="form.phone"
            :disabled="isParentRole"
            type="tel"
            autocomplete="tel"
            inputmode="tel"
            maxlength="14"
            placeholder="(440) 555-0134"
            data-testid="contact-phone"
            @input="
              form.phone = formatPhoneNational(
                ($event.target as HTMLInputElement).value,
              )
            "
            @blur="triggerSave"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition font-medium text-slate-700"
          />
          <p class="text-xs text-slate-400 mt-1.5 ml-1">
            The number coaches can text.
          </p>
        </div>

        <div class="md:col-span-2 bg-slate-50 rounded-2xl p-4 space-y-4">
          <label class="flex items-center gap-3 cursor-pointer group">
            <div class="relative flex items-center">
              <input
                v-model="form.allow_share_phone"
                type="checkbox"
                data-testid="share-phone"
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
                data-testid="share-email"
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

      <!-- Social Media -->
      <div class="pt-8 border-t border-slate-100">
        <h2 class="text-base font-bold text-slate-900 mb-6">Social Handles</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="social in socialInputs"
            :key="social.key"
            class="relative"
            :data-testid="`social-${social.key}`"
          >
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
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import { formatPhoneNational } from "~/utils/phone";

// Photo targets the athlete being viewed (self for a player, the linked athlete for a parent).
const { activeAthleteId } = useFamilyCtx();

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
  socialInputs: {
    key: keyof PlayerDetails;
    label: string;
    prefix?: string;
    placeholder: string;
  }[];
  handleSocialBlur: (key: string, value: string) => void;
}>();
</script>
