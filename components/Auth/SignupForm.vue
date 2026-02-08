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
    <p class="text-sm text-slate-600 mb-6">
      <span class="text-red-600">*</span> Indicates a required field
    </p>

    <!-- Name Fields -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LoginInputField
        id="firstName"
        label="First Name"
        type="text"
        placeholder="John"
        autocomplete="given-name"
        :model-value="firstName"
        :error="fieldErrors.firstName"
        :disabled="disabled"
        :icon="UserIcon"
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
        :icon="UserIcon"
        :required="true"
        @update:model-value="$emit('update:lastName', $event)"
      />
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
      :icon="EnvelopeIcon"
      :required="true"
      @update:model-value="$emit('update:email', $event)"
      @blur="$emit('validateEmail')"
    />

    <!-- Family Code (Parents only) -->
    <div v-if="userType === 'parent'">
      <label
        for="familyCode"
        class="block text-sm font-medium text-slate-700 mb-2"
      >
        Family Code
        <span class="text-slate-500 font-normal">(optional)</span>
      </label>
      <input
        id="familyCode"
        :value="familyCode"
        type="text"
        aria-describedby="familyCode-help"
        :aria-invalid="fieldErrors.familyCode ? 'true' : 'false'"
        :class="[
          'w-full px-4 py-3 border rounded-lg transition-all focus:ring-2 focus:ring-offset-2 focus:outline-2 focus:border-transparent uppercase',
          fieldErrors.familyCode
            ? 'border-red-600 focus:ring-red-500 focus:outline-red-600'
            : 'border-slate-300 focus:ring-blue-500 focus:outline-blue-600',
        ]"
        placeholder="FAM-XXXXXXXX"
        :disabled="disabled"
        @input="
          $emit('update:familyCode', ($event.target as HTMLInputElement).value)
        "
        @blur="$emit('validateFamilyCode')"
      />
      <p id="familyCode-help" class="text-xs text-slate-500 mt-1">
        If you have your player's family code, enter it here to link your
        accounts. You can add it later.
      </p>
      <FieldError id="familyCode-error" :error="fieldErrors.familyCode" />
    </div>

    <!-- Password Fields -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LoginInputField
        id="password"
        label="Password"
        type="password"
        placeholder="Create a password"
        autocomplete="new-password"
        :model-value="password"
        :error="fieldErrors.password"
        :disabled="disabled"
        :icon="LockClosedIcon"
        :required="true"
        @update:model-value="$emit('update:password', $event)"
        @blur="$emit('validatePassword')"
      />
      <div>
        <label
          for="confirmPassword"
          class="block text-sm font-medium text-slate-700 mb-2"
        >
          Confirm Password
          <span class="text-red-600 ml-1" aria-label="required">*</span>
        </label>
        <div class="relative">
          <LockClosedIcon
            class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
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
              'w-full pl-10 pr-4 py-3 border rounded-lg transition-all focus:ring-2 focus:ring-offset-2 focus:outline-2 focus:border-transparent',
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
    <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
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
            'mt-1 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            fieldErrors.terms && 'border-red-600',
          ]"
          @change="
            $emit(
              'update:agreeToTerms',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        <label for="agreeToTerms" class="text-slate-700 text-sm flex-1">
          I agree to the
          <NuxtLink
            to="/legal/terms"
            class="text-blue-600 hover:text-blue-700 underline rounded px-1 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
          >
            Terms and Conditions
          </NuxtLink>
          and
          <NuxtLink
            to="/legal/privacy"
            class="text-blue-600 hover:text-blue-700 underline rounded px-1 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
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
      class="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-lg disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
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
    <p class="text-slate-600 text-sm">
      <NuxtLink
        to="/login"
        class="text-blue-600 hover:text-blue-700 font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded px-1 transition-colors"
      >
        Sign in instead
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
} from "@heroicons/vue/24/outline";
import LoginInputField from "~/components/Auth/LoginInputField.vue";
import FieldError from "~/components/DesignSystem/FieldError.vue";
import type { FormFieldError } from "~/composables/useFormValidation";

const props = defineProps<{
  userType: "player" | "parent";
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  familyCode: string;
  agreeToTerms: boolean;
  loading: boolean;
  hasErrors: boolean;
  fieldErrors: Record<string, string>;
}>();

defineEmits<{
  "update:firstName": [value: string];
  "update:lastName": [value: string];
  "update:email": [value: string];
  "update:password": [value: string];
  "update:confirmPassword": [value: string];
  "update:familyCode": [value: string];
  "update:agreeToTerms": [value: boolean];
  submit: [];
  validateEmail: [];
  validatePassword: [];
  validateFamilyCode: [];
}>();

const disabled = computed(() => props.loading);

const isFormValid = computed(() => {
  return (
    !props.hasErrors &&
    props.firstName.trim() &&
    props.lastName.trim() &&
    props.email.trim() &&
    props.password.trim() &&
    props.confirmPassword.trim() &&
    props.agreeToTerms
  );
});
</script>

<style scoped>
.sr-only {
  @apply absolute w-1 h-1 p-0 -m-1 overflow-hidden whitespace-nowrap border-0;
}

.sr-only:focus,
.focus\:not-sr-only:focus {
  @apply relative w-auto h-auto p-2 m-0 overflow-visible whitespace-normal;
}
</style>
