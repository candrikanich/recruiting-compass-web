<template>
  <AuthPageLayout :back-link="{ to: '/', text: 'Back to Home' }">
    <!-- Status Icon & Header -->
    <div class="text-center mb-8">
      <AuthStatusIcon
        :status="
          isValidating
            ? 'validating'
            : passwordUpdated
              ? 'success'
              : invalidToken
                ? 'error'
                : 'default'
        "
        icon="lock"
        :ariaLabel="statusIconLabel"
      />

      <h1 class="text-slate-900 text-3xl font-bold mb-2">
        {{
          passwordUpdated
            ? "Password Reset"
            : invalidToken
              ? "Invalid Link"
              : "Create New Password"
        }}
      </h1>
      <p class="text-slate-600">
        {{
          passwordUpdated
            ? "Your password has been successfully reset"
            : invalidToken
              ? "This reset link is invalid or has expired"
              : "Enter your new password below"
        }}
      </p>
    </div>

    <!-- Status messages -->
    <section aria-label="Status messages" class="mb-8 space-y-4">
      <!-- Invalid token error -->
      <AuthStatusMessage v-if="invalidToken" variant="error">
        <p class="text-sm font-medium">{{ invalidTokenMessage }}</p>
      </AuthStatusMessage>

      <!-- Success message -->
      <AuthStatusMessage v-if="passwordUpdated" variant="success">
        <p class="text-sm font-medium">
          Your password has been successfully reset. You can now log in with
          your new password.
        </p>
      </AuthStatusMessage>

      <!-- Form errors -->
      <FormErrorSummary
        v-if="hasErrors && !passwordUpdated && !invalidToken"
        :errors="errors"
        @dismiss="clearErrors"
      />

      <!-- API error from password reset -->
      <AuthStatusMessage
        v-if="passwordReset.error.value && !passwordUpdated && !invalidToken"
        variant="error"
      >
        <p class="text-sm font-medium">{{ passwordReset.error.value }}</p>
      </AuthStatusMessage>
    </section>

    <!-- Form -->
    <form
      v-if="!passwordUpdated && !invalidToken"
      aria-label="Create new password"
      @submit.prevent="handleResetPassword"
      class="space-y-6"
    >
      <!-- Password -->
      <PasswordInput
        id="password"
        label="New Password"
        placeholder="Enter your new password"
        autocomplete="new-password"
        :model-value="password"
        :error="fieldErrors.password"
        :disabled="loading || validating"
        :show-toggle="true"
        aria-describedby="password-requirements"
        @update:model-value="password = $event"
        @blur="validatePassword"
      />

      <!-- Confirm Password -->
      <div>
        <PasswordInput
          id="confirmPassword"
          label="Confirm Password"
          placeholder="Confirm your new password"
          autocomplete="new-password"
          :model-value="confirmPassword"
          :error="fieldErrors.confirmPassword"
          :disabled="loading || validating"
          :show-toggle="true"
          aria-describedby="confirm-password-help"
          @update:model-value="confirmPassword = $event"
          @blur="validateConfirmPassword"
        />
        <p id="confirm-password-help" class="mt-1 text-xs text-slate-600">
          Must match your new password
        </p>
      </div>

      <!-- Password Requirements Checklist -->
      <PasswordRequirements :password="password" />

      <!-- Submit -->
      <button
        ref="submitButtonRef"
        data-testid="reset-password-button"
        type="submit"
        :disabled="!isFormValid || loading || validating"
        :aria-busy="loading || validating"
        :aria-label="
          loading
            ? 'Resetting password, please wait'
            : validating
              ? 'Validating your information'
              : 'Reset your password'
        "
        class="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {{
          loading
            ? "Resetting..."
            : validating
              ? "Validating..."
              : "Reset Password"
        }}
      </button>
    </form>

    <!-- SR-only countdown announcement -->
    <div
      v-if="passwordUpdated && redirectCountdown > 0"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      Redirecting to login in {{ redirectCountdown }} second{{
        redirectCountdown !== 1 ? "s" : ""
      }}
    </div>

    <!-- Success Actions -->
    <section v-if="passwordUpdated" aria-label="Next steps" class="space-y-4">
      <NuxtLink
        ref="loginLinkRef"
        to="/login"
        class="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Go to Login
      </NuxtLink>

      <NuxtLink
        to="/"
        class="block w-full py-3 px-4 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-colors text-center focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
      >
        Back to Home
      </NuxtLink>
    </section>

    <!-- Error Actions -->
    <section
      v-if="invalidToken"
      aria-label="Recovery options"
      class="space-y-4"
    >
      <NuxtLink
        to="/forgot-password"
        class="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Request New Reset Link
      </NuxtLink>

      <NuxtLink
        to="/login"
        class="block w-full py-3 px-4 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-colors text-center focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
      >
        Back to Login
      </NuxtLink>
    </section>
  </AuthPageLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });

