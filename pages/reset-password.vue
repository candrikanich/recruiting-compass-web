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
      @submit.prevent="handleResetPassword"
      class="space-y-6"
    >
      <!-- Password -->
      <div>
        <label
          for="password"
          class="block text-sm font-medium text-slate-700 mb-2"
        >
          New Password
        </label>
        <div class="relative">
          <LockClosedIcon
            class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            class="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your new password"
            :disabled="loading || validating"
            @blur="validatePassword"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            <component
              :is="showPassword ? EyeSlashIcon : EyeIcon"
              class="w-5 h-5"
              aria-hidden="true"
            />
          </button>
        </div>
        <FieldError :error="fieldErrors.password" />
      </div>

      <!-- Confirm Password -->
      <div>
        <label
          for="confirmPassword"
          class="block text-sm font-medium text-slate-700 mb-2"
        >
          Confirm Password
        </label>
        <div class="relative">
          <LockClosedIcon
            class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="new-password"
            class="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Confirm your new password"
            :disabled="loading || validating"
            @blur="validateConfirmPassword"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            <component
              :is="showPassword ? EyeSlashIcon : EyeIcon"
              class="w-5 h-5"
              aria-hidden="true"
            />
          </button>
        </div>
        <FieldError :error="fieldErrors.confirmPassword" />
      </div>

      <!-- Password Requirements Checklist -->
      <PasswordRequirements :password="password" />

      <!-- Submit -->
      <button
        ref="submitButtonRef"
        data-testid="reset-password-button"
        type="submit"
        :disabled="!isFormValid || loading || validating"
        :aria-busy="loading"
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
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/vue/24/outline";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import FieldError from "~/components/DesignSystem/FieldError.vue";
import { usePasswordReset } from "~/composables/usePasswordReset";
import { useFormValidation } from "~/composables/useFormValidation";
import { resetPasswordSchema } from "~/utils/validation/schemas";
import { z } from "zod";

const PASSWORD_SCHEMA = z.object({
  password: resetPasswordSchema.shape.password,
  confirmPassword: z.string(),
});

const router = useRouter();

const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const loading = ref(false);
const validating = ref(false);
const passwordUpdated = ref(false);
const invalidToken = ref(false);
const invalidTokenMessage = ref("");
const isValidating = ref(false);
const loginLinkRef = ref<HTMLAnchorElement | null>(null);

const passwordReset = usePasswordReset();
const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors } =
  useFormValidation();

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
