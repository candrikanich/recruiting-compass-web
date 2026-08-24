<script setup lang="ts">
import { ref, computed, onMounted, inject } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useUserStore } from "~/stores/user";
import { useSupabase } from "~/composables/useSupabase";
import { useAppToast } from "~/composables/useAppToast";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";

definePageMeta({ auth: false });

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
      await login(loginEmail.value, loginPassword.value);
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
    const authData = await signup(
      signupEmail.value,
      signupPassword.value,
      fullName,
      invite.value.role,
    );

    if (!authData?.data?.user?.id) throw new Error("Signup failed");

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
  <div class="mx-auto max-w-md px-4 py-16">
    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" data-testid="loading">
      Loading invite...
    </div>

    <!-- Declined -->
    <div v-else-if="fetchStatus === 'declined'" data-testid="invite-declined">
      <h1 class="mb-2 text-xl font-semibold">Invitation declined</h1>
      <p class="text-gray-600">
        You've declined this invitation. No action is needed.
      </p>
    </div>

    <!-- Error: expired -->
    <div v-else-if="fetchError?.statusCode === 410" data-testid="error-expired">
      <h1 class="mb-2 text-xl font-semibold">This invite has expired</h1>
      <p class="text-gray-600">Ask a family member to send a new invite.</p>
    </div>

    <!-- Error: already accepted -->
    <div
      v-else-if="fetchError?.statusCode === 409"
      data-testid="error-accepted"
    >
      <h1 class="mb-2 text-xl font-semibold">Already connected</h1>
      <p class="text-gray-600">You're already a member of this family.</p>
      <DesignSystemButton to="/dashboard" class="mt-4"
        >Go to dashboard</DesignSystemButton
      >
    </div>

    <!-- Error: not found or other -->
    <div v-else-if="fetchStatus === 'error'" data-testid="error-not-found">
      <h1 class="mb-2 text-xl font-semibold">Invite not found</h1>
      <p class="text-gray-600">This link may be invalid or already used.</p>
    </div>

    <!-- Valid invite -->
    <div v-else-if="invite">
      <h1 class="mb-1 text-2xl font-semibold">
        You're invited to join {{ invite.familyName }}'s recruiting journey
      </h1>
      <p class="mb-6 text-gray-600">
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
        <div data-testid="login-section">
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
            class="mb-3"
          />
          <DesignSystemInput
            v-model="loginPassword"
            data-testid="password-input"
            label="Password"
            type="password"
            class="mb-4"
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
        </div>

        <!-- Signup option -->
        <div class="mt-8" data-testid="signup-section">
          <p class="mb-4 text-sm text-gray-500">
            Don't have an account?
            <NuxtLink to="/signup" class="text-blue-600 hover:underline"
              >Create one instead</NuxtLink
            >.
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
          />
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
</template>
