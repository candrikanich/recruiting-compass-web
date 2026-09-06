<template>
  <div class="relative min-h-screen overflow-hidden bg-emerald-600">
    <!-- Multi-Sport Field Background -->
    <MultiSportFieldBackground />

    <!-- Skip link for keyboard navigation -->
    <SkipLink to="#signup-form" text="Skip to signup form" />

    <!-- Content -->
    <div
      class="relative z-10 flex min-h-screen items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-2xl">
        <!-- Back Link -->
        <div class="mb-6">
          <NuxtLink
            to="/"
            class="flex items-center gap-2 rounded-sm px-2 py-1 text-white transition-colors hover:text-white/80 focus:outline-2 focus:outline-offset-2 focus:outline-white"
          >
            <UIcon
              name="i-heroicons-arrow-left"
              class="h-4 w-4"
              aria-hidden="true"
            />
            Back to Welcome
          </NuxtLink>
        </div>

        <!-- Signup Card -->
        <div
          class="rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xs"
        >
          <!-- Heading (hidden but available for screen readers) -->
          <h1 class="sr-only">Sign Up</h1>

          <!-- Header -->
          <div class="mb-8 text-center">
            <img
              src="~/assets/logos/recruiting-compass-stacked.svg"
              alt="The Recruiting Compass - Find your path, make your move"
              class="mx-auto w-96"
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
            :date-of-birth="dateOfBirth"
            :password="password"
            :confirm-password="confirmPassword"
            :agree-to-terms="agreeToTerms"
            :loading="loading"
            :has-errors="hasErrors"
            :field-errors="fieldErrors"
            @update:first-name="firstName = $event"
            @update:last-name="lastName = $event"
            @update:email="email = $event"
            @update:date-of-birth="dateOfBirth = $event"
            @update:password="password = $event"
            @update:confirm-password="confirmPassword = $event"
            @update:agree-to-terms="agreeToTerms = $event"
            @submit="handleSignup"
            @validate-email="validateEmail"
            @validate-password="validatePassword"
          />

          <!-- Cloudflare Turnstile (flag-gated, renders only when site key set) -->
          <div
            v-if="turnstileEnabled && userType"
            ref="turnstileEl"
            class="mt-4 flex justify-center"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });

import { ref, computed, watch, onMounted } from "vue";
import { useRuntimeConfig } from "#app";
import { useAuth } from "~/composables/useAuth";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";
import { useFormValidation } from "~/composables/useFormValidation";
import { useFormErrorFocus } from "~/composables/useFormErrorFocus";
import { signupSchema } from "~/utils/validation/schemas";
import { isUnderMinimumAge } from "~/utils/age";
import {
  SIGNUP_EMAIL_SCHEMA,
  SIGNUP_PASSWORD_SCHEMA,
} from "~/utils/validation/signupSchemas";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import MultiSportFieldBackground from "~/components/Auth/MultiSportFieldBackground.vue";
import UserTypeSelector from "~/components/Auth/UserTypeSelector.vue";
import SignupForm from "~/components/Auth/SignupForm.vue";

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const dateOfBirth = ref("");
const password = ref("");
const confirmPassword = ref("");
const role = ref("");
const userType = ref<"player" | "parent" | null>(null);
const agreeToTerms = ref(false);

// --- Turnstile (optional, flag-gated) ----------------------------------------
const runtimeConfig = useRuntimeConfig();
const turnstileSiteKey = computed(
  () => runtimeConfig.public?.turnstileSiteKey ?? "",
);
const turnstileEnabled = computed(() => turnstileSiteKey.value.length > 0);
const turnstileToken = ref<string | undefined>(undefined);
const turnstileEl = ref<HTMLDivElement | null>(null);
const turnstileWidgetId = ref<string | undefined>(undefined);

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileGlobal = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      callback: (token: string) => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as unknown as { turnstile?: TurnstileGlobal };
    if (w.turnstile) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => resolve());
    if (!existing) {
      try {
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        document.head.appendChild(script);
      } catch {
        resolve();
      }
    }
  });
}

// Mount Turnstile widget once userType is selected and the div exists
watch(
  [turnstileEnabled, userType, turnstileEl],
  async ([enabled, type, el]) => {
    if (!enabled || !type || !el || turnstileWidgetId.value) return;
    try {
      await loadTurnstileScript();
      const w = window as unknown as { turnstile?: TurnstileGlobal };
      if (w.turnstile && el) {
        turnstileWidgetId.value = w.turnstile.render(el, {
          sitekey: turnstileSiteKey.value,
          action: "signup",
          callback: (token: string) => {
            turnstileToken.value = token;
          },
        });
      }
    } catch {
      // Widget failure is non-fatal — Supabase verifies server-side only
      // when CAPTCHA is enabled in the dashboard; otherwise signup proceeds.
    }
  },
  { flush: "post" },
);
// ---------------------------------------------------------------------------

const { loading } = useLoadingStates();
const { signup } = useAuth();
const { $fetchAuth } = useAuthFetch();
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

  // Age gates (players carry a DOB; parents do not)
  if (userType.value === "player" && dateOfBirth.value) {
    // COPPA: block players under 13
    if (isUnderMinimumAge(dateOfBirth.value)) {
      setErrors([
        {
          field: "form",
          message:
            "Recruiting Compass is not available for players under 13. If you're a parent, please register with your own information.",
        },
      ]);
      await focusErrorSummary();
      return;
    }
  }

  const fullName = `${firstName.value} ${lastName.value}`.trim();

  // Validate entire form before submission
  const validated = await validate(
    {
      fullName,
      email: email.value,
      dateOfBirth: dateOfBirth.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
      role: role.value,
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
      const authData = await signup(
        validated.email,
        validated.password,
        validated.fullName as string,
        validated.role,
        turnstileToken.value,
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
    const userRecord: Record<string, unknown> = {
      id: userId,
      email: validated.email,
      full_name: validated.fullName,
      role: validated.role,
    };
    if (validated.dateOfBirth) userRecord.date_of_birth = validated.dateOfBirth;
    const upsertResponse = await (supabase.from("users") as any).upsert(
      [userRecord],
      { onConflict: "id" },
    );
    const { error: upsertError } = upsertResponse as { error: any };

    if (upsertError) {
      throw upsertError;
    }

    // Create family unit for the new user (both roles)
    await $fetchAuth("/api/family/create", { method: "POST" });

    // Sync auth state so the middleware sees isAuthenticated=true before navigation
    await userStore.initializeUser();

    // Redirect to role-specific onboarding
    const redirectUrl =
      validated.role === "parent" ? "/onboarding/parent" : "/onboarding";

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
@reference "tailwindcss";

/* Screen reader only content */
.sr-only {
  @apply absolute -m-1 h-1 w-1 overflow-hidden border-0 p-0 whitespace-nowrap;
}

.sr-only:focus,
.focus\:not-sr-only:focus {
  @apply relative m-0 h-auto w-auto overflow-visible p-2 whitespace-normal;
}
</style>
