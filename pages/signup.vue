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
            :graduation-year="graduationYear"
            :primary-sport="primarySport"
            :gender="gender"
            :zip-code="zipCode"
            :guardian-email="guardianEmail"
            :requires-guardian="requiresGuardian"
            @update:first-name="firstName = $event"
            @update:last-name="lastName = $event"
            @update:email="email = $event"
            @update:date-of-birth="dateOfBirth = $event"
            @update:password="password = $event"
            @update:confirm-password="confirmPassword = $event"
            @update:agree-to-terms="agreeToTerms = $event"
            @update:graduation-year="graduationYear = $event"
            @update:primary-sport="primarySport = $event"
            @update:gender="gender = $event"
            @update:zip-code="zipCode = $event"
            @update:guardian-email="guardianEmail = $event"
            @submit="handleSignup"
            @validate-email="validateEmail"
            @validate-password="validatePassword"
          >
            <template #captcha>
              <!-- Cloudflare Turnstile (flag-gated, renders only when site
                   key set) — mounted above the submit button via a slot so
                   a user who clicks Create Account without scrolling
                   further doesn't miss an interactive challenge below it. -->
              <div
                v-if="turnstileEnabled && userType"
                ref="turnstileEl"
                class="flex justify-center"
              />
            </template>
          </SignupForm>
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
import { isUnderMinimumAge, requiresGuardianInvite } from "~/utils/age";
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

// Onboarding step 1, drafted here (player only) so there's something real to
// carry across the email-confirmation gap instead of a blank waiting screen.
// See composables/useAccountProvisioning.ts for the flush-on-sign-in side.
const graduationYear = ref<number | undefined>(undefined);
const primarySport = ref("");
const gender = ref<string | undefined>(undefined);
const zipCode = ref("");

// Guardian-linked signup: a 13-17 player names a guardian rather than waiting to be
// invited by one. See planning/2026-09-11-guardian-linked-signup-spec.md (iOS repo).
const guardianEmail = ref("");
const requiresGuardian = computed(
  () => userType.value === "player" && requiresGuardianInvite(dateOfBirth.value),
);

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
      "expired-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

// Turnstile tokens are single-use and expire (~5 min) — replaying a stale or
// already-consumed token on retry surfaces as Supabase's opaque
// "timeout-or-duplicate" captcha error, even when the prior request actually
// succeeded (account created, confirmation email sent).
function resetTurnstile() {
  const w = window as unknown as { turnstile?: TurnstileGlobal };
  turnstileToken.value = undefined;
  if (w.turnstile && turnstileWidgetId.value) {
    w.turnstile.reset(turnstileWidgetId.value);
  }
}

// After server-side account creation, the Turnstile token collected for
// signup has already been consumed by /api/auth/signup's own verifyTurnstile
// call — reusing it for the immediate post-signup sign-in would be rejected
// as a replayed token by Supabase's native CAPTCHA check (if enabled). Reset
// the widget and wait briefly for it to auto-resolve a fresh token via its
// existing callback, the same mechanism already used for retry-after-failure.
async function getFreshTurnstileToken(): Promise<string | undefined> {
  if (!turnstileEnabled.value || !turnstileWidgetId.value) return undefined;
  const w = window as unknown as { turnstile?: TurnstileGlobal };
  if (!w.turnstile) return undefined;
  turnstileToken.value = undefined;
  w.turnstile.reset(turnstileWidgetId.value);
  const start = Date.now();
  while (!turnstileToken.value && Date.now() - start < 8000) {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return turnstileToken.value;
}

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
          "expired-callback": () => {
            turnstileToken.value = undefined;
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
  clearFieldError,
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

  if (confirmPassword.value && password.value !== confirmPassword.value) {
    setErrors([
      ...errors.value.filter((e) => e.field !== "confirmPassword"),
      { field: "confirmPassword", message: "Passwords don't match" },
    ]);
  } else {
    clearFieldError("confirmPassword");
  }
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

/**
 * Signup for a 13-17 player. Naming a guardian is optional — see
 * docs/superpowers/specs/2026-09-12-guardian-optional-signup-wizard-design.md.
 *
 * Goes through POST /api/auth/signup-minor rather than the browser-direct path below
 * because guardian_claims is service-role-only — the browser cannot write it directly.
 */
const submitMinorSignup = async (guardian: string) => {
  try {
    await $fetch("/api/auth/signup-minor", {
      method: "POST",
      body: {
        email: email.value.trim(),
        password: password.value,
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        dateOfBirth: dateOfBirth.value,
        guardianEmail: guardian,
        graduationYear: graduationYear.value,
        primarySport: primarySport.value || undefined,
        gender: gender.value,
        zipCode: zipCode.value || undefined,
        captchaToken: turnstileToken.value,
      },
    });

    // The endpoint creates the account server-side (auto-confirmed, same as
    // the adult path) but doesn't sign in for us — the signup Turnstile
    // token it just verified is already consumed, so mint a fresh one for
    // this sign-in the same way the adult path does.
    const signInCaptchaToken = await getFreshTurnstileToken();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
      ...(signInCaptchaToken && {
        options: { captchaToken: signInCaptchaToken },
      }),
    });
    if (signInError) throw signInError;

    // Family unit + pending onboarding fields (primary_sport/gender, still
    // only pending_* metadata at this point — see signup-minor.post.ts) also
    // get flushed by plugins/auth.client.ts's SIGNED_IN listener, but
    // awaiting these explicitly here keeps the redirect from racing it.
    await $fetchAuth("/api/family/create", { method: "POST" });
    await userStore.initializeUser();
    loading.value = false;
    await navigateTo("/dashboard");
  } catch (err) {
    const message =
      (err as { data?: { statusMessage?: string } } | null)?.data
        ?.statusMessage ??
      (err instanceof Error ? err.message : "Signup failed");
    setErrors([{ field: "form", message }]);
    resetTurnstile();
    await focusErrorSummary();
    loading.value = false;
  }
};

