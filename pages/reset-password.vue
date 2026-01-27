<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <!-- Multi-Sport Field Background -->
    <div class="absolute inset-0">
      <!-- Grass texture with gradient -->
      <div
        class="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700"
      ></div>

      <!-- Multi-Sport Field markings -->
      <svg
        class="absolute inset-0 w-full h-full opacity-20"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <!-- Baseball: Infield dirt circle -->
        <circle
          cx="600"
          cy="800"
          r="350"
          fill="none"
          stroke="white"
          stroke-width="3"
          opacity="0.4"
        />

        <!-- Baseball: Foul lines -->
        <line
          x1="600"
          y1="800"
          x2="100"
          y2="100"
          stroke="white"
          stroke-width="2"
          opacity="0.5"
        />
        <line
          x1="600"
          y1="800"
          x2="1100"
          y2="100"
          stroke="white"
          stroke-width="2"
          opacity="0.5"
        />

        <!-- Baseball: Basepaths -->
        <line
          x1="600"
          y1="800"
          x2="750"
          y2="650"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="750"
          y1="650"
          x2="600"
          y2="500"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="600"
          y1="500"
          x2="450"
          y2="650"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="450"
          y1="650"
          x2="600"
          y2="800"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />

        <!-- Baseball: Bases -->
        <rect
          x="595"
          y="795"
          width="10"
          height="10"
          fill="white"
          opacity="0.6"
        />
        <rect
          x="745"
          y="645"
          width="10"
          height="10"
          fill="white"
          opacity="0.6"
        />
        <rect
          x="595"
          y="495"
          width="10"
          height="10"
          fill="white"
          opacity="0.6"
        />
        <rect
          x="445"
          y="645"
          width="10"
          height="10"
          fill="white"
          opacity="0.6"
        />

        <!-- Baseball: Outfield arc -->
        <path
          d="M 200 200 Q 600 50 1000 200"
          fill="none"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />

        <!-- Football: Hash marks and yard lines (left side) -->
        <line
          x1="50"
          y1="150"
          x2="50"
          y2="650"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="50"
          y1="200"
          x2="100"
          y2="200"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="50"
          y1="300"
          x2="100"
          y2="300"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="50"
          y1="400"
          x2="120"
          y2="400"
          stroke="white"
          stroke-width="2"
          opacity="0.4"
        />
        <line
          x1="50"
          y1="500"
          x2="100"
          y2="500"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="50"
          y1="600"
          x2="100"
          y2="600"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />

        <!-- Football: Hash marks (right side) -->
        <line
          x1="1150"
          y1="150"
          x2="1150"
          y2="650"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="1100"
          y1="200"
          x2="1150"
          y2="200"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="1100"
          y1="300"
          x2="1150"
          y2="300"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="1080"
          y1="400"
          x2="1150"
          y2="400"
          stroke="white"
          stroke-width="2"
          opacity="0.4"
        />
        <line
          x1="1100"
          y1="500"
          x2="1150"
          y2="500"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="1100"
          y1="600"
          x2="1150"
          y2="600"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />

        <!-- Basketball: Court outline (top left) -->
        <rect
          x="100"
          y="50"
          width="300"
          height="200"
          fill="none"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="100"
          y1="150"
          x2="200"
          y2="150"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <path
          d="M 120 70 Q 180 100 120 180"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <rect
          x="100"
          y="120"
          width="60"
          height="60"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <circle
          cx="300"
          cy="150"
          r="30"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />

        <!-- Basketball: Court outline (top right) -->
        <rect
          x="800"
          y="50"
          width="300"
          height="200"
          fill="none"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="1000"
          y1="150"
          x2="1100"
          y2="150"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <path
          d="M 1080 70 Q 1020 100 1080 180"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <rect
          x="1040"
          y="120"
          width="60"
          height="60"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />

        <!-- Soccer: Penalty boxes -->
        <rect
          x="150"
          y="600"
          width="150"
          height="100"
          fill="none"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <rect
          x="200"
          y="650"
          width="50"
          height="50"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <path
          d="M 200 630 Q 225 600 250 630"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />

        <rect
          x="900"
          y="600"
          width="150"
          height="100"
          fill="none"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <rect
          x="950"
          y="650"
          width="50"
          height="50"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <path
          d="M 950 630 Q 975 600 1000 630"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />

        <!-- Soccer: Center circle -->
        <circle
          cx="600"
          cy="200"
          r="60"
          fill="none"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <circle cx="600" cy="200" r="3" fill="white" opacity="0.4" />
        <line
          x1="300"
          y1="200"
          x2="900"
          y2="200"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
      </svg>
    </div>

    <!-- Content -->
    <div
      class="relative z-10 min-h-screen flex items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-md">
        <!-- Back Link -->
        <div class="mb-6">
          <NuxtLink
            to="/"
            class="text-white hover:text-white/80 transition-colors flex items-center gap-2"
          >
            <ArrowLeftIcon class="w-4 h-4" />
            Back to Welcome
          </NuxtLink>
        </div>

        <!-- Reset Password Card -->
        <div
          class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <!-- Status Icon & Header -->
          <div class="text-center mb-8">
            <div
              class="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
              :class="{
                'bg-emerald-100': passwordUpdated,
                'bg-amber-100': !passwordUpdated && !invalidToken,
                'bg-red-100': invalidToken,
                'bg-blue-100': isValidating,
              }"
            >
              <!-- Validating state -->
              <svg
                v-if="isValidating"
                class="w-11 h-11 text-blue-600 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>

              <!-- Success state -->
              <svg
                v-else-if="passwordUpdated"
                class="w-11 h-11 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
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

          <!-- Validation errors -->
          <div class="mb-8 space-y-4">
            <!-- Invalid token error -->
            <div
              v-if="invalidToken"
              class="p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p class="text-red-800 text-sm font-medium">
                {{ passwordReset.error }}
              </p>
            </div>

            <!-- Success message -->
            <div
              v-if="passwordUpdated"
              class="p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
            >
              <p class="text-emerald-800 text-sm font-medium">
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
              v-if="passwordReset.error?.value?.trim() && !passwordUpdated && !invalidToken"
              class="p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p class="text-red-800 text-sm font-medium">
                {{ passwordReset.error.value }}
              </p>
            </div>
          </div>

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
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <component
                    :is="showPassword ? EyeSlashIcon : EyeIcon"
                    class="w-5 h-5"
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
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <component
                    :is="showPassword ? EyeSlashIcon : EyeIcon"
                    class="w-5 h-5"
                  />
                </button>
              </div>
              <FieldError :error="fieldErrors.confirmPassword" />
            </div>

            <!-- Password Requirements Checklist -->
            <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p class="text-sm font-medium text-slate-700 mb-3">
                Password must contain:
              </p>
              <ul class="space-y-2">
                <li class="flex items-center gap-2 text-sm">
                  <CheckCircleIcon
                    v-if="password.length >= 8"
                    class="w-5 h-5 text-emerald-600 flex-shrink-0"
                  />
                  <svg
                    v-else
                    class="w-5 h-5 text-slate-300 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" stroke-width="2" />
                  </svg>
                  <span
                    :class="
                      password.length >= 8
                        ? 'text-slate-900'
                        : 'text-slate-500'
                    "
                  >
                    At least 8 characters
                  </span>
                </li>
                <li class="flex items-center gap-2 text-sm">
                  <CheckCircleIcon
                    v-if="/[A-Z]/.test(password)"
                    class="w-5 h-5 text-emerald-600 flex-shrink-0"
                  />
                  <svg
                    v-else
                    class="w-5 h-5 text-slate-300 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                <li class="flex items-center gap-2 text-sm">
                  <CheckCircleIcon
                    v-if="/[a-z]/.test(password)"
                    class="w-5 h-5 text-emerald-600 flex-shrink-0"
                  />
                  <svg
                    v-else
                    class="w-5 h-5 text-slate-300 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                <li class="flex items-center gap-2 text-sm">
                  <CheckCircleIcon
                    v-if="/[0-9]/.test(password)"
                    class="w-5 h-5 text-emerald-600 flex-shrink-0"
                  />
                  <svg
                    v-else
                    class="w-5 h-5 text-slate-300 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
              data-testid="reset-password-button"
              type="submit"
              :disabled="!isFormValid || loading || validating"
              class="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 shadow-lg"
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
          <div v-if="passwordUpdated" class="space-y-4">
            <NuxtLink
              to="/login"
              class="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center"
            >
              Go to Login
            </NuxtLink>

            <NuxtLink
              to="/"
              class="block w-full py-3 px-4 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-colors text-center"
            >
              Back to Home
            </NuxtLink>
          </div>

          <!-- Error Actions -->
          <div v-if="invalidToken" class="space-y-4">
            <NuxtLink
              to="/forgot-password"
              class="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center"
            >
              Request New Reset Link
            </NuxtLink>

            <NuxtLink
              to="/login"
              class="block w-full py-3 px-4 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-colors text-center"
            >
              Back to Login
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });

