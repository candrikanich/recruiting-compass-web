<template>
  <div
    class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
  >
    <div class="border-b border-slate-100 bg-slate-50/50 p-5">
      <h2 class="text-base font-bold text-slate-900">Essential Info</h2>
      <p class="text-xs font-medium text-slate-500">
        The core details recruiters see first.
      </p>
    </div>

    <div class="space-y-8 p-6">
      <!-- Profile Photo -->
      <div class="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
        <SettingsProfilePhotoUpload
          :target-user-id="activeAthleteId ?? undefined"
        />
        <div class="w-full flex-1 space-y-5">
          <div class="space-y-5">
            <div>
              <label
                class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest whitespace-nowrap text-slate-400 uppercase"
              >
                Graduation Year <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.graduation_year"
                :disabled="isParentRole"
                @change="triggerSave"
                class="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700 transition focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest whitespace-nowrap text-slate-400 uppercase"
                >Primary Sport</label
              >
              <select
                v-model="form.primary_sport"
                :disabled="isParentRole"
                @change="triggerSave"
                class="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700 transition focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
            <div>
              <label
                class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest whitespace-nowrap text-slate-400 uppercase"
              >
                Gender
                <span class="text-slate-400 normal-case">(Optional)</span>
              </label>
              <select
                v-model="form.gender"
                :disabled="isParentRole"
                @change="triggerSave"
                class="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700 transition focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option :value="undefined" disabled>Select…</option>
                <option
                  v-for="opt in genderOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Recruiting Contact (separate from login credentials) -->
      <div
        class="grid grid-cols-1 gap-6 border-t border-slate-100 pt-8 md:grid-cols-2"
      >
        <div>
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
            >Recruiting Email</label
          >
          <input
            v-model="form.email"
            :disabled="isParentRole"
            type="email"
            placeholder="you@example.com"
            data-testid="contact-email"
            @blur="triggerSave"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700 transition focus:ring-2 focus:ring-blue-500"
          />
          <p class="mt-1.5 ml-1 text-xs text-slate-400">
            The email coaches reply to — can differ from your login.
          </p>
        </div>
        <div>
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
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
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-700 transition focus:ring-2 focus:ring-blue-500"
          />
          <p class="mt-1.5 ml-1 text-xs text-slate-400">
            The number coaches can text.
          </p>
        </div>

        <div class="space-y-4 rounded-2xl bg-slate-50 p-4 md:col-span-2">
          <label class="group flex cursor-pointer items-center gap-3">
            <div class="relative flex items-center">
              <input
                v-model="form.allow_share_phone"
                type="checkbox"
                data-testid="share-phone"
                @change="triggerSave"
                class="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white shadow-sm transition-all checked:border-blue-600 checked:bg-blue-600"
              />
              <UIcon
                name="i-heroicons-check"
                class="pointer-events-none absolute top-1 left-1 h-4 w-4 stroke-[3] text-white opacity-0 peer-checked:opacity-100"
              />
            </div>
            <span
              class="text-sm font-bold text-slate-600 transition group-hover:text-slate-900"
              >Show phone number to verified coaches</span
            >
          </label>
          <label class="group flex cursor-pointer items-center gap-3">
            <div class="relative flex items-center">
              <input
                v-model="form.allow_share_email"
                type="checkbox"
                data-testid="share-email"
                @change="triggerSave"
                class="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white shadow-sm transition-all checked:border-blue-600 checked:bg-blue-600"
              />
              <UIcon
                name="i-heroicons-check"
                class="pointer-events-none absolute top-1 left-1 h-4 w-4 stroke-[3] text-white opacity-0 peer-checked:opacity-100"
              />
            </div>
            <span
              class="text-sm font-bold text-slate-600 transition group-hover:text-slate-900"
              >Show email to verified coaches</span
            >
          </label>
        </div>
      </div>

      <!-- Social Media -->
      <div class="border-t border-slate-100 pt-8">
        <h2 class="mb-6 text-base font-bold text-slate-900">Social Handles</h2>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div
            v-for="social in socialInputs"
            :key="social.key"
            class="relative"
            :data-testid="`social-${social.key}`"
          >
            <label
              class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
              >{{ social.label }}</label
            >
            <div class="flex items-center">
              <span
                v-if="social.prefix"
                class="absolute left-4 font-bold text-slate-400"
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
                  'w-full rounded-xl border border-slate-200 bg-slate-50 py-3 font-medium text-slate-700 transition focus:ring-2 focus:ring-blue-500',
                  social.prefix ? 'pr-4 pl-9' : 'px-4',
                ]"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- College Preferences -->
      <div
        class="grid grid-cols-1 gap-6 border-t border-slate-100 pt-8 md:grid-cols-2"
      >
        <div>
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
          >
            Campus Size Preference
          </label>
          <div class="flex rounded-xl bg-slate-100 p-1">
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
                'flex-1 rounded-lg py-2 text-xs font-bold transition-all',
                form.campus_size_preference === opt.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              ]"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="mt-1.5 ml-1 text-xs text-slate-400">
            Used for personal fit analysis
          </p>
        </div>
        <div>
          <label
            class="mb-1.5 ml-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase"
          >
            Cost Sensitivity
          </label>
          <div class="flex rounded-xl bg-slate-100 p-1">
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
                'flex-1 rounded-lg py-2 text-xs font-bold transition-all',
                form.cost_sensitivity === opt.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              ]"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="mt-1.5 ml-1 text-xs text-slate-400">
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
  genderOptions: {
    value: "male" | "female" | "other" | "prefer_not_to_say";
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
