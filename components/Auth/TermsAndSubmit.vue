<template>
  <div class="space-y-6">
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
      :disabled="disabled"
      :aria-busy="loading"
      :aria-label="loading ? 'Creating account, please wait' : 'Create Account'"
      class="w-full rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400"
    >
      {{ loading ? "Creating account..." : "Create Account" }}
    </button>
  </div>
</template>

<script setup lang="ts">
import FieldError from "~/components/DesignSystem/FieldError.vue";

defineProps<{
  agreeToTerms: boolean;
  loading: boolean;
  fieldErrors: Record<string, string>;
  disabled: boolean;
}>();
defineEmits<{ "update:agreeToTerms": [value: boolean] }>();
</script>
