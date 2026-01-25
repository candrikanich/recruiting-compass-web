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
            <div class="flex items-center justify-between pt-1">
              <label
                for="rememberMe"
                class="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  id="rememberMe"
                  v-model="rememberMe"
                  data-testid="remember-me-checkbox"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <span class="text-sm text-slate-600 group-hover:text-slate-700">
                  Remember me
                </span>
              </label>
              <NuxtLink
                to="/forgot-password"
                class="text-sm text-slate-600 hover:text-blue-600 transition-colors"
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
    await login(validated.email, validated.password, rememberMe.value);

    // User store will be initialized by app.vue, no need to call here
    // Session is automatically updated in Supabase auth
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
