<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <AuthMultiSportFieldBackground />

    <main
      class="relative z-10 min-h-screen flex items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-md">
        <!-- Navigation -->
        <nav aria-label="Page navigation" class="mb-6">
          <NuxtLink
            to="/"
            class="text-white hover:text-white/80 transition-colors flex items-center gap-2 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          >
            <ArrowLeftIcon class="w-4 h-4" aria-hidden="true" />
            Back to Home
          </NuxtLink>
        </nav>

        <!-- Reset Password Card -->
        <div
          class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <!-- Status Icon & Header -->
          <div class="text-center mb-8">
            <div
              class="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
              :class="{
                'bg-emerald-100': passwordUpdated,
                'bg-amber-100': !passwordUpdated && !invalidToken,
                'bg-red-100': invalidToken,
                'bg-blue-100': isValidating,
              }"
              role="img"
              :aria-label="statusIconLabel"
            >
              <!-- Validating state -->
              <svg
                v-if="isValidating"
                class="w-11 h-11 text-blue-600 animate-spin motion-reduce:animate-none"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>

              <!-- Success state -->
              <svg
                v-else-if="passwordUpdated"
                class="w-11 h-11 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <!-- Error state -->
              <svg
                v-else-if="invalidToken"
                class="w-11 h-11 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <!-- Form state -->
              <svg
                v-else
                class="w-11 h-11 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>

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
            <div
              v-if="invalidToken"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              class="p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p class="text-red-900 text-sm font-medium">
                {{ invalidTokenMessage }}
              </p>
            </div>

            <!-- Success message -->
            <div
              v-if="passwordUpdated"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              class="p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
            >
              <p class="text-emerald-900 text-sm font-medium">
                Your password has been successfully reset. You can now log in
                with your new password.
              </p>
            </div>

            <!-- Form errors -->
            <FormErrorSummary
              v-if="hasErrors && !passwordUpdated && !invalidToken"
              :errors="errors"
              @dismiss="clearErrors"
            />

            <!-- API error from password reset -->
            <div
              v-if="
                passwordReset.error.value && !passwordUpdated && !invalidToken
              "
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              class="p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p class="text-red-900 text-sm font-medium">
                {{ passwordReset.error.value }}
              </p>
            </div>
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
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
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
                  class="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm your new password"
                  :disabled="loading || validating"
                  @blur="validateConfirmPassword"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
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
            <div
              class="p-4 bg-slate-50 rounded-lg border border-slate-200"
              role="list"
              aria-label="Password requirements"
            >
              <p class="text-sm font-medium text-slate-700 mb-3">
                Password must contain:
              </p>
              <ul class="space-y-2">
                <li class="flex items-center gap-2 text-sm" role="listitem">
                  <CheckCircleIcon
                    v-if="password.length >= 8"
                    class="w-5 h-5 text-emerald-600 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <svg
                    v-else
                    class="w-5 h-5 text-slate-300 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" stroke-width="2" />
                  </svg>
                  <span
                    :class="
                      password.length >= 8 ? 'text-slate-900' : 'text-slate-500'
                    "
                  >
                    At least 8 characters
                  </span>
                </li>
                <li class="flex items-center gap-2 text-sm" role="listitem">
                  <CheckCircleIcon
                    v-if="/[A-Z]/.test(password)"
                    class="w-5 h-5 text-emerald-600 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <svg
                    v-else
                    class="w-5 h-5 text-slate-300 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" stroke-width="2" />
                  </svg>
                  <span
                    :class="
                      /[A-Z]/.test(password)
                        ? 'text-slate-900'
                        : 'text-slate-500'
                    "
                  >
                    One uppercase letter
                  </span>
                </li>
                <li class="flex items-center gap-2 text-sm" role="listitem">
                  <CheckCircleIcon
                    v-if="/[a-z]/.test(password)"
                    class="w-5 h-5 text-emerald-600 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <svg
                    v-else
                    class="w-5 h-5 text-slate-300 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" stroke-width="2" />
                  </svg>
                  <span
                    :class="
                      /[a-z]/.test(password)
                        ? 'text-slate-900'
                        : 'text-slate-500'
                    "
                  >
                    One lowercase letter
                  </span>
                </li>
                <li class="flex items-center gap-2 text-sm" role="listitem">
                  <CheckCircleIcon
                    v-if="/[0-9]/.test(password)"
                    class="w-5 h-5 text-emerald-600 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <svg
                    v-else
                    class="w-5 h-5 text-slate-300 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" stroke-width="2" />
                  </svg>
                  <span
                    :class="
                      /[0-9]/.test(password)
                        ? 'text-slate-900'
                        : 'text-slate-500'
                    "
                  >
                    One number
                  </span>
                </li>
              </ul>
            </div>

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
          <section
            v-if="passwordUpdated"
            aria-label="Next steps"
            class="space-y-4"
          >
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
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });

import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowLeftIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
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
