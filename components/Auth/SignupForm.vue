<template>
  <form
    id="signup-form"
    :aria-label="`Create ${userType === 'player' ? 'player' : 'parent'} account`"
    @submit.prevent="$emit('submit')"
    class="space-y-6"
    :data-testid="`signup-form-${userType}`"
    :aria-describedby="hasErrors ? 'form-error-summary' : undefined"
  >
    <h2 class="sr-only">
      {{ userType === "player" ? "Player" : "Parent" }} Information
    </h2>

    <!-- Required field indicator -->
    <p class="mb-6 text-sm text-slate-600">
      <span class="text-red-600">*</span> Indicates a required field
    </p>

    <!-- Name Fields -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <LoginInputField
        id="firstName"
        label="First Name"
        type="text"
        placeholder="John"
        autocomplete="given-name"
        :model-value="firstName"
        :error="fieldErrors.firstName"
        :disabled="disabled"
        icon="i-heroicons-user"
        :required="true"
        @update:model-value="$emit('update:firstName', $event)"
      />
      <LoginInputField
        id="lastName"
        label="Last Name"
        type="text"
        placeholder="Smith"
        autocomplete="family-name"
        :model-value="lastName"
        :error="fieldErrors.lastName"
        :disabled="disabled"
        icon="i-heroicons-user"
        :required="true"
        @update:model-value="$emit('update:lastName', $event)"
      />
    </div>

    <!-- Date of Birth (players only — COPPA compliance) -->
    <div v-if="userType === 'player'">
      <label
        for="dateOfBirth"
        class="mb-2 block text-sm font-medium text-slate-700"
      >
        Player Date of Birth
        <span class="ml-1 text-red-600" aria-label="required">*</span>
      </label>
      <div class="relative">
        <UIcon
          name="i-heroicons-calendar"
          class="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id="dateOfBirth"
          :value="dateOfBirth"
          type="date"
          required
          aria-required="true"
          :aria-invalid="fieldErrors.dateOfBirth ? 'true' : 'false'"
          :aria-describedby="
            fieldErrors.dateOfBirth ? 'dateOfBirth-error' : 'dateOfBirth-hint'
          "
          :max="maxDateOfBirth"
          :class="[
            'w-full rounded-lg border py-3 pr-4 pl-10 transition-all focus:border-transparent focus:ring-2 focus:ring-offset-2 focus:outline-2',
            fieldErrors.dateOfBirth
              ? 'border-red-600 focus:ring-red-500 focus:outline-red-600'
              : 'border-slate-300 focus:ring-blue-500 focus:outline-blue-600',
          ]"
          :disabled="disabled"
          @input="
            $emit(
              'update:dateOfBirth',
              ($event.target as HTMLInputElement).value,
            )
          "
        />
      </div>
      <p id="dateOfBirth-hint" class="mt-1 text-xs text-slate-500">
        Recruiting Compass is for ages 13 and up. By entering a date of birth,
        you confirm you are 13 or older.
      </p>
      <FieldError id="dateOfBirth-error" :error="fieldErrors.dateOfBirth" />
    </div>


    <!-- Email -->
    <LoginInputField
      id="email"
      label="Email"
      type="email"
      placeholder="your.email@example.com"
      autocomplete="email"
      :model-value="email"
      :error="fieldErrors.email"
      :disabled="disabled"
      icon="i-heroicons-envelope"
      :required="true"
      @update:model-value="$emit('update:email', $event)"
      @blur="$emit('validateEmail')"
    />

    <!-- Password Fields -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <LoginInputField
        id="password"
        label="Password"
        type="password"
        placeholder="Create a password"
        autocomplete="new-password"
        :model-value="password"
        :error="fieldErrors.password"
        :disabled="disabled"
        icon="i-heroicons-lock-closed"
        :required="true"
        described-by="password-requirements"
        @update:model-value="$emit('update:password', $event)"
        @blur="$emit('validatePassword')"
      />
      <div>
        <label
          for="confirmPassword"
          class="mb-2 block text-sm font-medium text-slate-700"
        >
          Confirm Password
          <span class="ml-1 text-red-600" aria-label="required">*</span>
        </label>
        <div class="relative">
          <UIcon
            name="i-heroicons-lock-closed"
            class="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="confirmPassword"
            :value="confirmPassword"
            type="password"
            required
            aria-required="true"
            autocomplete="new-password"
            :aria-invalid="fieldErrors.confirmPassword ? 'true' : 'false'"
            :class="[
              'w-full rounded-lg border py-3 pr-4 pl-10 transition-all focus:border-transparent focus:ring-2 focus:ring-offset-2 focus:outline-2',
              fieldErrors.confirmPassword
                ? 'border-red-600 focus:ring-red-500 focus:outline-red-600'
                : 'border-slate-300 focus:ring-blue-500 focus:outline-blue-600',
            ]"
            placeholder="Confirm password"
            :disabled="disabled"
            @input="
              $emit(
                'update:confirmPassword',
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </div>
        <FieldError
          id="confirmPassword-error"
          :error="fieldErrors.confirmPassword"
        />
      </div>
    </div>

    <!-- Password Requirements Hint -->
    <p id="password-requirements" class="text-xs text-slate-500">
      Must be 8+ characters with uppercase, lowercase, and a number
    </p>

    <!-- Loading indicator (screen reader announcement) -->
    <div
      v-if="loading"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      Creating your account, please wait...
    </div>

    <!-- Terms and Conditions -->
    <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div class="flex items-start gap-3">
        <input
          id="agreeToTerms"
          :checked="agreeToTerms"
          type="checkbox"
          required
          aria-required="true"
          :aria-invalid="fieldErrors.terms ? 'true' : 'false'"
          :aria-describedby="fieldErrors.terms ? 'terms-error' : undefined"
          :class="[
            'mt-1 rounded-sm border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            fieldErrors.terms && 'border-red-600',
          ]"
          @change="
            $emit(
              'update:agreeToTerms',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        <label for="agreeToTerms" class="flex-1 text-sm text-slate-700">
          I agree to the
          <NuxtLink
            to="/legal/terms"
            class="rounded-sm px-1 text-blue-600 underline hover:text-blue-700 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
          >
            Terms and Conditions
          </NuxtLink>
          and
          <NuxtLink
            to="/legal/privacy"
            class="rounded-sm px-1 text-blue-600 underline hover:text-blue-700 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
          >
            Privacy Policy
          </NuxtLink>
        </label>
      </div>
      <FieldError
        v-if="fieldErrors.terms"
        id="terms-error"
        :error="fieldErrors.terms"
      />
    </div>

    <!-- Submit -->
    <button
      data-testid="signup-button"
      type="submit"
      :disabled="!isFormValid || disabled"
      :aria-busy="loading"
      :aria-label="loading ? 'Creating account, please wait' : 'Create Account'"
      class="w-full rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400"
    >
      {{ loading ? "Creating account..." : "Create Account" }}
    </button>
  </form>

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
</template>

<script setup lang="ts">
import { computed } from "vue";
import LoginInputField from "~/components/Auth/LoginInputField.vue";
import FieldError from "~/components/DesignSystem/FieldError.vue";
import type { FormFieldError } from "~/composables/useFormValidation";

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
}>();

defineEmits<{
  "update:firstName": [value: string];
  "update:lastName": [value: string];
  "update:email": [value: string];
  "update:dateOfBirth": [value: string];
  "update:password": [value: string];
  "update:confirmPassword": [value: string];
  "update:agreeToTerms": [value: boolean];
  submit: [];
  validateEmail: [];
  validatePassword: [];
}>();

const disabled = computed(() => props.loading);

// Max selectable date: today (no future dates)
const maxDateOfBirth = computed(() => new Date().toISOString().split("T")[0]);

const isFormValid = computed(() => {
  return (
    !props.hasErrors &&
    props.firstName.trim() &&
    props.lastName.trim() &&
    props.email.trim() &&
    (props.userType === "parent" || props.dateOfBirth.trim()) &&
    props.password.trim() &&
    props.confirmPassword.trim() &&
    props.agreeToTerms
  );
});
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
