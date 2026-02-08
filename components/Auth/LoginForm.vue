<template>
  <form
    id="login-form"
    aria-label="Sign in to your account"
    @submit.prevent="$emit('submit')"
    class="space-y-6"
    :aria-describedby="hasErrors ? 'form-error-summary' : undefined"
  >
    <!-- Email -->
    <LoginInputField
      id="email"
      label="Email"
      type="email"
      placeholder="Example: coach@school.edu"
      autocomplete="email"
      :model-value="email"
      :error="fieldErrors.email"
      :disabled="disabled"
      :icon="EnvelopeIcon"
      @update:model-value="$emit('update:email', $event)"
      @blur="$emit('validateEmail')"
    />

    <!-- Password -->
    <LoginInputField
      id="password"
      label="Password"
      type="password"
      placeholder="At least 8 characters"
      autocomplete="current-password"
      :model-value="password"
      :error="fieldErrors.password"
      :disabled="disabled"
      :icon="LockClosedIcon"
      @update:model-value="$emit('update:password', $event)"
      @blur="$emit('validatePassword')"
    />

    <!-- Remember Me & Forgot Password -->
    <div class="flex items-center justify-between pt-1">
      <label
        for="rememberMe"
        class="flex items-center gap-2 cursor-pointer group"
      >
        <input
          id="rememberMe"
          :checked="rememberMe"
          data-testid="remember-me-checkbox"
          type="checkbox"
          class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600 transition-all cursor-pointer"
          @change="
            $emit(
              'update:rememberMe',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        <span class="text-sm text-slate-600 group-hover:text-slate-700">
          Remember me
        </span>
      </label>
      <NuxtLink
        to="/forgot-password"
        class="text-sm text-slate-700 hover:text-blue-600 font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded px-2 py-1 transition-colors"
      >
        Forgot password?
      </NuxtLink>
    </div>

    <!-- Submit -->
    <button
      data-testid="login-button"
      type="submit"
      :disabled="!isFormValid || disabled"
      :aria-busy="loading || validating"
      :aria-label="
        loading
          ? 'Signing in, please wait'
          : validating
            ? 'Validating your information'
            : 'Sign in to your account'
      "
      class="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
    >
      {{ loading ? "Signing in..." : validating ? "Validating..." : "Sign In" }}
    </button>
  </form>

  <!-- Divider -->
  <div class="relative my-6" aria-hidden="true">
    <div class="absolute inset-0 flex items-center">
      <div class="w-full border-t border-slate-200"></div>
    </div>
    <div class="relative flex justify-center text-sm">
      <span class="bg-white px-4 text-slate-500"
        >New to Recruiting Compass?</span
      >
    </div>
  </div>

  <!-- Create Account Link -->
  <div class="text-center">
    <p class="text-slate-600 text-sm">
      Don't have an account?
      <NuxtLink
        to="/signup"
        class="text-blue-600 hover:text-blue-700 font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded px-1 transition-colors"
      >
        Create one now
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { EnvelopeIcon, LockClosedIcon } from "@heroicons/vue/24/outline";
import LoginInputField from "~/components/Auth/LoginInputField.vue";
import type { FormFieldError } from "~/composables/useFormValidation";

const props = defineProps<{
  email: string;
  password: string;
  rememberMe: boolean;
  loading: boolean;
  validating: boolean;
  hasErrors: boolean;
  fieldErrors: Record<string, string>;
}>();

defineEmits<{
  "update:email": [value: string];
  "update:password": [value: string];
  "update:rememberMe": [value: boolean];
  submit: [];
  validateEmail: [];
  validatePassword: [];
}>();

const disabled = computed(() => props.loading || props.validating);

const isFormValid = computed(
  () => !props.hasErrors && props.email.trim() && props.password.trim(),
);
</script>
