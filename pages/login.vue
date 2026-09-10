<template>
  <div class="relative min-h-screen overflow-hidden bg-emerald-600">
    <!-- Skip link -->
    <SkipLink to="#login-form" text="Skip to login form" />

    <!-- Multi-Sport Field Background -->
    <MultiSportFieldBackground />

    <!-- Content -->
    <div
      class="relative z-10 flex min-h-screen items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-md">
        <!-- Back Link -->
        <div class="mb-6">
          <NuxtLink
            to="/"
            class="flex items-center gap-2 rounded-sm px-2 py-1 text-white transition-colors hover:text-white/80 focus:ring-2 focus:ring-white focus:ring-offset-2"
          >
            <UIcon
              name="i-heroicons-arrow-left"
              class="h-4 w-4"
              aria-hidden="true"
            />
            Back to Welcome
          </NuxtLink>
        </div>

        <!-- Login Card -->
        <div
          class="rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xs"
        >
          <!-- Header -->
          <div class="mb-8 text-center">
            <h1 class="sr-only">Sign in to The Recruiting Compass</h1>
            <NuxtLink
              to="/"
              class="inline-block rounded-sm transition-all hover:opacity-90 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="The Recruiting Compass - Find your path, make your move (home)"
            >
              <img
                src="~/assets/logos/recruiting-compass-stacked.svg"
                alt=""
                class="mx-auto w-96"
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
            class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3"
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

          <!-- Cloudflare Turnstile (flag-gated, renders only when site key set) -->
          <div
            v-if="turnstileEnabled"
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

import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useRuntimeConfig } from "#app";
import { useAuth } from "~/composables/useAuth";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useFormValidation } from "~/composables/useFormValidation";
import { useFormErrorFocus } from "~/composables/useFormErrorFocus";
import { useUserStore } from "~/stores/user";
import { loginSchema } from "~/utils/validation/schemas";
import { EMAIL_SCHEMA, PASSWORD_SCHEMA } from "~/utils/validation/loginSchemas";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import MultiSportFieldBackground from "~/components/Auth/MultiSportFieldBackground.vue";
import LoginForm from "~/components/Auth/LoginForm.vue";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("pages/login");

// Constants
const SUPABASE_SESSION_PERSIST_DELAY = 100; // ms

const route = useRoute();
const email = ref("");
const password = ref("");
const rememberMe = ref(false);

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
// "timeout-or-duplicate" captcha error.
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

// Mount Turnstile widget once the div exists
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
          action: "login",
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
      // when CAPTCHA is enabled in the dashboard; otherwise login proceeds.
    }
  },
  { flush: "post", immediate: true },
);
// ---------------------------------------------------------------------------

const { loading, validating } = useLoadingStates();
const { login } = useAuth();
const { $fetchAuth } = useAuthFetch();
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

// Computed property for timeout message
const timeoutMessage = computed(() => {
  const reason = route.query.reason;
  if (typeof reason === "string" && reason === "timeout") {
    return "You were logged out due to inactivity. Please sign in again.";
  }
  if (typeof reason === "string" && reason === "session_expired") {
    return "Your session has expired. Please sign in again.";
  }
  if (typeof reason === "string" && reason === "not_admin") {
    return "You don't have access to the admin area.";
  }
  return null;
});

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
  // Guard against double-submit — a second request would replay the
  // already-consumed Turnstile token and get rejected with the opaque
  // "timeout-or-duplicate" captcha error.
  if (loading.value) return;

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
    await login(
      validated.email,
      validated.password,
      rememberMe.value,
      turnstileToken.value,
    );

    // Give Supabase time to persist session to localStorage
    await new Promise((resolve) =>
      setTimeout(resolve, SUPABASE_SESSION_PERSIST_DELAY),
    );

    // Reinitialize user store now that session is established
    await userStore.initializeUser();

    // Confirm-required signups never got a session to create their family
    // unit with (see pages/signup.vue) — ensure it exists on first login.
    // Idempotent (checks existing first) and must never block login.
    try {
      await $fetchAuth("/api/family/create", { method: "POST" });
    } catch (familyErr) {
      logger.error("Failed to ensure family unit on login", familyErr);
    }

    // Navigate to originally requested page, or dashboard as fallback
    const redirectPath =
      typeof route.query.redirect === "string" &&
      route.query.redirect.startsWith("/")
        ? route.query.redirect
        : "/dashboard";
    await navigateTo(redirectPath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    // Set auth error at form level
    setErrors([{ field: "form", message }]);
    resetTurnstile();

    // Focus error summary on authentication error
    await focusErrorSummary();
  } finally {
    loading.value = false;
  }
};
</script>
