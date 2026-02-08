<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <AuthMultiSportFieldBackground />

    <main
      class="relative z-10 min-h-screen flex items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-md">
        <!-- Skip link -->
        <SkipLink to="#verify-card" text="Skip to verification status" />

        <!-- Navigation -->
        <nav aria-label="Page navigation" class="mb-6">
          <NuxtLink
            to="/"
            class="text-white hover:text-white/80 transition-colors flex items-center gap-2 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          >
            <ArrowLeftIcon class="w-4 h-4" aria-hidden="true" />
            Back to Home
          </NuxtLink>
        </nav>

        <!-- Verify Email Card -->
        <div
          id="verify-card"
          class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <!-- Status Icon & Header -->
          <div class="text-center mb-8">
            <div
              class="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
              :class="{
                'bg-emerald-100': isVerified,
                'bg-amber-100': !isVerified && !loading,
                'bg-blue-100': loading,
              }"
              role="img"
              :aria-label="statusIconLabel"
            >
              <!-- Loading state -->
              <svg
                v-if="loading"
                class="w-11 h-11 text-blue-600 animate-spin motion-reduce:animate-none"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>

              <!-- Verified state -->
              <svg
                v-else-if="isVerified"
                class="w-11 h-11 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <!-- Pending state -->
              <svg
                v-else
                class="w-11 h-11 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h1 class="text-slate-900 text-3xl font-bold mb-2">
              Verify Your Email
            </h1>
            <p class="text-slate-600">
              {{
                isVerified
                  ? "Your email has been verified!"
                  : "Check your email for a verification link"
              }}
            </p>
          </div>

          <!-- Verification Status Messages -->
          <section aria-label="Verification status" class="mb-8 space-y-4">
            <!-- Loading message -->
            <div
              v-if="loading"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              class="p-4 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <p class="text-blue-900 text-sm font-medium">
                Checking verification status...
              </p>
            </div>

            <!-- Success message -->
            <div
              v-if="isVerified && !loading"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              class="p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
            >
              <p class="text-emerald-900 text-sm font-medium">
                Welcome! Your email is verified. You can now access all features
                of Recruiting Compass.
              </p>
            </div>

            <!-- Pending message -->
            <div
              v-if="!isVerified && !loading && userEmail"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              class="p-4 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <p class="text-amber-900 text-sm">
                We sent a verification email to:
                <span class="font-semibold">{{ userEmail }}</span>
              </p>
              <p class="text-amber-900 text-sm mt-2">
                Click the verification link in the email to confirm your
                account. It may take a minute to arrive.
              </p>
            </div>

            <!-- Error message -->
            <div
              v-if="emailVerification.error.value && !loading"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              class="p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p class="text-red-900 text-sm font-medium">
                {{ emailVerification.error.value }}
              </p>
            </div>
          </section>

          <!-- Actions -->
          <section aria-label="Actions" class="space-y-4">
            <!-- SR-only announcement for cooldown state changes -->
            <div
              ref="cooldownAnnouncementRef"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              class="sr-only"
            />

            <!-- Resend button -->
            <button
              v-if="!isVerified"
              ref="resendButtonRef"
              @click="handleResendEmail"
              :disabled="emailVerification.loading.value || resendCooldown > 0"
              :aria-busy="emailVerification.loading.value"
              :aria-label="resendButtonLabel"
              class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span v-if="emailVerification.loading.value">Sending...</span>
              <span v-else-if="resendCooldown > 0">
                Resend in {{ resendCooldown }}s
              </span>
              <span v-else>Resend Verification Email</span>
            </button>

            <!-- Go to dashboard button -->
            <button
              v-if="isVerified"
              ref="dashboardButtonRef"
              @click="goToDashboard"
              class="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Go to Dashboard
            </button>
          </section>

          <!-- Help section -->
          <section
            aria-labelledby="help-heading"
            class="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200"
          >
            <h2 id="help-heading" class="font-semibold text-slate-700 text-xs">
              Need help?
            </h2>
            <p class="text-slate-600 text-xs leading-relaxed mt-1">
              Check your spam folder if you haven't received the verification
              email. If you continue to have issues, please contact support.
            </p>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });

import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { useEmailVerification } from "~/composables/useEmailVerification";

const router = useRouter();
const route = useRoute();
const emailVerification = useEmailVerification();

const isVerified = ref(false);
const userEmail = ref("");

const { loading } = useLoadingStates();
const resendCooldown = ref(0);

const resendButtonRef = ref<HTMLButtonElement | null>(null);
const dashboardButtonRef = ref<HTMLButtonElement | null>(null);
const cooldownAnnouncementRef = ref<HTMLDivElement | null>(null);

const statusIconLabel = computed(() => {
  if (loading.value) return "Checking email verification status";
  if (isVerified.value) return "Email verified";
  return "Email pending verification";
});

const resendButtonLabel = computed(() => {
  if (emailVerification.loading.value)
    return "Sending verification email, please wait";
  if (resendCooldown.value > 0)
    return `Resend email available in ${resendCooldown.value} seconds`;
  return "Resend verification email";
});

watch(isVerified, async (verified) => {
  if (verified) {
    await nextTick();
    dashboardButtonRef.value?.focus();
  }
});

watch(resendCooldown, (value) => {
  if (value === 0 && cooldownAnnouncementRef.value) {
    cooldownAnnouncementRef.value.textContent =
      "Resend verification email button is available again.";
  }
});

const handleTokenVerification = async () => {
  const token = route.query.token as string;

  if (!token) {
    await checkVerificationStatus();
    return;
  }

  loading.value = true;

  const success = await emailVerification.verifyEmailToken(token);

  if (success) {
    isVerified.value = true;
    router.replace({ query: {} });
  }

  loading.value = false;
};

const checkVerificationStatus = async () => {
  loading.value = true;

  const verified = await emailVerification.checkEmailVerificationStatus();
  isVerified.value = verified;

  if (!userEmail.value) {
    const storedEmail = route.query.email as string;
    if (storedEmail) {
      userEmail.value = storedEmail;
    }
  }

  loading.value = false;
};

const handleResendEmail = async () => {
  const success = await emailVerification.resendVerificationEmail(
    userEmail.value,
  );

  if (success) {
    resendCooldown.value = 60;

    if (cooldownAnnouncementRef.value) {
      cooldownAnnouncementRef.value.textContent =
        "Verification email sent. You can send another in 60 seconds.";
    }

    const interval = setInterval(() => {
      resendCooldown.value--;
      if (resendCooldown.value <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }
};

const goToDashboard = () => {
  router.push("/dashboard");
};

onMounted(async () => {
  const emailParam = route.query.email as string;
  if (emailParam) {
    userEmail.value = emailParam;
  }

  await handleTokenVerification();
});
</script>
