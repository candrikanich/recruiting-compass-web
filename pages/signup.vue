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
        aria-hidden="true"
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

        <!-- Football: Hash marks and yard lines -->
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

        <!-- Basketball: Court outline -->
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
        <path
          d="M 120 70 Q 180 100 120 180"
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

    <!-- Skip link for keyboard navigation -->
    <a
      href="#signup-form"
      class="sr-only focus:not-sr-only focus:absolute focus:left-0 focus:top-0 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-br-lg"
    >
      Skip to signup form
    </a>

    <!-- Content -->
    <div
      class="relative z-10 min-h-screen flex items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-2xl">
        <!-- Back Link -->
        <div class="mb-6">
          <NuxtLink
            to="/"
            class="text-white hover:text-white/80 transition-colors flex items-center gap-2 rounded px-2 py-1 focus:outline-2 focus:outline-offset-2 focus:outline-white"
          >
            <ArrowLeftIcon class="w-4 h-4" aria-hidden="true" />
            Back to Welcome
          </NuxtLink>
        </div>

        <!-- Signup Card -->
        <div
          class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <!-- Heading (hidden but available for screen readers) -->
          <h1 class="sr-only">Sign Up</h1>

          <!-- Header -->
          <div class="text-center mb-8">
            <img
              src="~/assets/logos/recruiting-compass-stacked.svg"
              alt="The Recruiting Compass - Find your path, make your move"
              class="w-96 mx-auto"
            />
          </div>

          <!-- Form error summary -->
          <FormErrorSummary
            v-if="hasErrors"
            :errors="errors"
            @dismiss="clearErrors"
            class="mb-6"
          />

          <!-- User Type Selection -->
          <fieldset v-if="!userType" class="space-y-4 mb-8">
            <legend class="text-slate-600 text-sm font-medium">I'm a:</legend>
            <div class="grid grid-cols-2 gap-3">
              <button
                id="user-type-player"
                data-testid="user-type-player"
                type="button"
                @click="selectUserType('player')"
                :disabled="loading"
                :aria-pressed="userType === 'player'"
                :class="[
                  'px-4 py-3 rounded-lg border-2 transition-all font-medium focus:ring-2 focus:ring-offset-2',
                  userType === 'player'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500 ring-offset-2'
                    : 'border-slate-200 hover:border-blue-500 text-slate-700 focus:ring-blue-500',
                ]"
              >
                I'm a Player
              </button>
              <button
                id="user-type-parent"
                data-testid="user-type-parent"
                type="button"
                @click="selectUserType('parent')"
                :disabled="loading"
                :aria-pressed="userType === 'parent'"
                :class="[
                  'px-4 py-3 rounded-lg border-2 transition-all font-medium focus:ring-2 focus:ring-offset-2',
                  userType === 'parent'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500 ring-offset-2'
                    : 'border-slate-200 hover:border-blue-500 text-slate-700 focus:ring-blue-500',
                ]"
              >
                I'm a Parent
              </button>
            </div>
          </fieldset>

          <!-- Form -->
          <form
            v-if="userType"
            id="signup-form"
            @submit.prevent="handleSignup"
            :data-testid="`signup-form-${userType}`"
            class="space-y-6"
          >
            <h2 class="sr-only">
              {{ userType === "player" ? "Player" : "Parent" }} Information
            </h2>
            <!-- Required field indicator -->
            <p class="text-sm text-slate-600 mb-6">
              <span class="text-red-600">*</span> Indicates a required field
            </p>

            <!-- Name Fields -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  for="firstName"
                  class="block text-sm font-medium text-slate-700 mb-2"
                >
                  First Name
                  <span class="text-red-600 ml-1" aria-label="required">*</span>
                </label>
                <div class="relative">
                  <UserIcon
                    class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="firstName"
                    v-model="firstName"
                    type="text"
                    required
                    aria-required="true"
                    autocomplete="given-name"
                    class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-2 focus:outline-blue-600 focus:border-transparent"
                    placeholder="John"
                    :disabled="loading"
                  />
                </div>
              </div>
              <div>
                <label
                  for="lastName"
                  class="block text-sm font-medium text-slate-700 mb-2"
                >
                  Last Name
                  <span class="text-red-600 ml-1" aria-label="required">*</span>
                </label>
                <div class="relative">
                  <UserIcon
                    class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="lastName"
                    v-model="lastName"
                    type="text"
                    required
                    aria-required="true"
                    autocomplete="family-name"
                    class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-2 focus:outline-blue-600 focus:border-transparent"
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
                class="block text-sm font-medium text-slate-700 mb-2"
              >
                Email
                <span class="text-red-600 ml-1" aria-label="required">*</span>
              </label>
              <div class="relative">
                <EnvelopeIcon
                  class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  required
                  aria-required="true"
                  autocomplete="email"
                  :aria-describedby="
                    fieldErrors.email ? 'email-error' : undefined
                  "
                  :aria-invalid="fieldErrors.email ? 'true' : 'false'"
                  :class="[
                    'w-full pl-10 pr-4 py-3 border rounded-lg transition-all focus:ring-2 focus:ring-offset-2 focus:outline-2 focus:border-transparent',
                    fieldErrors.email
                      ? 'border-red-600 focus:ring-red-500 focus:outline-red-600'
                      : 'border-slate-300 focus:ring-blue-500 focus:outline-blue-600',
                  ]"
                  placeholder="your.email@example.com"
                  :disabled="loading"
                  @blur="validateEmail"
                />
              </div>
              <FieldError id="email-error" :error="fieldErrors.email" />
            </div>

            <!-- Family Code (Parents only) -->
            <div v-if="userType === 'parent'">
              <label
                for="familyCode"
                class="block text-sm font-medium text-slate-700 mb-2"
              >
                Family Code
                <span class="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                id="familyCode"
                v-model="familyCode"
                type="text"
                aria-describedby="familyCode-help"
                :aria-invalid="fieldErrors.familyCode ? 'true' : 'false'"
                :class="[
                  'w-full px-4 py-3 border rounded-lg transition-all focus:ring-2 focus:ring-offset-2 focus:outline-2 focus:border-transparent uppercase',
                  fieldErrors.familyCode
                    ? 'border-red-600 focus:ring-red-500 focus:outline-red-600'
                    : 'border-slate-300 focus:ring-blue-500 focus:outline-blue-600',
                ]"
                placeholder="FAM-XXXXXXXX"
                :disabled="loading"
                @blur="validateFamilyCode"
              />
              <p id="familyCode-help" class="text-xs text-slate-500 mt-1">
                If you have your player's family code, enter it here to link
                your accounts. You can add it later.
              </p>
              <FieldError
                id="familyCode-error"
                :error="fieldErrors.familyCode"
              />
            </div>

            <!-- Password Fields -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  for="password"
                  class="block text-sm font-medium text-slate-700 mb-2"
                >
                  Password
                  <span class="text-red-600 ml-1" aria-label="required">*</span>
                </label>
                <div class="relative">
                  <LockClosedIcon
                    class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    v-model="password"
                    type="password"
                    required
                    aria-required="true"
                    autocomplete="new-password"
                    aria-describedby="password-requirements password-error"
                    :aria-invalid="fieldErrors.password ? 'true' : 'false'"
                    :class="[
                      'w-full pl-10 pr-4 py-3 border rounded-lg transition-all focus:ring-2 focus:ring-offset-2 focus:outline-2 focus:border-transparent',
                      fieldErrors.password
                        ? 'border-red-600 focus:ring-red-500 focus:outline-red-600'
                        : 'border-slate-300 focus:ring-blue-500 focus:outline-blue-600',
                    ]"
                    placeholder="Create a password"
                    :disabled="loading"
                    @blur="validatePassword"
                  />
                </div>
                <p
                  id="password-requirements"
                  class="text-xs text-slate-500 mt-1"
                >
                  Must be 8+ characters with uppercase, lowercase, and a number
                </p>
                <FieldError id="password-error" :error="fieldErrors.password" />
              </div>
              <div>
                <label
                  for="confirmPassword"
                  class="block text-sm font-medium text-slate-700 mb-2"
                >
                  Confirm Password
                  <span class="text-red-600 ml-1" aria-label="required">*</span>
                </label>
                <div class="relative">
                  <LockClosedIcon
                    class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="confirmPassword"
                    v-model="confirmPassword"
                    type="password"
                    required
                    aria-required="true"
                    autocomplete="new-password"
                    :aria-invalid="
                      fieldErrors.confirmPassword ? 'true' : 'false'
                    "
                    :class="[
                      'w-full pl-10 pr-4 py-3 border rounded-lg transition-all focus:ring-2 focus:ring-offset-2 focus:outline-2 focus:border-transparent',
                      fieldErrors.confirmPassword
                        ? 'border-red-600 focus:ring-red-500 focus:outline-red-600'
                        : 'border-slate-300 focus:ring-blue-500 focus:outline-blue-600',
                    ]"
                    placeholder="Confirm password"
                    :disabled="loading"
                  />
                </div>
                <FieldError
                  id="confirmPassword-error"
                  :error="fieldErrors.confirmPassword"
                />
              </div>
            </div>

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
            <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div class="flex items-start gap-3">
                <input
                  id="agreeToTerms"
                  v-model="agreeToTerms"
                  type="checkbox"
                  required
                  aria-required="true"
                  :aria-invalid="fieldErrors.terms ? 'true' : 'false'"
                  :aria-describedby="
                    fieldErrors.terms ? 'terms-error' : undefined
                  "
                  :class="[
                    'mt-1 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    fieldErrors.terms && 'border-red-600',
                  ]"
                />
                <label for="agreeToTerms" class="text-slate-700 text-sm flex-1">
                  I agree to the
                  <NuxtLink
                    to="/legal/terms"
                    class="text-blue-600 hover:text-blue-700 underline rounded px-1 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
                  >
                    Terms and Conditions
                  </NuxtLink>
                  and
                  <NuxtLink
                    to="/legal/privacy"
                    class="text-blue-600 hover:text-blue-700 underline rounded px-1 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600"
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
              :disabled="loading || hasErrors"
              :aria-busy="loading"
              :aria-label="
                loading ? 'Creating account, please wait' : 'Create Account'
              "
              class="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-lg disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed"
            >
              {{ loading ? "Creating account..." : "Create Account" }}
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-white px-4 text-slate-500"
                >Already have an account?</span
              >
            </div>
          </div>

          <!-- Sign In Link -->
          <div class="text-center">
            <p class="text-slate-600 text-sm">
              <NuxtLink
                to="/login"
                class="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in instead
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
import { useRoute } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";
import { useFormValidation } from "~/composables/useFormValidation";
import { signupSchema } from "~/utils/validation/schemas";
import { z } from "zod";
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
} from "@heroicons/vue/24/outline";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import FieldError from "~/components/DesignSystem/FieldError.vue";

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const role = ref("");
const familyCode = ref("");
const userType = ref<"player" | "parent" | null>(null);
const agreeToTerms = ref(false);
const loading = ref(false);

