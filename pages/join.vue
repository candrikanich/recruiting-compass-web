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
const { post: csrfPost } = useCsrf();
const { showToast } = useAppToast();
const activeFamilyCtx = inject<UseActiveFamilyReturn>("activeFamily");

interface InviteDetails {
  invitationId: string;
  role: "player" | "parent";
  familyName: string;
  prefill?: { firstName: string; lastName: string; graduationYear?: number; sport?: string; position?: string };
}

const invite = ref<InviteDetails | null>(null);
const fetchError = ref<{ statusCode: number; statusMessage?: string } | null>(null);
const fetchStatus = ref<"pending" | "success" | "error" | "declined">("pending");

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
    invite.value = await $fetch<InviteDetails>(`/api/family/invite/${token.value}`);
    fetchStatus.value = "success";
  } catch (err: unknown) {
    fetchStatus.value = "error";
    const e = err as { statusCode?: number; statusMessage?: string };
    fetchError.value = { statusCode: e?.statusCode ?? 500, statusMessage: e?.statusMessage };
  }
});

async function accept() {
  loginError.value = null;
  loading.value = true;
  try {
    if (!userStore.isAuthenticated) {
      await login(loginEmail.value, loginPassword.value);
    }
    await $fetchAuth(`/api/family/invite/${token.value}/accept`, { method: "POST" });
    await activeFamilyCtx?.refetchFamilies();
    showToast("You're connected!", "success");
    const { $posthog } = useNuxtApp();
    $posthog?.capture("family_invite_accepted");
    await navigateTo("/dashboard");
  } catch (err: unknown) {
    loginError.value = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
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

  loading.value = true;
  try {
    const fullName = `${signupFirstName.value} ${signupLastName.value}`.trim();
    const authData = await signup(signupEmail.value, signupPassword.value, fullName, invite.value.role);

    if (!authData?.data?.user?.id) throw new Error("Signup failed");

    const userRecord: Record<string, unknown> = { id: authData.data.user.id, email: signupEmail.value, full_name: fullName, role: invite.value.role };
    if (invite.value.role === "player" && signupDateOfBirth.value) userRecord.date_of_birth = signupDateOfBirth.value;
    const { error: upsertError } = await (supabase.from("users") as any).upsert([userRecord], { onConflict: "id" });
    if (upsertError) throw new Error("Could not save account details");

    // Initialize the user store so role is available on the next page
    await userStore.initializeUser();

    await $fetchAuth(`/api/family/invite/${token.value}/accept`, { method: "POST" });
    await activeFamilyCtx?.refetchFamilies();
    showToast("You're connected!", "success");
    const { $posthog: $posthogSignup } = useNuxtApp();
    $posthogSignup?.capture("family_invite_accepted");
    if (invite.value.role === "parent") {
      // Player already connected — parent onboarding is not needed
      await navigateTo("/dashboard");
    } else {
      const query: Record<string, string> = {};
      if (invite.value.prefill?.graduationYear) query.graduationYear = String(invite.value.prefill.graduationYear);
      if (invite.value.prefill?.sport) query.sport = invite.value.prefill.sport;
      if (invite.value.prefill?.position) query.position = invite.value.prefill.position;
      await navigateTo(Object.keys(query).length ? { path: "/onboarding", query } : "/onboarding");
    }
  } catch (err: unknown) {
    signupError.value = err instanceof Error ? err.message : "Could not create account";
  } finally {
    loading.value = false;
  }
}

async function decline() {
  declining.value = true;
  try {
    await csrfPost(`/api/family/invite/${token.value}/decline`);
    fetchStatus.value = "declined";
  } finally {
    declining.value = false;
  }
}
</script>

<template>
  <div class="max-w-md mx-auto py-16 px-4">
    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" data-testid="loading">
      Loading invite...
    </div>

    <!-- Declined -->
    <div v-else-if="fetchStatus === 'declined'" data-testid="invite-declined">
      <h1 class="text-xl font-semibold mb-2">Invitation declined</h1>
      <p class="text-gray-600">You've declined this invitation. No action is needed.</p>
    </div>

    <!-- Error: expired -->
    <div v-else-if="fetchError?.statusCode === 410" data-testid="error-expired">
      <h1 class="text-xl font-semibold mb-2">This invite has expired</h1>
      <p class="text-gray-600">Ask a family member to send a new invite.</p>
    </div>

    <!-- Error: already accepted -->
    <div v-else-if="fetchError?.statusCode === 409" data-testid="error-accepted">
      <h1 class="text-xl font-semibold mb-2">Already connected</h1>
      <p class="text-gray-600">You're already a member of this family.</p>
      <DesignSystemButton to="/dashboard" class="mt-4">Go to dashboard</DesignSystemButton>
    </div>

    <!-- Error: not found or other -->
    <div v-else-if="fetchStatus === 'error'" data-testid="error-not-found">
      <h1 class="text-xl font-semibold mb-2">Invite not found</h1>
      <p class="text-gray-600">This link may be invalid or already used.</p>
    </div>

    <!-- Valid invite -->
    <div v-else-if="invite">
      <h1 class="text-2xl font-semibold mb-1">
        You're invited to join {{ invite.familyName }}'s recruiting journey
      </h1>
      <p class="text-gray-600 mb-6">
        A family member has invited you as a {{ invite.role }}.
      </p>

      <!-- Already authenticated: just confirm -->
      <div v-if="userStore.isAuthenticated">
        <p class="text-sm text-gray-500 mb-4">
          Connecting as {{ userStore.user?.email }}
        </p>
        <div class="flex gap-3">
          <DesignSystemButton data-testid="connect-button" :loading="loading" @click="accept">
            Connect to {{ invite.familyName }}
          </DesignSystemButton>
          <DesignSystemButton data-testid="decline-button" variant="outline" color="red" :loading="declining" @click="decline">
            Decline
          </DesignSystemButton>
        </div>
      </div>

      <!-- Not authenticated -->
      <div v-else>
        <!-- Login form -->
        <div data-testid="login-section">
          <p class="text-sm text-gray-500 mb-4">Log in to connect your account.</p>
          <p v-if="loginError" class="text-sm text-red-600 mb-3" role="alert">{{ loginError }}</p>
          <DesignSystemInput v-model="loginEmail" data-testid="email-input" label="Email" type="email" class="mb-3" />
          <DesignSystemInput v-model="loginPassword" data-testid="password-input" label="Password" type="password" class="mb-4" />
          <div class="flex gap-3">
            <DesignSystemButton data-testid="login-connect-button" :loading="loading" @click="accept">
              Log in and connect
            </DesignSystemButton>
            <DesignSystemButton data-testid="decline-button" variant="outline" color="red" :loading="declining" @click="decline">
              Decline
            </DesignSystemButton>
          </div>
        </div>

        <!-- Signup option -->
        <div class="mt-8" data-testid="signup-section">
          <p class="text-sm text-gray-500 mb-4">
            Don't have an account?
            <NuxtLink to="/signup" class="text-blue-600 hover:underline">Create one instead</NuxtLink>.
          </p>
          <p v-if="signupError" class="text-sm text-red-600 mb-3" role="alert">{{ signupError }}</p>
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
            :prefill="invite.prefill"
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
            <DesignSystemButton data-testid="decline-button" variant="outline" color="red" :loading="declining" @click="decline">
              Decline invitation
            </DesignSystemButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
