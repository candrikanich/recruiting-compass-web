<template>
  <div
    class="relative flex min-h-screen items-center justify-center bg-emerald-600 px-6 py-12"
  >
    <div
      role="status"
      aria-live="polite"
      class="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-xs"
    >
      <div v-if="state === 'checking'">
        <UIcon
          name="i-heroicons-arrow-path"
          class="mx-auto h-8 w-8 animate-spin text-brand-blue-600"
          aria-hidden="true"
        />
        <p class="mt-4 text-slate-600">Verifying your email…</p>
      </div>

      <div v-else-if="state === 'verified'">
        <UIcon
          name="i-heroicons-check-circle"
          class="mx-auto h-10 w-10 text-emerald-600"
          aria-hidden="true"
        />
        <h1 class="mt-4 text-lg font-semibold text-slate-900">
          Email verified
        </h1>
        <p class="mt-2 text-sm text-slate-600">Taking you onward…</p>
      </div>

      <div v-else-if="state === 'expired'">
        <UIcon
          name="i-heroicons-clock"
          class="mx-auto h-10 w-10 text-amber-500"
          aria-hidden="true"
        />
        <h1 class="mt-4 text-lg font-semibold text-slate-900">
          This link has expired
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Verification links last 24 hours. Request a new one below.
        </p>
        <!-- Resending needs an authenticated session (the resend endpoint is
             requireAuth-gated). A link opened on a device with no session gets
             the login handoff instead of a button that can only fail. -->
        <button
          v-if="hasSession"
          type="button"
          class="mt-6 rounded-lg bg-brand-blue-600 px-4 py-2 font-medium text-white hover:bg-brand-blue-700 disabled:opacity-50"
          :disabled="resending"
          @click="resend"
        >
          {{ resending ? "Sending…" : "Resend verification email" }}
        </button>
        <NuxtLink
          v-else
          to="/login"
          class="mt-6 inline-block rounded-lg bg-brand-blue-600 px-4 py-2 font-medium text-white hover:bg-brand-blue-700"
        >
          Log in to request a new link
        </NuxtLink>
        <p v-if="resent" class="mt-3 text-sm text-emerald-700">
          New verification email sent — check your inbox.
        </p>
      </div>

      <div v-else>
        <UIcon
          name="i-heroicons-x-circle"
          class="mx-auto h-10 w-10 text-red-500"
          aria-hidden="true"
        />
        <h1 class="mt-4 text-lg font-semibold text-slate-900">
          Verification link is invalid
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Please log in and request a new one from your dashboard.
        </p>
        <NuxtLink
          to="/login"
          class="mt-6 inline-block rounded-lg bg-brand-blue-600 px-4 py-2 font-medium text-white hover:bg-brand-blue-700"
        >
          Go to login
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { useEmailVerification } from "~/composables/useEmailVerification";
import { createClientLogger } from "~/utils/logger";

definePageMeta({ auth: false, layout: "public" });

const logger = createClientLogger("pages/verify-email/[token]");
const route = useRoute();
const token = route.params.token as string;
const { resendVerificationEmail } = useEmailVerification();

const state = ref<"checking" | "verified" | "expired" | "invalid">("checking");
const resending = ref(false);
const resent = ref(false);
// The link can land on a device that was never signed in — resend is only
// offered when there is a session to authenticate it with (spec §4).
const hasSession = ref(false);

async function readSession() {
  const supabase = useSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  hasSession.value = Boolean(session);
  return session;
}

async function routeOnward() {
  if (hasSession.value) {
    await navigateTo("/dashboard");
  } else {
    await navigateTo("/login?reason=email_verified");
  }
}

async function resend() {
  resending.value = true;
  resent.value = false;
  try {
    resent.value = await resendVerificationEmail();
  } catch (err) {
    logger.error("Resend failed", err);
  } finally {
    resending.value = false;
  }
}

onMounted(async () => {
  await readSession();
  try {
    await $fetch(`/api/auth/verify-email/${encodeURIComponent(token)}`, {
      method: "POST",
    });
    state.value = "verified";
    await routeOnward();
  } catch (err: unknown) {
    const statusCode =
      err && typeof err === "object" && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : undefined;
    state.value = statusCode === 410 ? "expired" : "invalid";
  }
});
</script>
