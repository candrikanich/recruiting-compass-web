<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRuntimeConfig } from "#app";
import { useAuth } from "~/composables/useAuth";
import { useUserStore } from "~/stores/user";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useAppToast } from "~/composables/useAppToast";
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import { suppressAutoFamilyCreateOnNextSignIn } from "~/composables/useAccountProvisioning";
// The bare <MultiSportFieldBackground /> tag silently resolves to nothing
// without this — Nuxt auto-imports components/Auth/*.vue under the
// Auth-prefixed tag; pages/signup.vue and pages/login.vue only work because
// they import it explicitly.
import MultiSportFieldBackground from "~/components/Auth/MultiSportFieldBackground.vue";

definePageMeta({ auth: false, layout: "public" });

const route = useRoute();
const token = computed(() => route.params.token as string);

const { login, signup } = useAuth();
const userStore = useUserStore();
const { $fetchAuth } = useAuthFetch();
const { showToast } = useAppToast();
const familyCtx = useFamilyCtx();

interface ClaimDetails {
  guardianEmail: string;
  playerName: string;
  playerDateOfBirth: string | null;
  playerGraduationYear: number | null;
  expiresAt: string;
}

const claim = ref<ClaimDetails | null>(null);
const loadError = ref("");
const loading = ref(true);
const submitting = ref(false);
const formError = ref("");

// The guardian may or may not already have an account. Signed-in guardians whose email
// matches skip straight to confirming.
const mode = ref<"signup" | "login">("signup");
const firstName = ref("");
const lastName = ref("");
const password = ref("");
const confirmPassword = ref("");
const agreeToTerms = ref(false);

const isSignedInAsGuardian = computed(
  () =>
    Boolean(userStore.user?.email) &&
    userStore.user?.email?.trim().toLowerCase() ===
      claim.value?.guardianEmail.trim().toLowerCase(),
);

// --- Turnstile (optional, flag-gated) ----------------------------------------
// Both the signup and login branches on this page create/authenticate a real
// Supabase account, same as pages/signup.vue and pages/login.vue — same CAPTCHA
// requirement, same gap class if omitted (see login-turnstile-captcha-gap.md /
// join-turnstile-captcha-gap.md: the Supabase Attack Protection toggle is
// project-wide, so every auth entry point needs this independently).
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

// Mount Turnstile once the guardian needs to sign up or log in (not needed at all
// when already signed in as the matching guardian — confirmClaim skips both).
watch(
  [turnstileEnabled, isSignedInAsGuardian, turnstileEl],
  async ([enabled, signedIn, el]) => {
    if (!enabled || signedIn || !el || turnstileWidgetId.value) return;
    try {
      await loadTurnstileScript();
      const w = window as unknown as { turnstile?: TurnstileGlobal };
      if (w.turnstile && el) {
        turnstileWidgetId.value = w.turnstile.render(el, {
          sitekey: turnstileSiteKey.value,
          action: "guardian-claim",
          callback: (token: string) => {
            turnstileToken.value = token;
          },
          "expired-callback": () => {
            turnstileToken.value = undefined;
          },
        });
      }
    } catch {
      // Widget failure is non-fatal — Supabase verifies server-side only when
      // CAPTCHA is enabled in the dashboard; otherwise signup/login proceeds.
    }
  },
  { flush: "post" },
);

// signup() consumes this widget's token server-side (verifyTurnstile, before
// creating the account) -- reusing that same token for the
// signInWithPassword call that follows gets rejected as replayed
// ("timeout-or-duplicate"), same bug class pages/signup.vue fixed. Reset the
// widget and wait for it to auto-resolve a fresh token.
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
// ---------------------------------------------------------------------------

onMounted(async () => {
  try {
    claim.value = await $fetch<ClaimDetails>(
      `/api/guardian/claim/${encodeURIComponent(token.value)}`,
    );
  } catch (err) {
    loadError.value =
      (err as { data?: { statusMessage?: string } } | null)?.data
        ?.statusMessage ?? "This confirmation link could not be loaded.";
  } finally {
    loading.value = false;
  }
});