const handleSignup = async () => {
  // Guard against double-submit (double-click, Enter+click race) — a second
  // request would replay the already-consumed Turnstile token and get
  // rejected with the opaque "timeout-or-duplicate" captcha error. Set
  // synchronously (before any await) so a near-simultaneous second call
  // can't slip through the gap.
  if (loading.value) return;
  loading.value = true;

  // Check passwords match
  if (password.value !== confirmPassword.value) {
    setErrors([{ field: "form", message: "Passwords don't match" }]);
    await focusErrorSummary();
    loading.value = false;
    return;
  }

  // Check terms agreement
  if (!agreeToTerms.value) {
    setErrors([
      { field: "form", message: "Please agree to the terms and conditions" },
    ]);
    await focusErrorSummary();
    loading.value = false;
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
      loading.value = false;
      return;
    }

    // Minors (13-17) go through a server endpoint rather than the browser-direct
    // signup below because guardian_claims is service-role-only and the browser can't
    // write it directly — naming a guardian itself is optional.
    if (requiresGuardianInvite(dateOfBirth.value)) {
      const guardian = guardianEmail.value.trim().toLowerCase();
      if (guardian && guardian === email.value.trim().toLowerCase()) {
        setErrors([
          {
            field: "guardianEmail",
            message:
              "Your parent or guardian needs a different email address than yours.",
          },
        ]);
        await focusErrorSummary();
        loading.value = false;
        return;
      }
      await submitMinorSignup(guardian);
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
    loading.value = false;
    return;
  }

  // Only a fully-answered draft is worth carrying across the confirmation
  // gap — gender/zip are optional, grad year + sport are not.
  const onboardingStep1 =
    validated.role === "player" &&
    graduationYear.value !== undefined &&
    primarySport.value.trim()
      ? {
          graduationYear: graduationYear.value,
          primarySport: primarySport.value,
          ...(gender.value ? { gender: gender.value } : {}),
          ...(zipCode.value ? { zipCode: zipCode.value } : {}),
        }
      : undefined;

  try {
    let userId: string;

    try {
      // Trailing args are appended only when present — this page never sets
      // pendingAdmin, and padding every call with explicit `undefined`s
      // would still change the call's arg count for a non-onboarding signup.
      const signupArgs: Parameters<typeof signup> = [
        validated.email,
        validated.password,
        validated.fullName as string,
        validated.role,
        turnstileToken.value,
        validated.dateOfBirth,
      ];
      if (onboardingStep1) {
        signupArgs.push(undefined, onboardingStep1);
      }
      // Pad to the getFreshCaptchaToken slot (7th–9th are pendingAdmin,
      // onboardingStep1, inviteToken — none set here beyond the above).
      while (signupArgs.length < 9) signupArgs.push(undefined);
      signupArgs.push(getFreshTurnstileToken);
      const authData = await signup(...signupArgs);

      if (!authData?.data?.user?.id) {
        throw new Error("No user returned from signup");
      }

      userId = authData.data.user.id;
    } catch (signupErr: unknown) {
      // /api/auth/signup tags its own failures with a stable `data.code` —
      // message text is not a contract and changed once already when account
      // creation moved server-side.
      // h3 nests `data` inside the serialized error body, so the client sees
      // it one level deeper than the server set it; read both shapes so this
      // holds whether the error was thrown locally or came over the wire.
      const errData = (
        signupErr as {
          data?: { code?: string; data?: { code?: string } };
        } | null
      )?.data;
      const errCode = errData?.code ?? errData?.data?.code;

      // The account may have been created in a previous request (race
      // condition or double-submit).
      if (errCode === "email_taken") {
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
      } else if (errCode === "captcha_failed") {
        // The Turnstile check rejected a replayed/expired token — commonly
        // the second half of a double-submit, where the first request already
        // created the account (verification email sent). Surface actionable
        // guidance; the widget reset below gets a genuine retry a fresh token.
        throw new Error(
          "We couldn't confirm you're not a robot in time. If you already received a confirmation email, check your inbox — otherwise, please try again.",
        );
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
    // Postgrest/Supabase errors carry `.message` but aren't `Error`
    // instances — fall back to it before the generic string so a rejected
    // upsert (e.g. a DB trigger check_violation) surfaces its real reason.
    const message =
      err instanceof Error
        ? err.message
        : ((err as { message?: string } | null)?.message ?? "Signup failed");
    // Set form-level error
    setErrors([{ field: "form", message }]);
    resetTurnstile();
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
