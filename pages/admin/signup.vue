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
              <DesignSystemFormAnimatedCheck
                v-model="agreeToTerms"
                size="sm"
                class="items-start"
              >
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
              </DesignSystemFormAnimatedCheck>
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

            <!-- Cloudflare Turnstile (flag-gated, renders only when site key set) -->
            <div
              v-if="turnstileEnabled"
              ref="turnstileEl"
              class="flex justify-center"
            />
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

import { ref, computed, watch } from "vue";
import { useRuntimeConfig } from "#app";
import { useAuth } from "~/composables/useAuth";
import { useAuthFetch } from "~/composables/useAuthFetch";
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

// --- Turnstile (optional, flag-gated) ----------------------------------------
// Supabase Attack Protection requires a captcha token on EVERY auth call it
// guards, including the recovery login below — not just the initial signup.
// Tokens are single-use, so the recovery path needs its own freshly-minted
// token rather than replaying the one already spent on signup().
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

function resetTurnstile() {
  const w = window as unknown as { turnstile?: TurnstileGlobal };
  turnstileToken.value = undefined;
  if (w.turnstile && turnstileWidgetId.value) {
    w.turnstile.reset(turnstileWidgetId.value);
  }
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

watch(
  [turnstileEnabled, turnstileEl],
  async ([enabled, el]) => {
    if (!enabled || !el || turnstileWidgetId.value) return;
    try {
      await loadTurnstileScript();
      const w = window as unknown as { turnstile?: TurnstileGlobal };
      if (w.turnstile && el) {
        turnstileWidgetId.value = w.turnstile.render(el, {
          sitekey: turnstileSiteKey.value,
          action: "admin_signup",
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
      // when CAPTCHA is enabled in the dashboard; otherwise auth proceeds.
    }
  },
  { flush: "post", immediate: true },
);

// Resets the widget and waits for its non-interactive re-verification to
// mint a new token, since the signup() token above is already consumed by
// the time we know a recovery login is needed.
async function mintFreshTurnstileToken(
  timeoutMs = 5000,
): Promise<string | undefined> {
  if (!turnstileEnabled.value) return undefined;
  resetTurnstile();
  const start = Date.now();
  while (!turnstileToken.value && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return turnstileToken.value;
}
// ---------------------------------------------------------------------------

const { signup, login } = useAuth();
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
    body: { token: adminToken.value, email: email.value },
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
    try {
      // Sign up with Supabase Auth (register as parent, will set admin flag after)
      const authData = await signup(
        validated.email,
        validated.password,
        validated.fullName as string,
        "parent",
        turnstileToken.value,
        undefined, // dateOfBirth — not collected on this form
        true, // pendingAdmin — carries validated adminToken intent past confirmation
        // NOT skipVerificationEmail: unlike the invite/guardian-claim paths
        // (spec §5), nothing stamps email_verified_at for an admin signup, so
        // the verification email is still the only thing that can verify them.
      );

      if (!authData?.data?.user?.id) {
        throw new Error("No user returned from signup");
      }

      // Do not log authData directly — it contains the session/tokens.
      logger.debug("Signup response received");
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
        } else {
          // No active session — the credentials just entered are still the
          // account's real credentials, so recover by logging in rather than
          // failing outright. The signup() token above is already consumed
          // (Turnstile tokens are single-use), so mint a fresh one here.
          logger.debug(
            "No active session, attempting recovery login with a fresh Turnstile token...",
          );

          const recoveryCaptchaToken = await mintFreshTurnstileToken();
          const loginResult = await login(
            validated.email,
            validated.password,
            false,
            recoveryCaptchaToken,
          );

          if (!loginResult?.data?.session?.user?.id) {
            throw signupErr;
          }
        }
      } else {
        // Different error - rethrow it
        throw signupErr;
      }
    }

    // signup() creates the account server-side and always returns a real
    // session now (see composables/useAuth.ts) — no more "email confirmation
    // required, apply admin flag on first login" branch to fall back to.
    // $fetchAuth (not bare $fetch) is required here — admin-profile.post.ts
    // is an authed endpoint gated by requireAuth, which reads the session
    // Bearer token/cookie that only $fetchAuth attaches.
    await $fetchAuth("/api/auth/admin-profile", {
      method: "POST",
      body: {
        fullName: validated.fullName,
        adminToken: adminToken.value,
      },
    }).catch((err) => {
      throw new Error(
        err.data?.statusMessage || "Failed to create admin profile",
      );
    });

    logger.info("Admin profile created successfully");

    await userStore.initializeUser();
    await navigateTo("/dashboard");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signup failed";
    // Set form-level error
    setErrors([{ field: "form", message }]);
    logger.error("Signup error", err);
    loading.value = false;
  }
};
</script>
