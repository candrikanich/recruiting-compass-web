<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <!-- Skip link -->
    <SkipLink to="#login-form" text="Skip to login form" />

    <!-- Multi-Sport Field Background -->
    <MultiSportFieldBackground />

    <!-- Content -->
    <div
      class="relative z-10 min-h-screen flex items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-md">
        <!-- Back Link -->
        <div class="mb-6">
          <NuxtLink
            to="/"
            class="text-white hover:text-white/80 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white rounded px-2 py-1"
          >
            <ArrowLeftIcon class="w-4 h-4" aria-hidden="true" />
            Back to Welcome
          </NuxtLink>
        </div>

        <!-- Login Card -->
        <div
          class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <!-- Header -->
          <div class="text-center mb-8">
            <h1 class="sr-only">Sign in to The Recruiting Compass</h1>
            <NuxtLink
              to="/"
              class="inline-block focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded transition-all hover:opacity-90"
              aria-label="The Recruiting Compass - Find your path, make your move (home)"
            >
              <img
                src="~/assets/logos/recruiting-compass-stacked.svg"
                alt=""
                class="w-96 mx-auto"
              />
            </NuxtLink>
          </div>

          <!-- Timeout Message -->
          <div
            v-if="timeoutMessage"
            id="timeout-message"
            role="alert"
            aria-live="polite"
            aria-atomic="true"
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

          <!-- pragma: allowlist secret -->
          <!-- Login Form -->
          <LoginForm
            :email="email"
            :password="password"
            :remember-me="rememberMe"
            :loading="loading"
            :validating="validating"
            :has-errors="hasErrors"
            :field-errors="fieldErrors"
            @update:email="email = $event"
            @update:password="password = $event"
            @update:remember-me="rememberMe = $event"
            @submit="handleLogin"
            @validate-email="validateEmail"
            @validate-password="validatePassword"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });

import { ref, computed, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { useFormValidation } from "~/composables/useFormValidation";
import { useUserStore } from "~/stores/user";
import { loginSchema } from "~/utils/validation/schemas";
import { EMAIL_SCHEMA, PASSWORD_SCHEMA } from "~/utils/validation/loginSchemas";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import MultiSportFieldBackground from "~/components/Auth/MultiSportFieldBackground.vue";
import LoginForm from "~/components/Auth/LoginForm.vue";

// Constants
const SUPABASE_SESSION_PERSIST_DELAY = 100; // ms

const route = useRoute();
const email = ref("");
const password = ref("");
const rememberMe = ref(false);

const { loading, validating } = useLoadingStates();
const { login } = useAuth();
const userStore = useUserStore();
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
  const reason = route.query.reason;
  if (typeof reason === "string" && reason === "timeout") {
    return "You were logged out due to inactivity. Please log in again.";
  }
  return null;
});

// Helper: Focus error summary for accessibility
const focusErrorSummary = async () => {
  await nextTick();
  const errorSummary = document.getElementById("form-error-summary");
  if (errorSummary) {
    errorSummary.focus();
    errorSummary.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
};

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
    await focusErrorSummary();
    return;
  }

  loading.value = true;

  try {
    await login(validated.email, validated.password, rememberMe.value);

    // Give Supabase time to persist session to localStorage
    await new Promise((resolve) =>
      setTimeout(resolve, SUPABASE_SESSION_PERSIST_DELAY),
    );

    // Reinitialize user store now that session is established
    await userStore.initializeUser();

    // Navigate to dashboard
    await navigateTo("/dashboard");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    // Set auth error at form level
    setErrors([{ field: "form", message }]);

    // Focus error summary on authentication error
    await focusErrorSummary();
  } finally {
    loading.value = false;
  }
};
</script>