const confirmClaim = async () => {
  await $fetchAuth(`/api/guardian/claim/${encodeURIComponent(token.value)}/accept`, {
    method: "POST",
  });
  // The app-wide family-context singleton (provided once at app.vue mount) already
  // fetched /api/family/accessible the moment signup() flipped the guardian's role to
  // "parent" -- before this accept call ran -- and caches that result until something
  // refetches it. Without this, the dashboard reads that stale (family-less) snapshot
  // and shows "Your athlete isn't connected yet" even though the accept above just
  // connected them. Found live on QA.
  await familyCtx.refetchFamilies();
  showToast(
    `${claim.value?.playerName ?? "Your athlete"} is all set.`,
    "success",
  );
  await navigateTo("/dashboard");
};

const handleSubmit = async () => {
  if (submitting.value) return;
  formError.value = "";
  submitting.value = true;

  try {
    if (isSignedInAsGuardian.value) {
      await confirmClaim();
      return;
    }

    if (mode.value === "login") {
      // See suppressAutoFamilyCreateOnNextSignIn's own comment: confirmClaim below
      // already handles family setup for this guardian.
      suppressAutoFamilyCreateOnNextSignIn();
      await login(
        claim.value!.guardianEmail,
        password.value,
        false,
        turnstileToken.value,
      );
      await confirmClaim();
      return;
    }

    if (!firstName.value.trim() || !lastName.value.trim()) {
      formError.value = "Please enter your first and last name.";
      return;
    }
    if (password.value !== confirmPassword.value) {
      formError.value = "Passwords don't match.";
      return;
    }
    if (password.value.length < 8) {
      formError.value = "Password must be at least 8 characters.";
      return;
    }
    if (!agreeToTerms.value) {
      formError.value =
        "Please agree to the Terms and Privacy Policy on your athlete's behalf.";
      return;
    }

    // The guardian's own account is created with the email the player named, so the
    // accept endpoint's email binding matches.
    //
    // See suppressAutoFamilyCreateOnNextSignIn's own comment: confirmClaim below
    // already handles family setup for this guardian (joins the player's existing
    // family, or creates one) -- without this the SIGNED_IN listener's own blind
    // /api/family/create call races it and splits the guardian across two families.
    suppressAutoFamilyCreateOnNextSignIn();
    await signup(
      claim.value!.guardianEmail,
      password.value,
      `${firstName.value.trim()} ${lastName.value.trim()}`,
      "parent",
      turnstileToken.value,
      undefined, // dateOfBirth
      undefined, // pendingAdmin
      undefined, // onboardingStep1
      undefined, // inviteToken
      getFreshTurnstileToken,
      true, // skipVerificationEmail — confirmClaim stamps email_verified_at
    );
    await confirmClaim();
  } catch (err) {
    formError.value =
      (err as { data?: { statusMessage?: string } } | null)?.data
        ?.statusMessage ??
      (err instanceof Error ? err.message : "Something went wrong.");
    resetTurnstile();
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-emerald-600">
    <!-- Multi-Sport Field Background -->
    <MultiSportFieldBackground />

    <!-- Content -->
    <div
      class="relative z-10 flex min-h-screen items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-lg">
        <!-- Card -->
        <div
          class="rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xs"
        >
          <!-- Header -->
          <div class="mb-8 text-center">
            <img
              src="~/assets/logos/recruiting-compass-stacked.svg"
              alt="The Recruiting Compass - Find your path, make your move"
              class="mx-auto w-80"
            />
          </div>

          <div v-if="loading" class="text-center text-slate-600">
            Loading your confirmation link…
          </div>

          <div
            v-else-if="loadError"
            class="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
          >
            <h1 class="text-lg font-semibold text-red-900">
              This link isn't usable
            </h1>
            <p class="mt-2 text-sm text-red-800">{{ loadError }}</p>
            <p class="mt-4 text-sm text-red-800">
              Ask your athlete to resend it from their dashboard.
            </p>
          </div>

          <div v-else-if="claim">
            <h1 class="text-xl font-bold text-slate-900">
              {{ claim.playerName }} started a recruiting profile
            </h1>
            <p class="mt-2 text-sm text-slate-600">
              They listed you as their parent or guardian. Because they're
              under 18, their account stays limited until you confirm it —
              they can't message coaches or share their profile in the
              meantime.
            </p>

            <dl class="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
              <div class="flex justify-between py-1">
                <dt class="text-slate-500">Athlete</dt>
                <dd class="font-medium text-slate-900">
                  {{ claim.playerName }}
                </dd>
              </div>
              <div
                v-if="claim.playerGraduationYear"
                class="flex justify-between py-1"
              >
                <dt class="text-slate-500">Class of</dt>
                <dd class="font-medium text-slate-900">
                  {{ claim.playerGraduationYear }}
                </dd>
              </div>
              <div class="flex justify-between py-1">
                <dt class="text-slate-500">Your email</dt>
                <dd class="font-medium text-slate-900">
                  {{ claim.guardianEmail }}
                </dd>
              </div>
            </dl>

            <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
              <template v-if="!isSignedInAsGuardian">
                <div class="flex gap-2 text-sm">
                  <button
                    type="button"
                    :class="[
                      'flex-1 rounded-lg border px-3 py-2',
                      mode === 'signup'
                        ? 'border-blue-600 bg-blue-50 font-medium text-blue-700'
                        : 'border-slate-300 text-slate-600',
                    ]"
                    @click="mode = 'signup'"
                  >
                    I'm new here
                  </button>
                  <button
                    type="button"
                    :class="[
                      'flex-1 rounded-lg border px-3 py-2',
                      mode === 'login'
                        ? 'border-blue-600 bg-blue-50 font-medium text-blue-700'
                        : 'border-slate-300 text-slate-600',
                    ]"
                    @click="mode = 'login'"
                  >
                    I already have an account
                  </button>
                </div>

                <div v-if="mode === 'signup'" class="grid grid-cols-2 gap-3">
                  <input
                    v-model="firstName"
                    type="text"
                    placeholder="First name"
                    autocomplete="given-name"
                    class="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <input
                    v-model="lastName"
                    type="text"
                    placeholder="Last name"
                    autocomplete="family-name"
                    class="rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>

                <input
                  v-model="password"
                  type="password"
                  :placeholder="
                    mode === 'signup' ? 'Create a password' : 'Password'
                  "
                  :autocomplete="
                    mode === 'signup' ? 'new-password' : 'current-password'
                  "
                  class="w-full rounded-lg border border-slate-300 px-3 py-2"
                />

                <input
                  v-if="mode === 'signup'"
                  v-model="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  autocomplete="new-password"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2"
                />

                <label
                  v-if="mode === 'signup'"
                  class="flex items-start gap-2 text-sm text-slate-600"
                >
                  <input v-model="agreeToTerms" type="checkbox" class="mt-1" />
                  <span>
                    I agree to the
                    <NuxtLink to="/legal/terms" class="text-blue-600 underline"
                      >Terms</NuxtLink
                    >
                    and
                    <NuxtLink
                      to="/legal/privacy"
                      class="text-blue-600 underline"
                      >Privacy Policy</NuxtLink
                    >, on my own behalf and on behalf of my athlete.
                  </span>
                </label>
              </template>

              <!-- Cloudflare Turnstile (flag-gated, renders only when site key set) -->
              <div
                v-if="turnstileEnabled && !isSignedInAsGuardian"
                ref="turnstileEl"
                class="flex justify-center"
              />

              <p
                v-if="formError"
                class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                role="alert"
              >
                {{ formError }}
              </p>

              <button
                type="submit"
                :disabled="submitting"
                class="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {{
                  submitting
                    ? "Confirming…"
                    : `Confirm ${claim.playerName}'s account`
                }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
