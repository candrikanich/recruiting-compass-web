<template>
  <div>
    <p class="mb-6 text-sm text-slate-600">
      <span class="text-red-600">*</span> Indicates a required field
    </p>

    <form
      v-if="userType === 'parent'"
      id="signup-form"
      aria-label="Create parent account"
      :aria-describedby="hasErrors ? 'form-error-summary' : undefined"
      @submit.prevent="$emit('submit')"
      class="space-y-6"
      data-testid="signup-form-parent"
    >
      <h2 class="sr-only">Parent Information</h2>
      <SignupStepAccount
        :user-type="userType"
        :first-name="firstName"
        :last-name="lastName"
        :email="email"
        :date-of-birth="dateOfBirth"
        :password="password"
        :confirm-password="confirmPassword"
        :loading="loading"
        :field-errors="fieldErrors"
        @update:first-name="$emit('update:firstName', $event)"
        @update:last-name="$emit('update:lastName', $event)"
        @update:email="$emit('update:email', $event)"
        @update:date-of-birth="$emit('update:dateOfBirth', $event)"
        @update:password="$emit('update:password', $event)"
        @update:confirm-password="$emit('update:confirmPassword', $event)"
        @validate-email="$emit('validateEmail')"
        @validate-password="$emit('validatePassword')"
      />
      <TermsAndSubmit
        :agree-to-terms="agreeToTerms"
        :loading="loading"
        :field-errors="fieldErrors"
        :disabled="!isParentFormValid"
        @update:agree-to-terms="$emit('update:agreeToTerms', $event)"
      />
    </form>

    <div v-else data-testid="signup-form-player">
      <h2 class="sr-only">Player Information</h2>
      <form
        v-if="currentStep === 'account'"
        id="signup-form"
        aria-label="Create player account"
        :aria-describedby="hasErrors ? 'form-error-summary' : undefined"
        @submit.prevent="goToStepAfterAccount"
      >
        <SignupStepAccount
          :user-type="userType"
          :first-name="firstName"
          :last-name="lastName"
          :email="email"
          :date-of-birth="dateOfBirth"
          :password="password"
          :confirm-password="confirmPassword"
          :loading="loading"
          :field-errors="fieldErrors"
          @update:first-name="$emit('update:firstName', $event)"
          @update:last-name="$emit('update:lastName', $event)"
          @update:email="$emit('update:email', $event)"
          @update:date-of-birth="$emit('update:dateOfBirth', $event)"
          @update:password="$emit('update:password', $event)"
          @update:confirm-password="$emit('update:confirmPassword', $event)"
          @validate-email="$emit('validateEmail')"
          @validate-password="$emit('validatePassword')"
        />
        <button
          type="submit"
          data-testid="signup-step-continue"
          :disabled="!canContinueAccount"
          class="mt-4 w-full rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400"
          @click="goToStepAfterAccount"
        >
          Continue
        </button>
      </form>

      <form
        v-if="currentStep === 'guardian'"
        aria-label="Add a parent or guardian"
        @submit.prevent="currentStep = 'info'"
      >
        <SignupStepGuardian
          :guardian-email="guardianEmail"
          :loading="loading"
          :field-errors="fieldErrors"
          @update:guardian-email="$emit('update:guardianEmail', $event)"
          @continue="currentStep = 'info'"
          @skip="skipGuardian"
        />
      </form>

      <SignupStepPlayerInfo
        v-if="currentStep === 'info'"
        :graduation-year="graduationYear"
        :primary-sport="primarySport"
        :gender="gender"
        :zip-code="zipCode"
        :agree-to-terms="agreeToTerms"
        :loading="loading"
        :field-errors="fieldErrors"
        @update:graduation-year="$emit('update:graduationYear', $event)"
        @update:primary-sport="$emit('update:primarySport', $event)"
        @update:gender="$emit('update:gender', $event)"
        @update:zip-code="$emit('update:zipCode', $event)"
        @update:agree-to-terms="$emit('update:agreeToTerms', $event)"
        @submit="$emit('submit')"
      />
    </div>

    <!-- Divider -->
    <div class="relative my-6" aria-hidden="true">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-slate-200"></div>
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="bg-white px-4 text-slate-500">Already have an account?</span>
      </div>
    </div>

    <!-- Sign In Link -->
    <div class="text-center">
      <p class="text-sm text-slate-600">
        <NuxtLink
          to="/login"
          class="rounded-sm px-1 font-medium text-blue-600 underline transition-colors hover:text-blue-700 hover:no-underline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Sign in instead
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import SignupStepAccount from "~/components/Auth/SignupStepAccount.vue";
import SignupStepGuardian from "~/components/Auth/SignupStepGuardian.vue";
import SignupStepPlayerInfo from "~/components/Auth/SignupStepPlayerInfo.vue";
import TermsAndSubmit from "~/components/Auth/TermsAndSubmit.vue";

const props = defineProps<{
  userType: "player" | "parent";
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  loading: boolean;
  hasErrors: boolean;
  fieldErrors: Record<string, string>;
  graduationYear?: number;
  primarySport?: string;
  gender?: string;
  zipCode?: string;
  guardianEmail?: string;
  /** True when the entered DOB puts the player in the 13-17 band. */
  requiresGuardian?: boolean;
}>();

const emit = defineEmits<{
  "update:firstName": [value: string];
  "update:lastName": [value: string];
  "update:email": [value: string];
  "update:dateOfBirth": [value: string];
  "update:password": [value: string];
  "update:confirmPassword": [value: string];
  "update:agreeToTerms": [value: boolean];
  "update:graduationYear": [value: number];
  "update:primarySport": [value: string];
  "update:gender": [value: string];
  "update:zipCode": [value: string];
  "update:guardianEmail": [value: string];
  submit: [];
  validateEmail: [];
  validatePassword: [];
}>();

const currentStep = ref<"account" | "guardian" | "info">("account");

const canContinueAccount = computed(
  () =>
    !props.hasErrors &&
    !!props.firstName.trim() &&
    !!props.lastName.trim() &&
    !!props.email.trim() &&
    !!props.dateOfBirth.trim() &&
    !!props.password.trim() &&
    !!props.confirmPassword.trim() &&
    props.password === props.confirmPassword,
);

const isParentFormValid = computed(
  () =>
    !props.hasErrors &&
    !!props.firstName.trim() &&
    !!props.lastName.trim() &&
    !!props.email.trim() &&
    !!props.password.trim() &&
    !!props.confirmPassword.trim() &&
    props.agreeToTerms,
);

function goToStepAfterAccount() {
  if (!canContinueAccount.value) return;
  currentStep.value = props.requiresGuardian ? "guardian" : "info";
}

function skipGuardian() {
  emit("update:guardianEmail", "");
  currentStep.value = "info";
}
</script>

<style scoped>
@reference "tailwindcss";

.sr-only {
  @apply absolute -m-1 h-1 w-1 overflow-hidden border-0 p-0 whitespace-nowrap;
}

.sr-only:focus,
.focus\:not-sr-only:focus {
  @apply relative m-0 h-auto w-auto overflow-visible p-2 whitespace-normal;
}
</style>
