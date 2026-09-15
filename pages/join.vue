<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from "vue";
import { useRuntimeConfig } from "#app";
import { useAuth } from "~/composables/useAuth";
import { useUserStore } from "~/stores/user";
import { useSupabase } from "~/composables/useSupabase";
import { useAppToast } from "~/composables/useAppToast";
import { suppressAutoFamilyCreateOnNextSignIn } from "~/composables/useAccountProvisioning";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";
// The bare <MultiSportFieldBackground /> tag silently resolves to nothing
// without this — Nuxt auto-imports components/Auth/*.vue under the
// Auth-prefixed tag; pages/signup.vue and pages/login.vue only work because
// they import it explicitly.
import MultiSportFieldBackground from "~/components/Auth/MultiSportFieldBackground.vue";

definePageMeta({ auth: false, layout: "public" });

const route = useRoute();
const token = computed(() => route.query.token as string);

const { login, signup } = useAuth();
const userStore = useUserStore();
const supabase = useSupabase();
const { $fetchAuth } = useAuthFetch();
const { showToast } = useAppToast();
const activeFamilyCtx = inject<UseActiveFamilyReturn>("activeFamily");

interface InviteDetails {
  invitationId: string;
  role: "player" | "parent";
  familyName: string;
  invitedEmail: string;
}

interface AcceptPrefill {
  firstName: string;
  lastName: string;
  graduationYear?: number;
  sport?: string;
  position?: string;
}

interface AcceptResponse {
  success: boolean;
  familyUnitId?: string;
  prefill?: AcceptPrefill;
}

const invite = ref<InviteDetails | null>(null);
const fetchError = ref<{ statusCode: number; statusMessage?: string } | null>(
  null,
);
const fetchStatus = ref<"pending" | "success" | "error" | "declined">(
  "pending",
);

// Login form state
const loginEmail = ref("");
const loginPassword = ref("");

// Signup form state
const signupEmail = ref("");
const signupFirstName = ref("");
const signupLastName = ref("");
const signupDateOfBirth = ref("");
const signupPassword = ref("");
const signupConfirmPassword = ref("");
const signupAgreeToTerms = ref(false);

const loading = ref(false);
const declining = ref(false);
const signupError = ref<string | null>(null);
const loginError = ref<string | null>(null);

// Which form is shown for an unauthenticated visitor. Login and signup used
// to render stacked in one screen (confusing — two email/password pairs at
// once); now only one shows at a time. Default to signup: most invitees
// (players invited by a parent) have no account yet — login is the minority
// case (e.g. a parent already on the platform invited to a second child's
// family unit).
const authMode = ref<"login" | "signup">("signup");

// --- Turnstile (optional, flag-gated) ----------------------------------------
const runtimeConfig = useRuntimeConfig();
const turnstileSiteKey = computed(
  () => runtimeConfig.public?.turnstileSiteKey ?? "",
);
const turnstileEnabled = computed(() => turnstileSiteKey.value.length > 0);
const turnstileToken = ref<string | undefined>(undefined);
// Login and signup are separate toggled views, each mounting/unmounting its
// own widget instance as authMode switches — so each needs its own id.
const turnstileLoginEl = ref<HTMLDivElement | null>(null);
const turnstileSignupEl = ref<HTMLDivElement | null>(null);
const turnstileLoginWidgetId = ref<string | undefined>(undefined);
const turnstileSignupWidgetId = ref<string | undefined>(undefined);

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileGlobal = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      size?: "normal" | "compact" | "flexible";
      appearance?: "always" | "execute" | "interaction-only";
      execution?: "render" | "execute";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  execute: (widgetId?: string) => void;
};