import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useRouter } from "vue-router";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import PasswordInput from "~/components/PasswordInput.vue";
import { usePasswordReset } from "~/composables/usePasswordReset";
import { useFormValidation } from "~/composables/useFormValidation";
import { useFormErrorFocus } from "~/composables/useFormErrorFocus";
import { resetPasswordSchema } from "~/utils/validation/schemas";
import { z } from "zod";

const PASSWORD_SCHEMA = z.object({
  password: resetPasswordSchema.shape.password,
  confirmPassword: z.string(),
});

const router = useRouter();

const password = ref("");
const confirmPassword = ref("");
const passwordUpdated = ref(false);

const { loading, validating } = useLoadingStates();
const invalidToken = ref(false);
const invalidTokenMessage = ref("");
const isValidating = ref(false);
const loginLinkRef = ref<HTMLAnchorElement | null>(null);
const redirectCountdown = ref(0);

const passwordReset = usePasswordReset();
const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors } =
  useFormValidation();
const { focusErrorSummary } = useFormErrorFocus();

const statusIconLabel = computed(() => {
  if (isValidating.value) return "Validating reset link";
  if (passwordUpdated.value) return "Password reset successful";
  if (invalidToken.value) return "Invalid or expired reset link";
  return "Create new password";
});

const isFormValid = computed(() => {
  const passwordValid =
    password.value.length >= 8 &&
    /[A-Z]/.test(password.value) &&
    /[a-z]/.test(password.value) &&
    /[0-9]/.test(password.value);
  const passwordsMatch = password.value === confirmPassword.value;

  return !hasErrors.value && passwordValid && passwordsMatch;
});

watch(passwordUpdated, async (updated) => {
  if (updated) {
    await nextTick();
    const loginEl = document.querySelector('a[href="/login"]') as HTMLElement;
    loginEl?.focus();

    // Start countdown
    redirectCountdown.value = 2;
    const countdownInterval = setInterval(() => {
      redirectCountdown.value--;
      if (redirectCountdown.value <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }
});

const validatePassword = async () => {
  validating.value = true;
  try {
    await validateField(
      "password",
      password.value,
      PASSWORD_SCHEMA.shape.password,
    );
  } finally {
    validating.value = false;
  }
};

const validateConfirmPassword = async () => {
  validating.value = true;
  try {
    if (password.value !== confirmPassword.value) {
      await validateField("confirmPassword", "", z.string());
    }
  } finally {
    validating.value = false;
  }
};

const handleResetPassword = async () => {
  const validated = await validate(
    {
      password: password.value,
      confirmPassword: confirmPassword.value,
    },
    resetPasswordSchema,
  );

  if (!validated) {
    await focusErrorSummary();
    return;
  }

  loading.value = true;

  try {
    const success = await passwordReset.confirmPasswordReset(
      validated.password,
    );

    if (success) {
      passwordUpdated.value = true;
    }
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  const supabase = useSupabase();

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    invalidToken.value = true;
    invalidTokenMessage.value =
      "No reset link provided. Please request a new password reset.";
  }
});
</script>
