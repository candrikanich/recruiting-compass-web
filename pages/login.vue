<template>
  <div class="min-h-screen bg-emerald-600">
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

        <!-- Login Card -->
        <div
          class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <!-- Header -->
          <div class="text-center mb-8">
            <div
              class="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
            >
              <svg
                class="w-11 h-11 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                />
                <polygon fill="currentColor" points="12,5 13,9 12,8 11,9" />
                <polygon fill="currentColor" points="12,19 11,15 12,16 13,15" />
                <polygon fill="currentColor" points="5,12 9,11 8,12 9,13" />
                <polygon fill="currentColor" points="19,12 15,13 16,12 15,11" />
              </svg>
            </div>
            <h1 class="text-slate-900 text-3xl font-bold mb-2">
              Recruiting Compass
            </h1>
            <p class="text-slate-600">
              Navigate your college recruiting journey
            </p>
          </div>

  <!-- Timeout Message -->
          <div
            v-if="timeoutMessage"
            class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <p class="text-sm text-yellow-800">{{ timeoutMessage }}</p>
          </div>

          <!-- Form error summary -->
          <FormErrorSummary
            v-if="hasErrors"
            :errors="errors"
            @dismiss="clearErrors"
            class="mb-6"
          />

          <!-- Form -->
          <form @submit.prevent="handleLogin" class="space-y-6">
            <!-- Email -->
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-slate-700 mb-2"
              >
                Email
              </label>
              <div class="relative">
                <EnvelopeIcon
                  class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                  :disabled="loading || validating"
                  @blur="validateEmail"
                />
              </div>
              <FieldError :error="fieldErrors.email" />
            </div>

            <!-- Password -->
            <div>
              <label
                for="password"
                class="block text-sm font-medium text-slate-700 mb-2"
              >
                Password
              </label>
              <div class="relative">
                <LockClosedIcon
                  class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  id="password"
                  v-model="password"
                  type="password"
                  required
                  autocomplete="current-password"
                  class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  :disabled="loading || validating"
                  @blur="validatePassword"
                />
              </div>
              <FieldError :error="fieldErrors.password" />
            </div>

            <!-- Remember Me & Forgot Password -->
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input
                  id="rememberMe"
                  v-model="rememberMe"
                  data-testid="remember-me-checkbox"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label
                  for="rememberMe"
                  class="ml-2 text-sm font-medium text-slate-700 cursor-pointer"
                >
                  Remember me on this device (30 days)
                </label>
              </div>
              <NuxtLink
                to="/forgot-password"
                class="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot password?
              </NuxtLink>
            </div>

            <!-- Submit -->
            <button
              data-testid="login-button"
              type="submit"
              :disabled="!isFormValid || loading || validating"
              class="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 shadow-lg"
            >
              {{
                loading
                  ? "Signing in..."
                  : validating
                    ? "Validating..."
                    : "Sign In"
              }}
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-6">
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
                class="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create one now
              </NuxtLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { useFormValidation } from "~/composables/useFormValidation";
import { useUserStore } from "~/stores/user";
import { loginSchema } from "~/utils/validation/schemas";
import { z } from "zod";
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  LockClosedIcon,
} from "@heroicons/vue/24/outline";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import FieldError from "~/components/DesignSystem/FieldError.vue";

// Static schemas - defined once outside component scope
const EMAIL_SCHEMA = z.object({ email: loginSchema.shape.email });
const PASSWORD_SCHEMA = z.object({ password: loginSchema.shape.password });

const route = useRoute();
const email = ref("");
const password = ref("");
const rememberMe = ref(false);
const loading = ref(false);
const validating = ref(false);

const { login } = useAuth();
const {
  errors,
  fieldErrors,
  validate,
  validateField,
  clearErrors,
  hasErrors,
  setErrors,
} = useFormValidation();

// Computed property for timeout message
const timeoutMessage = computed(() => {
  return route.query.reason === "timeout"
    ? "You were logged out due to inactivity. Please log in again."
    : null;
});

// Computed property for form validity
const isFormValid = computed(
  () => !hasErrors.value && email.value.trim() && password.value.trim(),
);

const validateEmail = async () => {
  validating.value = true;
  try {
    await validateField("email", email.value, EMAIL_SCHEMA.shape.email);
  } finally {
    validating.value = false;
  }
};

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

const handleLogin = async () => {
  // Validate entire form before submission
  const validated = await validate(
    {
      email: email.value,
      password: password.value,
      rememberMe: rememberMe.value,
    },
    loginSchema,
  );

  if (!validated) {
    return;
  }

  loading.value = true;

  try {
    const userStore = useUserStore();
    await login(validated.email, validated.password, rememberMe.value);

    // Manually trigger user store initialization after successful login
    await userStore.initializeUser();

    await navigateTo("/dashboard");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    // Set auth error at form level
    setErrors([{ field: "form", message }]);
  } finally {
    loading.value = false;
  }
};
</script>
