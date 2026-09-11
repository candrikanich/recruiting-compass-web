<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useUserStore } from "~/stores/user";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useAppToast } from "~/composables/useAppToast";

definePageMeta({ auth: false, layout: "public" });

const route = useRoute();
const token = computed(() => route.params.token as string);

const { login, signup } = useAuth();
const userStore = useUserStore();
const { $fetchAuth } = useAuthFetch();
const { showToast } = useAppToast();

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
      await login(claim.value!.guardianEmail, password.value);
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
    await signup(
      claim.value!.guardianEmail,
      password.value,
      `${firstName.value.trim()} ${lastName.value.trim()}`,
      "parent",
    );
    await confirmClaim();
  } catch (err) {
    formError.value =
      (err as { data?: { statusMessage?: string } } | null)?.data
        ?.statusMessage ??
      (err instanceof Error ? err.message : "Something went wrong.");
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-10">
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

    <div v-else-if="claim" class="rounded-xl border border-slate-200 bg-white p-6">
      <h1 class="text-xl font-bold text-slate-900">
        {{ claim.playerName }} started a recruiting profile
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        They listed you as their parent or guardian. Because they're under 18,
        their account stays limited until you confirm it — they can't message
        coaches or share their profile in the meantime.
      </p>

      <dl class="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
        <div class="flex justify-between py-1">
          <dt class="text-slate-500">Athlete</dt>
          <dd class="font-medium text-slate-900">{{ claim.playerName }}</dd>
        </div>
        <div v-if="claim.playerGraduationYear" class="flex justify-between py-1">
          <dt class="text-slate-500">Class of</dt>
          <dd class="font-medium text-slate-900">
            {{ claim.playerGraduationYear }}
          </dd>
        </div>
        <div class="flex justify-between py-1">
          <dt class="text-slate-500">Your email</dt>
          <dd class="font-medium text-slate-900">{{ claim.guardianEmail }}</dd>
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
            :placeholder="mode === 'signup' ? 'Create a password' : 'Password'"
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
              <NuxtLink to="/legal/privacy" class="text-blue-600 underline"
                >Privacy Policy</NuxtLink
              >, on my own behalf and on behalf of my athlete.
            </span>
          </label>
        </template>

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
</template>
