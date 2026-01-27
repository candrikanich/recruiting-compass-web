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

    <!-- Content -->
    <div
      class="relative z-10 min-h-screen flex items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-2xl">
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

        <!-- Signup Card -->
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

          <!-- Form error summary -->
          <FormErrorSummary
            v-if="hasErrors"
            :errors="errors"
            @dismiss="clearErrors"
            class="mb-6"
          />

          <!-- Form -->
          <form @submit.prevent="handleSignup" class="space-y-6">
            <!-- Name Fields -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  for="firstName"
                  class="block text-sm font-medium text-slate-700 mb-2"
                >
                  First Name
                </label>
                <div class="relative">
                  <UserIcon
                    class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  />
                  <input
                    id="firstName"
                    v-model="firstName"
                    type="text"
                    required
                    class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                </label>
                <div class="relative">
                  <UserIcon
                    class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  />
                  <input
                    id="lastName"
                    v-model="lastName"
                    type="text"
                    required
                    class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                  :disabled="loading"
                  @blur="validateEmail"
                />
              </div>
              <FieldError :error="fieldErrors.email" />
            </div>

            <!-- Role -->
            <div>
              <label
                for="role"
                class="block text-sm font-medium text-slate-700 mb-2"
              >
                I am a:
              </label>
              <select
                id="role"
                v-model="role"
                class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :disabled="loading"
                @blur="validateRole"
              >
                <option value="">Select your role</option>
                <option value="parent">Parent</option>
                <option value="student">Student Athlete</option>
              </select>
              <FieldError :error="fieldErrors.role" />
            </div>

            <!-- Password Fields -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    type="password"
                    required
                    class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm password"
                    :disabled="loading"
                  />
                </div>
              </div>
            </div>
            <p class="text-xs text-slate-500 -mt-4">
              Must be 8+ characters with uppercase, lowercase, and a number
            </p>

            <!-- Terms and Conditions -->
            <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  v-model="agreeToTerms"
                  type="checkbox"
                  class="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-slate-700 text-sm">
                  I agree to the
                  <a href="#" class="text-blue-600 hover:text-blue-700"
                    >Terms and Conditions</a
                  >
                  and
                  <a href="#" class="text-blue-600 hover:text-blue-700"
                    >Privacy Policy</a
                  >
                </span>
              </label>
            </div>

            <!-- Submit -->
            <button
              data-testid="signup-button"
              type="submit"
              :disabled="loading || hasErrors"
              class="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 shadow-lg"
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

import { ref } from "vue";
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
import type { UserPreferences } from "~/types/models";

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const role = ref("");
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
    },
    signupSchema,
  );

  if (!validated) {
    return;
  }

  loading.value = true;

  try {
    // Sign up with Supabase Auth (including role in metadata)
    const authData = await signup(
      validated.email,
      validated.password,
      validated.fullName as string,
      validated.role,
    );
    console.log("Auth signup returned:", authData);

    if (!authData?.user?.id) {
      throw new Error("No user returned from signup");
    }

    const userId = authData.user.id;

    // Create user profile in public.users table using the returned user ID
    const { error: insertError } = await supabase.from("users").insert([
      {
        id: userId,
        email: validated.email,
        full_name: validated.fullName,
        role: validated.role,
      },
    ]);

    if (insertError) {
      console.error("Error inserting user profile:", insertError);
      throw insertError;
    }

    console.log("User profile created successfully");

    // Create default user preferences
    const preferenceData: Partial<UserPreferences> = {
      user_id: userId,
    };
    const { error: prefsError } = await supabase
      .from("user_preferences")
      .insert(preferenceData);

    if (prefsError) {
      console.error("Error creating user preferences:", prefsError);
      throw prefsError;
    }

    console.log("User preferences created successfully");

    // User store will be initialized by app.vue, no need to call here
    // Session is automatically updated in Supabase auth

    // Redirect to email verification page
    await navigateTo(`/verify-email?email=${encodeURIComponent(validated.email)}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signup failed";
    // Set form-level error
    setErrors([{ field: "form", message }]);
    console.error("Signup error:", err);
    loading.value = false;
  }
};
</script>