const { signup } = useAuth();
const supabase = useSupabase();
const userStore = useUserStore();
const route = useRoute();
const {
  errors,
  fieldErrors,
  validate,
  validateField,
  clearErrors,
  hasErrors,
  setErrors,
} = useFormValidation();

const selectUserType = (type: "player" | "parent") => {
  userType.value = type;
  role.value = type === "player" ? "student" : "parent";
  clearErrors();
};

// Field-level validators
const emailSchema = z.object({ email: signupSchema.shape.email });
const passwordSchema = z.object({ password: signupSchema.shape.password });
const roleSchema = z.object({ role: signupSchema.shape.role });

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

const validateRole = async () => {
  await validateField("role", role.value, roleSchema.shape.role);
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

const validateFamilyCode = async () => {
  // Optional field, only validate if provided
  if (familyCode.value) {
    // Could add schema validation here if needed
  }
};

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

  const fullName = `${firstName.value} ${lastName.value}`.trim();

  // Validate entire form before submission
  const validated = await validate(
    {
      fullName,
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
      role: role.value,
      familyCode: familyCode.value,
    },
    signupSchema,
  );

  if (!validated) {
    return;
  }

  loading.value = true;

  try {
    let userId: string;

    try {
      // Sign up with Supabase Auth (including role in metadata)
      const signupOptions = {};
      if (validated.role === "parent" && validated.familyCode) {
        Object.assign(signupOptions, { familyCode: validated.familyCode });
      }

      const authData = await signup(
        validated.email,
        validated.password,
        validated.fullName as string,
        validated.role,
        signupOptions,
      );
      console.log("Auth signup returned:", authData);

      if (!authData?.user?.id) {
        throw new Error("No user returned from signup");
      }

      userId = authData.user.id;
    } catch (signupErr: unknown) {
      // Handle "User already registered" error - the account may have been created
      // in a previous request (race condition or double-submit)
      const errMessage =
        signupErr instanceof Error ? signupErr.message : String(signupErr);

      if (errMessage.includes("already registered")) {
        console.log("User already registered, checking current session...");

        // Try to get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          console.log(
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

    // Create or update user profile in public.users table
    // Use upsert to handle idempotent signup (retry safety)
    const upsertResponse = await (supabase.from("users") as any).upsert(
      [
        {
          id: userId,
          email: validated.email,
          full_name: validated.fullName,
          role: validated.role,
        },
      ],
      { onConflict: "id" },
    );
    const { error: upsertError } = upsertResponse as { error: any };

    if (upsertError) {
      console.error("Error upserting user profile:", upsertError);
      throw upsertError;
    }

    console.log("User profile created successfully");

    // Determine redirect based on user type
    let redirectUrl = "";

    if (validated.role === "student") {
      // Students (players) go to onboarding
      redirectUrl = "/onboarding";
    } else if (validated.role === "parent") {
      // Parents go to family code entry or dashboard
      if (validated.familyCode) {
        // Parent has family code - go to dashboard (already linked)
        redirectUrl = "/dashboard";
      } else {
        // Parent without code - go to family code entry screen
        redirectUrl = "/family-code-entry";
      }
    } else {
      // Fallback for other roles
      redirectUrl =
        "/verify-email?email=" + encodeURIComponent(validated.email);
    }

    console.log("Redirecting to:", redirectUrl);
    await navigateTo(redirectUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signup failed";
    // Set form-level error
    setErrors([{ field: "form", message }]);
    console.error("Signup error:", err);
    loading.value = false;
  }
};
</script>

<style scoped>
button[data-testid^="user-type-"]:not(:disabled).selected {
  @apply bg-blue-50 border-blue-500 text-blue-700;
}

button[data-testid^="user-type-"]:disabled {
  @apply opacity-50 cursor-not-allowed;
}

/* Screen reader only content */
.sr-only {
  @apply absolute w-1 h-1 p-0 -m-1 overflow-hidden whitespace-nowrap border-0;
}

.sr-only:focus,
.focus\:not-sr-only:focus {
  @apply relative w-auto h-auto p-2 m-0 overflow-visible whitespace-normal;
}
</style>
