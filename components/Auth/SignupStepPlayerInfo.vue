<template>
  <form class="space-y-6" @submit.prevent="$emit('submit')">
    <!-- Onboarding step 1 (player only) — captured now so there's nothing
         left to ask once the confirmation email is clicked. -->
    <div class="space-y-4 border-t border-slate-200 pt-6">
      <h3 class="text-sm font-semibold text-slate-700">About the player</h3>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            for="signup-graduation-year"
            class="mb-2 block text-sm font-medium text-slate-700"
          >
            Graduation Year
            <span class="ml-1 text-red-600" aria-label="required">*</span>
          </label>
          <select
            id="signup-graduation-year"
            :value="graduationYear"
            required
            :disabled="loading"
            class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            @change="
              $emit(
                'update:graduationYear',
                Number(($event.target as HTMLSelectElement).value),
              )
            "
          >
            <option :value="undefined">Select graduation year</option>
            <option v-for="year in graduationYears" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>

        <div>
          <label
            for="signup-primary-sport"
            class="mb-2 block text-sm font-medium text-slate-700"
          >
            Primary Sport
            <span class="ml-1 text-red-600" aria-label="required">*</span>
          </label>
          <select
            id="signup-primary-sport"
            :value="primarySport"
            required
            :disabled="loading"
            class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            @change="
              $emit(
                'update:primarySport',
                ($event.target as HTMLSelectElement).value,
              )
            "
          >
            <option value="">Select your sport</option>
            <option v-for="sport in commonSports" :key="sport" :value="sport">
              {{ sport }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="!genderIsAutoDerived">
        <label
          for="signup-gender"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Gender (Optional)
        </label>
        <select
          id="signup-gender"
          :value="gender"
          :disabled="loading"
          class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          @change="
            $emit('update:gender', ($event.target as HTMLSelectElement).value)
          "
        >
          <option :value="undefined">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </div>

      <div>
        <label
          for="signup-zip-code"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Zip Code (Optional)
        </label>
        <input
          id="signup-zip-code"
          :value="zipCode"
          type="text"
          autocomplete="postal-code"
          placeholder="Enter your 5-digit zip code"
          maxlength="5"
          :disabled="loading"
          class="w-full rounded-lg border border-slate-300 px-4 py-2 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
          @input="
            $emit('update:zipCode', ($event.target as HTMLInputElement).value)
          "
        />
        <p class="mt-1 text-xs text-slate-500">
          Helps us recommend schools near you.
        </p>
      </div>
    </div>

    <TermsAndSubmit
      class="mt-6 block"
      :agree-to-terms="agreeToTerms"
      :loading="loading"
      :field-errors="fieldErrors"
      :disabled="!canSubmit || loading"
      @update:agree-to-terms="$emit('update:agreeToTerms', $event)"
    >
      <template #captcha>
        <slot name="captcha" />
      </template>
    </TermsAndSubmit>
  </form>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSportsPositionLookup } from "~/composables/useSportsPositionLookup";
import { getGraduationYearOptions } from "~/utils/graduationYears";
import TermsAndSubmit from "~/components/Auth/TermsAndSubmit.vue";

const props = defineProps<{
  graduationYear?: number;
  primarySport?: string;
  gender?: string;
  zipCode?: string;
  agreeToTerms: boolean;
  loading: boolean;
  fieldErrors: Record<string, string>;
}>();

defineEmits<{
  "update:graduationYear": [value: number];
  "update:primarySport": [value: string];
  "update:gender": [value: string];
  "update:zipCode": [value: string];
  "update:agreeToTerms": [value: boolean];
  submit: [];
}>();

const { commonSports } = useSportsPositionLookup();
const graduationYears = computed(() => getGraduationYearOptions());

// Sports whose gender isn't ambiguous — skip asking and derive it silently.
// Mirrors pages/onboarding/index.vue's SPORT_GENDER_MAP (same small,
// stable list — not worth a shared util for five entries).
const SPORT_GENDER_MAP: Record<string, "male" | "female"> = {
  softball: "female",
  "field hockey": "female",
  baseball: "male",
  football: "male",
  wrestling: "male",
};

const genderIsAutoDerived = computed(
  () => (props.primarySport ?? "").toLowerCase() in SPORT_GENDER_MAP,
);

const canSubmit = computed(
  () =>
    props.graduationYear !== undefined &&
    !!props.primarySport?.trim() &&
    props.agreeToTerms,
);
</script>