// Turnstile tokens are single-use and expire (~5 min) — replaying a stale or
// already-consumed token on retry surfaces as Supabase's opaque
// "timeout-or-duplicate" captcha error, even when the prior request actually
// succeeded.
function resetTurnstile() {
  const w = window as unknown as { turnstile?: TurnstileGlobal };
  turnstileToken.value = undefined;
  if (!w.turnstile) return;
  if (turnstileLoginWidgetId.value)
    w.turnstile.reset(turnstileLoginWidgetId.value);
  if (turnstileSignupWidgetId.value)
    w.turnstile.reset(turnstileSignupWidgetId.value);
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

// Mount a Turnstile widget into `el`, feeding the shared token ref. Used for
// whichever of the login/signup sections is currently toggled into view.
async function mountTurnstile(
  el: HTMLElement,
  action: string,
  widgetId: typeof turnstileLoginWidgetId,
) {
  try {
    await loadTurnstileScript();
    const w = window as unknown as { turnstile?: TurnstileGlobal };
    if (w.turnstile) {
      widgetId.value = w.turnstile.render(el, {
        sitekey: turnstileSiteKey.value,
        action,
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
}

watch(
  [turnstileEnabled, turnstileLoginEl],
  ([enabled, el]) => {
    if (!enabled || !el || turnstileLoginWidgetId.value) return;
    mountTurnstile(el, "join-login", turnstileLoginWidgetId);
  },
  { flush: "post" },
);

watch(
  [turnstileEnabled, turnstileSignupEl],
  ([enabled, el]) => {
    if (!enabled || !el || turnstileSignupWidgetId.value) return;
    mountTurnstile(el, "join-signup", turnstileSignupWidgetId);
  },
  { flush: "post" },
);

// A second, invisible widget dedicated to minting the post-signup sign-in
// token. signup() consumes the signup checkbox widget's token server-side
// (verifyTurnstile, before creating the account) -- resetting and re-polling
// THAT widget was tried first, but reset() on a managed/interactive widget
// re-arms its checkbox and waits for a user click that never comes, so the
// poll just times out and signInWithPassword fires with no token at all
// ("no captcha_token found"). An invisible, execute-mode widget solves
// itself without user interaction. Same bug class pages/signup.vue fixed.
const turnstileSessionEl = ref<HTMLDivElement | null>(null);
const turnstileSessionWidgetId = ref<string | undefined>(undefined);
const turnstileSessionToken = ref<string | undefined>(undefined);

watch(
  [turnstileEnabled, turnstileSessionEl],
  async ([enabled, el]) => {
    if (!enabled || !el || turnstileSessionWidgetId.value) return;
    try {
      await loadTurnstileScript();
      const w = window as unknown as { turnstile?: TurnstileGlobal };
      if (w.turnstile) {
        turnstileSessionWidgetId.value = w.turnstile.render(el, {
          sitekey: turnstileSiteKey.value,
          action: "join-session",
          appearance: "execute",
          execution: "execute",
          callback: (token: string) => {
            turnstileSessionToken.value = token;
          },
          "expired-callback": () => {
            turnstileSessionToken.value = undefined;
          },
          "error-callback": () => {
            turnstileSessionToken.value = undefined;
          },
        });
      }
    } catch {
      // Non-fatal — see mountTurnstile's catch above.
    }
  },
  { flush: "post" },
);

async function getFreshTurnstileToken(): Promise<string | undefined> {
  if (!turnstileEnabled.value || !turnstileSessionWidgetId.value)
    return undefined;
  const w = window as unknown as { turnstile?: TurnstileGlobal };
  if (!w.turnstile) return undefined;
  turnstileSessionToken.value = undefined;
  w.turnstile.execute(turnstileSessionWidgetId.value);
  const start = Date.now();
  while (!turnstileSessionToken.value && Date.now() - start < 8000) {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return turnstileSessionToken.value;
}
// ---------------------------------------------------------------------------

onMounted(async () => {
  if (!token.value) {
    fetchStatus.value = "error";
    fetchError.value = { statusCode: 404, statusMessage: "No token provided" };
    return;
  }
  try {
    invite.value = await $fetch<InviteDetails>(
      `/api/family/invite/${token.value}`,
    );
    // Prefill both forms with the address the invite was sent to — typing a
    // different email is a real failure mode (accept rejects on mismatch).
    loginEmail.value = invite.value.invitedEmail;
    signupEmail.value = invite.value.invitedEmail;
    fetchStatus.value = "success";
  } catch (err: unknown) {
    fetchStatus.value = "error";
    const e = err as { statusCode?: number; statusMessage?: string };
    fetchError.value = {
      statusCode: e?.statusCode ?? 500,
      statusMessage: e?.statusMessage,
    };
  }
});

async function accept() {
  loginError.value = null;
  loading.value = true;
  try {
    if (!userStore.isAuthenticated) {
      await login(
        loginEmail.value,
        loginPassword.value,
        false,
        turnstileToken.value,
      );
    }
    await $fetchAuth(`/api/family/invite/${token.value}/accept`, {
      method: "POST",
    });
    await activeFamilyCtx?.refetchFamilies();
    showToast("You're connected!", "success");
    const { $posthog } = useNuxtApp();
    $posthog?.capture("family_invite_accepted");
    await navigateTo("/dashboard");
  } catch (err: unknown) {
    // Prefer the server's friendly statusMessage (e.g. email-mismatch
    // rejection) over the generic ofetch error message when present.
    const e = err as { statusMessage?: string };
    loginError.value =
      e?.statusMessage ??
      (err instanceof Error
        ? err.message
        : "Login failed. Please check your credentials.");
    resetTurnstile();
  } finally {
    loading.value = false;
  }
}

async function signupAndConnect() {
  if (!invite.value) return;
  signupError.value = null;

  if (signupPassword.value !== signupConfirmPassword.value) {
    signupError.value = "Passwords don't match";
    return;
  }

  // COPPA age gate: block users under 13 (mirrors signup.vue check)
  if (invite.value.role === "player" && signupDateOfBirth.value) {
    const dob = new Date(signupDateOfBirth.value);
    const today = new Date();
    const age =
      today.getFullYear() -
      dob.getFullYear() -
      (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
        ? 1
        : 0);
    if (age < 13) {
      signupError.value =
        "Recruiting Compass is not available for users under 13. If you're a parent, please register with your own information.";
      return;
    }
  }

  loading.value = true;
  try {
    const fullName = `${signupFirstName.value} ${signupLastName.value}`.trim();
    // The invite-accept endpoint handles all family membership itself (adds this
    // user directly into invitation.family_unit_id) -- the SIGNED_IN listener's
    // own blind /api/family/create call would otherwise race it and create a
    // spurious solo family, colliding with idx_player_one_family the same way
    // the guardian-claim flow did (see suppressAutoFamilyCreateOnNextSignIn).
    suppressAutoFamilyCreateOnNextSignIn();
    // inviteToken intentionally omitted here (not token.value): this page
    // performs its own explicit accept call below immediately after signup.
    // Passing it would also set pending_invite_token metadata, which the
    // SIGNED_IN listener's useAccountProvisioning consumes independently --
    // both calls would then race /api/family/invite/[token]/accept over the
    // same single-use invitation. This page is the sole owner of acceptance.
    const authData = await signup(
      signupEmail.value,
      signupPassword.value,
      fullName,
      invite.value.role,
      turnstileToken.value,
      invite.value.role === "player" ? signupDateOfBirth.value : undefined,
      undefined,
      undefined,
      undefined,
      getFreshTurnstileToken,
      true, // skipVerificationEmail — the invite accept stamps email_verified_at
    );

    if (!authData?.data?.user?.id) throw new Error("Signup failed");

    // signup() creates the account server-side and always returns a real
    // session now (see composables/useAuth.ts). Invite acceptance happens
    // explicitly below, not via useAccountProvisioning's SIGNED_IN listener
    // (see inviteToken omission above) — there's no more no-session branch
    // to fall back to here.

    const userRecord: Record<string, unknown> = {
      id: authData.data.user.id,
      email: signupEmail.value,
      full_name: fullName,
      role: invite.value.role,
    };
    if (invite.value.role === "player" && signupDateOfBirth.value)
      userRecord.date_of_birth = signupDateOfBirth.value;
    const { error: upsertError } = await (supabase.from("users") as any).upsert(
      [userRecord],
      { onConflict: "id" },
    );
    if (upsertError) throw new Error("Could not save account details");

    // Initialize the user store so role is available on the next page
    await userStore.initializeUser();

    // Athlete PII (grad year, sport, position) is only released by the accept
    // endpoint, after this account has proven it's the invited email.
    const acceptResult = await $fetchAuth<AcceptResponse>(
      `/api/family/invite/${token.value}/accept`,
      { method: "POST" },
    );
    await activeFamilyCtx?.refetchFamilies();
    showToast("You're connected!", "success");
    const { $posthog: $posthogSignup } = useNuxtApp();
    $posthogSignup?.capture("family_invite_accepted");
    if (invite.value.role === "parent") {
      // Player already connected — parent onboarding is not needed
      await navigateTo("/dashboard");
    } else {
      const query: Record<string, string> = {};
      const prefill = acceptResult?.prefill;
      if (prefill?.graduationYear)
        query.graduationYear = String(prefill.graduationYear);
      if (prefill?.sport) query.sport = prefill.sport;
      if (prefill?.position) query.position = prefill.position;
      await navigateTo(
        Object.keys(query).length
          ? { path: "/onboarding", query }
          : "/onboarding",
      );
    }
  } catch (err: unknown) {
    const e = err as { statusMessage?: string };
    signupError.value =
      e?.statusMessage ??
      (err instanceof Error ? err.message : "Could not create account");
    resetTurnstile();
  } finally {
    loading.value = false;
  }
}

async function decline() {
  declining.value = true;
  try {
    // The decline endpoint runs requireAuth, so it needs the Bearer token —
    // $fetchAuth injects both auth and CSRF, unlike the bare csrf-only post.
    await $fetchAuth(`/api/family/invite/${token.value}/decline`, {
      method: "POST",
    });
    fetchStatus.value = "declined";
  } catch (err: unknown) {
    loginError.value =
      err instanceof Error ? err.message : "Could not decline invitation.";
  } finally {
    declining.value = false;
  }
}
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

          <!-- Loading -->
          <div
            v-if="fetchStatus === 'pending'"
            data-testid="loading"
            class="text-center text-slate-600"
          >
            Loading invite…
          </div>

          <!-- Declined -->
          <div
            v-else-if="fetchStatus === 'declined'"
            data-testid="invite-declined"
            class="text-center"
          >
            <h1 class="text-lg font-semibold text-slate-900">
              Invitation declined
            </h1>
            <p class="mt-2 text-sm text-slate-600">
              You've declined this invitation. No action is needed.
            </p>
          </div>

          <!-- Error: expired -->
          <div
            v-else-if="fetchError?.statusCode === 410"
            data-testid="error-expired"
            class="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
          >
            <h1 class="text-lg font-semibold text-red-900">
              This invite has expired
            </h1>
            <p class="mt-2 text-sm text-red-800">
              Ask a family member to send a new invite.
            </p>
          </div>

          <!-- Error: already accepted -->
          <div
            v-else-if="fetchError?.statusCode === 409"
            data-testid="error-accepted"
            class="text-center"
          >
            <h1 class="text-lg font-semibold text-slate-900">
              Already connected
            </h1>
            <p class="mt-2 text-sm text-slate-600">
              You're already a member of this family.
            </p>
            <DesignSystemButton to="/dashboard" class="mt-4"
              >Go to dashboard</DesignSystemButton
            >
          </div>

          <!-- Error: not found or other -->
          <div
            v-else-if="fetchStatus === 'error'"
            data-testid="error-not-found"
            class="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
          >
            <h1 class="text-lg font-semibold text-red-900">
              Invite not found
            </h1>
            <p class="mt-2 text-sm text-red-800">
              This link may be invalid or already used.
            </p>
          </div>

          <!-- Valid invite -->
          <div v-else-if="invite">
            <h1 class="text-xl font-bold text-slate-900">
              You're invited to join {{ invite.familyName }}'s recruiting
              journey
            </h1>
            <p class="mt-2 text-sm text-slate-600">
              A family member has invited you as a {{ invite.role }}.
            </p>

      <!-- Already authenticated: just confirm -->
      <div v-if="userStore.isAuthenticated">
        <p class="mb-4 text-sm text-gray-500">
          Connecting as {{ userStore.user?.email }}
        </p>
        <p
          v-if="loginError"
          data-testid="accept-error"
          class="mb-3 text-sm text-red-600"
          role="alert"
        >
          {{ loginError }}
        </p>
        <div class="flex gap-3">
          <DesignSystemButton
            data-testid="connect-button"
            :loading="loading"
            @click="accept"
          >
            Connect to {{ invite.familyName }}
          </DesignSystemButton>
          <DesignSystemButton
            data-testid="decline-button"
            variant="outline"
            color="red"
            :loading="declining"
            @click="decline"
          >
            Decline
          </DesignSystemButton>
        </div>
      </div>

      <!-- Not authenticated -->
      <div v-else>
        <!-- Login form -->
        <div v-if="authMode === 'login'" data-testid="login-section">
          <p class="mb-4 text-sm text-gray-500">
            Log in to connect your account.
          </p>
          <p v-if="loginError" class="mb-3 text-sm text-red-600" role="alert">
            {{ loginError }}
          </p>
          <DesignSystemInput
            v-model="loginEmail"
            data-testid="email-input"
            label="Email"
            type="email"
            disabled
            hint="This invite was sent to this address"
            class="mb-3"
          />
          <DesignSystemInput
            v-model="loginPassword"
            data-testid="password-input"
            label="Password"
            type="password"
            class="mb-4"
          />
          <!-- Cloudflare Turnstile (flag-gated, renders only when site key set) -->
          <div
            v-if="turnstileEnabled"
            ref="turnstileLoginEl"
            class="mb-4 flex justify-center"
          />
          <div class="flex gap-3">
            <DesignSystemButton
              data-testid="login-connect-button"
              :loading="loading"
              @click="accept"
            >
              Log in and connect
            </DesignSystemButton>
            <DesignSystemButton
              data-testid="decline-button"
              variant="outline"
              color="red"
              :loading="declining"
              @click="decline"
            >
              Decline
            </DesignSystemButton>
          </div>
          <p class="mt-4 text-sm text-gray-500">
            Don't have an account?
            <button
              type="button"
              data-testid="switch-to-signup"
              class="text-blue-600 hover:underline"
              @click="authMode = 'signup'"
            >
              Create one instead
            </button>
          </p>
        </div>

        <!-- Signup form -->
        <div v-else data-testid="signup-section">
          <p class="mb-4 text-sm text-gray-500">
            Create an account to connect.
          </p>
          <p v-if="signupError" class="mb-3 text-sm text-red-600" role="alert">
            {{ signupError }}
          </p>
          <AuthInviteSignupForm
            :email="signupEmail"
            :role="invite.role"
            :first-name="signupFirstName"
            :last-name="signupLastName"
            :date-of-birth="signupDateOfBirth"
            :password="signupPassword"
            :confirm-password="signupConfirmPassword"
            :agree-to-terms="signupAgreeToTerms"
            :loading="loading"
            @update:email="signupEmail = $event"
            @update:first-name="signupFirstName = $event"
            @update:last-name="signupLastName = $event"
            @update:date-of-birth="signupDateOfBirth = $event"
            @update:password="signupPassword = $event"
            @update:confirm-password="signupConfirmPassword = $event"
            @update:agree-to-terms="signupAgreeToTerms = $event"
            @submit="signupAndConnect"
          >
            <template #captcha>
              <!-- Cloudflare Turnstile (flag-gated, renders only when site
                   key set) -->
              <div
                v-if="turnstileEnabled"
                ref="turnstileSignupEl"
                class="flex justify-center"
              />
              <!-- Invisible widget dedicated to the post-signup sign-in
                   token mint — see getFreshTurnstileToken. Renders nothing. -->
              <div v-if="turnstileEnabled" ref="turnstileSessionEl" />
            </template>
          </AuthInviteSignupForm>
          <p class="mt-4 text-sm text-gray-500">
            Already have an account?
            <button
              type="button"
              data-testid="switch-to-login"
              class="text-blue-600 hover:underline"
              @click="authMode = 'login'"
            >
              Log in instead
            </button>
          </p>
          <div class="mt-4">
            <DesignSystemButton
              data-testid="decline-button"
              variant="outline"
              color="red"
              :loading="declining"
              @click="decline"
            >
              Decline invitation
            </DesignSystemButton>
          </div>
        </div>
      </div>
    </div>
        </div>
      </div>
    </div>
  </div>
</template>
