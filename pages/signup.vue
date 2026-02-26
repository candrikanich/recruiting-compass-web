<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <!-- Multi-Sport Field Background -->
    <MultiSportFieldBackground />

    <!-- Skip link for keyboard navigation -->
    <SkipLink to="#signup-form" text="Skip to signup form" />

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
          <UserTypeSelector
            v-if="!userType"
            :selected="userType"
            :disabled="loading"
            @select="selectUserType"
            class="mb-8"
          />

          <!-- SR-only announcement for form transition -->
          <div
            v-if="userType"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            class="sr-only"
          >
            {{
              userType === "player"
                ? "Player signup form loaded"
                : "Parent signup form loaded"
            }}
          </div>

          <!-- Form pragma: allowlist secret -->
          <SignupForm
            v-if="userType"
            :user-type="userType"
            :first-name="firstName"
            :last-name="lastName"
            :email="email"
            :password="password"
            :confirm-password="confirmPassword"
            :family-code="familyCode"
            :agree-to-terms="agreeToTerms"
            :loading="loading"
            :has-errors="hasErrors"
            :field-errors="fieldErrors"
            @update:first-name="firstName = $event"
            @update:last-name="lastName = $event"
            @update:email="email = $event"
            @update:password="password = $event"
            @update:confirm-password="confirmPassword = $event"
            @update:family-code="familyCode = $event"
            @update:agree-to-terms="agreeToTerms = $event"
            @submit="handleSignup"
            @validate-email="validateEmail"
            @validate-password="validatePassword"
            @validate-family-code="validateFamilyCode"
          />
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
import { useFormValidation } from "~/composables/useFormValidation";
import { useFormErrorFocus } from "~/composables/useFormErrorFocus";
import { signupSchema } from "~/utils/validation/schemas";
import {
  SIGNUP_EMAIL_SCHEMA,
  SIGNUP_PASSWORD_SCHEMA,
} from "~/utils/validation/signupSchemas";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import MultiSportFieldBackground from "~/components/Auth/MultiSportFieldBackground.vue";
import UserTypeSelector from "~/components/Auth/UserTypeSelector.vue";
import SignupForm from "~/components/Auth/SignupForm.vue";

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const role = ref("");
const familyCode = ref("");
const userType = ref<"player" | "parent" | null>(null);
const agreeToTerms = ref(false);

const { loading } = useLoadingStates();
const { signup } = useAuth();
const supabase = useSupabase();
const {
  errors,
  fieldErrors,
  validate,
  validateField,
  clearErrors,
  hasErrors,
  setErrors,
} = useFormValidation();
const { focusErrorSummary } = useFormErrorFocus();

const selectUserType = (type: "player" | "parent") => {
  userType.value = type;
  role.value = type;
  clearErrors();
};

const validateEmail = async () => {
  await validateField("email", email.value, SIGNUP_EMAIL_SCHEMA.shape.email);
};

const validatePassword = async () => {
  await validateField(
    "password",
    password.value,
    SIGNUP_PASSWORD_SCHEMA.shape.password,
  );
};

// Clear terms error when checkbox is checked
watch(agreeToTerms, (isChecked) => {
  if (isChecked) {
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
    await focusErrorSummary();
    return;
  }

  // Check terms agreement
  if (!agreeToTerms.value) {
    setErrors([
      { field: "form", message: "Please agree to the terms and conditions" },
    ]);
    await focusErrorSummary();
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
    await focusErrorSummary();
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

      if (!authData?.data?.user?.id) {
        throw new Error("No user returned from signup");
      }

      userId = authData.data.user.id;
    } catch (signupErr: unknown) {
      // Handle "User already registered" error - the account may have been created
      // in a previous request (race condition or double-submit)
      const errMessage =
        signupErr instanceof Error ? signupErr.message : String(signupErr);

      if (errMessage.includes("already registered")) {
        // Try to get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
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
      throw upsertError;
    }

    // Determine redirect based on user type
    let redirectUrl = "";

    if (validated.role === "player") {
      // Players go to onboarding
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

    await navigateTo(redirectUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signup failed";
    // Set form-level error
    setErrors([{ field: "form", message }]);
    await focusErrorSummary();
    loading.value = false;
  }
};
</script>

<style scoped>
/* Screen reader only content */
.sr-only {
  @apply absolute w-1 h-1 p-0 -m-1 overflow-hidden whitespace-nowrap border-0;
}

.sr-only:focus,
.focus\:not-sr-only:focus {
  @apply relative w-auto h-auto p-2 m-0 overflow-visible whitespace-normal;
}
</style>
