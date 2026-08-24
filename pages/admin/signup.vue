<template>
  <div class="relative min-h-screen overflow-hidden bg-emerald-600">
    <!-- Multi-Sport Field Background -->
    <div class="absolute inset-0">
      <!-- Grass texture with gradient -->
      <div
        class="absolute inset-0 bg-linear-to-br from-emerald-500 via-emerald-600 to-emerald-700"
      ></div>

      <!-- Subtle pattern overlay -->
      <div
        class="absolute inset-0 opacity-5"
        :style="{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 20px,
            rgba(255, 255, 255, 0.3) 20px,
            rgba(255, 255, 255, 0.3) 22px
          )`,
        }"
      ></div>
    </div>

    <!-- Content -->
    <div
      class="relative z-10 flex min-h-screen items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-2xl">
        <!-- Back Link -->
        <div class="mb-6">
          <NuxtLink
            to="/"
            class="flex items-center gap-2 text-white transition-colors hover:text-white/80"
          >
            <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
            Back to Welcome
          </NuxtLink>
        </div>

        <!-- Admin Signup Card -->
        <div
          class="rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xs"
        >
          <!-- Header -->
          <div class="mb-8 text-center">
            <div
              class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg"
            >
              <UIcon
                name="i-heroicons-check-solid"
                class="h-11 w-11 text-red-600"
              />
            </div>
            <h1 class="mb-2 text-3xl font-bold text-slate-900">
              Admin Registration
            </h1>
            <p class="text-sm text-slate-600">
              Create an administrator account for Recruiting Compass
            </p>
          </div>

          <!-- Form error summary -->
          <FormErrorSummary
            v-if="hasErrors"
            :errors="errors"
            @dismiss="clearErrors"
            class="mb-6"
          />

          <!-- Admin Warning -->
          <div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <div class="flex gap-3">
              <UIcon
                name="i-heroicons-exclamation-circle-solid"
                class="mt-0.5 h-5 w-5 shrink-0 text-red-600"
              />
              <div class="text-sm text-red-800">
                <p class="mb-1 font-medium">Administrator Account</p>
                <p>
                  This account will have full access to system administration
                  features including user management and system settings. Keep
                  your credentials secure.
                </p>
              </div>
            </div>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSignup" class="space-y-6">
            <!-- Name Fields -->
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  for="firstName"
                  class="mb-2 block text-sm font-medium text-slate-700"
                >
                  First Name
                </label>
                <div class="relative">
                  <UIcon
                    name="i-heroicons-user"
                    class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="firstName"
                    v-model="firstName"
                    type="text"
                    required
                    class="w-full rounded-lg border border-slate-300 py-3 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="John"
                    :disabled="loading"
                  />
                </div>
              </div>
              <div>
                <label
                  for="lastName"
                  class="mb-2 block text-sm font-medium text-slate-700"
                >
                  Last Name
                </label>
                <div class="relative">
                  <UIcon
                    name="i-heroicons-user"
                    class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="lastName"
                    v-model="lastName"
                    type="text"
                    required
                    class="w-full rounded-lg border border-slate-300 py-3 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Smith"
                    :disabled="loading"
                  />
                </div>
              </div>
            </div>

            <!-- Email -->
            <div>
              <label
                for="email"
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <div class="relative">
                <UIcon
                  name="i-heroicons-envelope"
                  class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  required
                  class="w-full rounded-lg border border-slate-300 py-3 pr-4 pl-10 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
                  placeholder="your.email@example.com"
                  :disabled="loading"
                  @blur="validateEmail"
                />
              </div>
              <FieldError :error="fieldErrors.email" />
            </div>

            <!-- Admin Token -->
            <div>
              <label
                for="adminToken"
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Admin Registration Token
              </label>
              <div class="relative">
                <UIcon
                  name="i-heroicons-key"
                  class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="adminToken"
                  v-model="adminToken"
                  type="password"
                  required
                  class="w-full rounded-lg border border-slate-300 py-3 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter admin registration token"
                  :disabled="loading"
                  @blur="validateAdminToken"
                />
              </div>
              <FieldError :error="fieldErrors.adminToken" />
            </div>

            <!-- Password Fields -->
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  for="password"
                  class="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <div class="relative">
                  <UIcon
                    name="i-heroicons-lock-closed"
                    class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="password"
                    v-model="password"
                    type="password"
                    required
                    class="w-full rounded-lg border border-slate-300 py-3 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Create a password"
                    :disabled="loading"
                    @blur="validatePassword"
                  />
                </div>
                <FieldError :error="fieldErrors.password" />
              </div>
              <div>
                <label
                  for="confirmPassword"
                  class="mb-2 block text-sm font-medium text-slate-700"
                >
                  Confirm Password
                </label>
                <div class="relative">
                  <UIcon
                    name="i-heroicons-lock-closed"
                    class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="confirmPassword"
                    v-model="confirmPassword"
                    type="password"
                    required
                    class="w-full rounded-lg border border-slate-300 py-3 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm password"
                    :disabled="loading"
                  />
                </div>
              </div>
            </div>
            <p class="-mt-4 text-xs text-slate-500">
              Must be 8+ characters with uppercase, lowercase, and a number
            </p>

            <!-- Terms and Conditions -->
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <label class="flex cursor-pointer items-start gap-3">
                <input
                  v-model="agreeToTerms"
                  type="checkbox"
                  class="mt-1 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm text-slate-700">
                  I agree to the
                  <NuxtLink
                    to="/legal/terms"
                    class="text-blue-600 hover:text-blue-700"
                    >Terms and Conditions</NuxtLink
                  >
                  and
                  <NuxtLink
                    to="/legal/privacy"
                    class="text-blue-600 hover:text-blue-700"
                    >Privacy Policy</NuxtLink
                  >
                </span>
              </label>
            </div>

            <!-- Submit -->
            <button
              data-testid="admin-signup-button"
              type="submit"
              :disabled="loading || hasErrors"
              class="w-full rounded-lg bg-linear-to-r from-red-500 to-red-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-red-600 hover:to-red-700 disabled:opacity-50"
            >
              {{
                loading ? "Creating admin account..." : "Create Admin Account"
              }}
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-white px-4 text-slate-500">Not an admin?</span>
            </div>
          </div>

          <!-- Sign Up Link -->
          <div class="text-center">
            <p class="text-sm text-slate-600">
              <NuxtLink
                to="/signup"
                class="font-medium text-blue-600 hover:text-blue-700"
              >
                Create a regular account instead
              </NuxtLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });

import { ref, watch } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";
import { useFormValidation } from "~/composables/useFormValidation";
import { adminSignupSchema } from "~/utils/validation/schemas";
import { z } from "zod";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import FieldError from "~/components/DesignSystem/FieldError.vue";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("AdminSignup");

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const adminToken = ref("");
const agreeToTerms = ref(false);
const loading = ref(false);

const { signup } = useAuth();
const supabase = useSupabase();
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

// Field-level validators
const emailSchema = z.object({ email: adminSignupSchema.shape.email });
const passwordSchema = z.object({ password: adminSignupSchema.shape.password });

const validateEmail = async () => {
  await validateField("email", email.value, emailSchema.shape.email);
};

const validatePassword = async () => {
  await validateField(
    "password",
    password.value,
    passwordSchema.shape.password,
  );
};

const validateAdminToken = async () => {
  const updatedErrors = errors.value.filter((e) => e.field !== "adminToken");

  if (!adminToken.value || adminToken.value.trim().length === 0) {
    updatedErrors.push({
      field: "adminToken",
      message: "Admin registration token is required",
    });
  }

  setErrors(updatedErrors);
};

// Clear terms error when checkbox is checked
watch(agreeToTerms, (isChecked) => {
  if (isChecked) {
    // Remove the terms error if present
    const updatedErrors = errors.value.filter(
      (err) => err.message !== "Please agree to the terms and conditions",
    );
    if (updatedErrors.length < errors.value.length) {
      setErrors(updatedErrors);
    }
  }
});

const handleSignup = async () => {
  // Check passwords match
  if (password.value !== confirmPassword.value) {
    setErrors([{ field: "form", message: "Passwords don't match" }]);
    return;
  }

  // Check terms agreement
  if (!agreeToTerms.value) {
    setErrors([
      { field: "form", message: "Please agree to the terms and conditions" },
    ]);
    return;
  }

  // Check admin token
  if (!adminToken.value?.trim()) {
    setErrors([
      { field: "form", message: "Admin registration token is required" },
    ]);
    return;
  }

  const fullName = `${firstName.value} ${lastName.value}`.trim();

  // Validate entire form before submission
  const validated = await validate(
    {
      fullName,
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
      role: "admin", // Used for schema validation only
    },
    adminSignupSchema,
  );

  if (!validated) {
    return;
  }

  // Validate admin token server-side
  const tokenValidation = await $fetch("/api/auth/validate-admin-token", {
    method: "POST",
    body: { token: adminToken.value },
  }).catch((err) => ({
    valid: false,
    message: err.data?.message || "Invalid token",
  }));

  if (!tokenValidation.valid) {
    setErrors([
      {
        field: "form",
        message: tokenValidation.message || "Invalid admin registration token",
      },
    ]);
    return;
  }

  loading.value = true;

  try {
    let userId: string;

    try {
      // Sign up with Supabase Auth (register as parent, will set admin flag after)
      const authData = await signup(
        validated.email,
        validated.password,
        validated.fullName as string,
        "parent",
      );

      if (!authData?.data?.user?.id) {
        throw new Error("No user returned from signup");
      }

      // Do not log authData directly — it contains the session/tokens.
      logger.debug("Signup response received");

      userId = authData.data.user.id;
    } catch (signupErr: unknown) {
      // Handle "User already registered" error
      const errMessage =
        signupErr instanceof Error ? signupErr.message : String(signupErr);

      if (errMessage.includes("already registered")) {
        logger.debug("User already registered, checking current session...");

        // Try to get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          logger.debug(
            "Session exists for user, proceeding with profile creation",
          );
          userId = session.user.id;
        } else {
          // No active session - this is a real error
          throw signupErr;
        }
      } else {
        // Different error - rethrow it
        throw signupErr;
      }
    }

    // Create or update admin user profile using server endpoint
    // This bypasses RLS using the service role key; requires adminToken for server-side validation
    await $fetch("/api/auth/admin-profile", {
      method: "POST",
      body: {
        userId,
        email: validated.email,
        fullName: validated.fullName,
        adminToken: adminToken.value,
      },
    }).catch((err) => {
      throw new Error(
        err.data?.statusMessage || "Failed to create admin profile",
      );
    });

    logger.info("Admin profile created successfully");

    // Redirect to email verification page
    await navigateTo(
      `/verify-email?email=${encodeURIComponent(validated.email)}`,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signup failed";
    // Set form-level error
    setErrors([{ field: "form", message }]);
    logger.error("Signup error", err);
    loading.value = false;
  }
};
</script>