import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
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

// Static schema - defined once outside component scope
const PASSWORD_SCHEMA = z.object({
  password: resetPasswordSchema.shape.password,
  confirmPassword: z.string(),
});

const route = useRoute();
const router = useRouter();

const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const loading = ref(false);
const validating = ref(false);
const passwordUpdated = ref(false);
const invalidToken = ref(false);
const isValidating = ref(false);

const passwordReset = usePasswordReset();
const {
  errors,
  fieldErrors,
  validate,
  validateField,
  clearErrors,
  hasErrors,
} = useFormValidation();

// Computed property for form validity
const isFormValid = computed(() => {
  const passwordValid = password.value.length >= 8 &&
    /[A-Z]/.test(password.value) &&
    /[a-z]/.test(password.value) &&
    /[0-9]/.test(password.value);
  const passwordsMatch = password.value === confirmPassword.value;

  return !hasErrors.value && passwordValid && passwordsMatch;
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
  // Validate entire form before submission
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

      // Auto-redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }
  } finally {
    loading.value = false;
  }
};

// Initialize - check for session set by Supabase from URL hash
onMounted(async () => {
  const supabase = useSupabase();

  // Supabase automatically parses the hash fragment (#access_token=...)
  // and sets up the session. Check if session exists.
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    invalidToken.value = true;
    passwordReset.error.value =
      "No reset link provided. Please request a new password reset.";
  }
});
</script>
