<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <!-- Multi-Sport Field Background -->
    <div class="absolute inset-0">
      <!-- Grass texture with gradient -->
      <div
        class="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700"
      ></div>

      <!-- Multi-Sport Field markings -->
      <svg
        class="absolute inset-0 w-full h-full opacity-20"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <!-- Baseball: Infield dirt circle -->
        <circle
          cx="600"
          cy="800"
          r="350"
          fill="none"
          stroke="white"
          stroke-width="3"
          opacity="0.4"
        />

        <!-- Baseball: Foul lines -->
        <line
          x1="600"
          y1="800"
          x2="100"
          y2="100"
          stroke="white"
          stroke-width="2"
          opacity="0.5"
        />
        <line
          x1="600"
          y1="800"
          x2="1100"
          y2="100"
          stroke="white"
          stroke-width="2"
          opacity="0.5"
        />

        <!-- Baseball: Basepaths -->
        <line
          x1="600"
          y1="800"
          x2="750"
          y2="650"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="750"
          y1="650"
          x2="600"
          y2="500"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="600"
          y1="500"
          x2="450"
          y2="650"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="450"
          y1="650"
          x2="600"
          y2="800"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />

        <!-- Baseball: Bases -->
        <rect
          x="595"
          y="795"
          width="10"
          height="10"
          fill="white"
          opacity="0.6"
        />
        <rect
          x="745"
          y="645"
          width="10"
          height="10"
          fill="white"
          opacity="0.6"
        />
        <rect
          x="595"
          y="495"
          width="10"
          height="10"
          fill="white"
          opacity="0.6"
        />
        <rect
          x="445"
          y="645"
          width="10"
          height="10"
          fill="white"
          opacity="0.6"
        />

        <!-- Baseball: Outfield arc -->
        <path
          d="M 200 200 Q 600 50 1000 200"
          fill="none"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />

        <!-- Football: Hash marks and yard lines (left side) -->
        <line
          x1="50"
          y1="150"
          x2="50"
          y2="650"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="50"
          y1="200"
          x2="100"
          y2="200"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="50"
          y1="300"
          x2="100"
          y2="300"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="50"
          y1="400"
          x2="120"
          y2="400"
          stroke="white"
          stroke-width="2"
          opacity="0.4"
        />
        <line
          x1="50"
          y1="500"
          x2="100"
          y2="500"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="50"
          y1="600"
          x2="100"
          y2="600"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />

        <!-- Football: Hash marks (right side) -->
        <line
          x1="1150"
          y1="150"
          x2="1150"
          y2="650"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="1100"
          y1="200"
          x2="1150"
          y2="200"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="1100"
          y1="300"
          x2="1150"
          y2="300"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="1080"
          y1="400"
          x2="1150"
          y2="400"
          stroke="white"
          stroke-width="2"
          opacity="0.4"
        />
        <line
          x1="1100"
          y1="500"
          x2="1150"
          y2="500"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <line
          x1="1100"
          y1="600"
          x2="1150"
          y2="600"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />

        <!-- Basketball: Court outline (top left) -->
        <rect
          x="100"
          y="50"
          width="300"
          height="200"
          fill="none"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="100"
          y1="150"
          x2="200"
          y2="150"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <path
          d="M 120 70 Q 180 100 120 180"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <rect
          x="100"
          y="120"
          width="60"
          height="60"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <circle
          cx="300"
          cy="150"
          r="30"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />

        <!-- Basketball: Court outline (top right) -->
        <rect
          x="800"
          y="50"
          width="300"
          height="200"
          fill="none"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <line
          x1="1000"
          y1="150"
          x2="1100"
          y2="150"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <path
          d="M 1080 70 Q 1020 100 1080 180"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <rect
          x="1040"
          y="120"
          width="60"
          height="60"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />

        <!-- Soccer: Penalty boxes -->
        <rect
          x="150"
          y="600"
          width="150"
          height="100"
          fill="none"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <rect
          x="200"
          y="650"
          width="50"
          height="50"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <path
          d="M 200 630 Q 225 600 250 630"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />

        <rect
          x="900"
          y="600"
          width="150"
          height="100"
          fill="none"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <rect
          x="950"
          y="650"
          width="50"
          height="50"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />
        <path
          d="M 950 630 Q 975 600 1000 630"
          fill="none"
          stroke="white"
          stroke-width="1"
          opacity="0.3"
        />

        <!-- Soccer: Center circle -->
        <circle
          cx="600"
          cy="200"
          r="60"
          fill="none"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
        <circle cx="600" cy="200" r="3" fill="white" opacity="0.4" />
        <line
          x1="300"
          y1="200"
          x2="900"
          y2="200"
          stroke="white"
          stroke-width="2"
          opacity="0.3"
        />
      </svg>
    </div>

    <!-- Content -->
    <div
      class="relative z-10 min-h-screen flex items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-md">
        <!-- Back Link -->
        <div class="mb-6">
          <NuxtLink
            to="/"
            class="text-white hover:text-white/80 transition-colors flex items-center gap-2"
          >
            <ArrowLeftIcon class="w-4 h-4" />
            Back to Welcome
          </NuxtLink>
        </div>

        <!-- Verify Email Card -->
        <div
          class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <!-- Status Icon & Header -->
          <div class="text-center mb-8">
            <div
              class="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
              :class="{
                'bg-emerald-100': isVerified,
                'bg-amber-100': !isVerified && !verificationChecking,
                'bg-blue-100': verificationChecking,
              }"
            >
              <!-- Loading state -->
              <svg
                v-if="verificationChecking"
                class="w-11 h-11 text-blue-600 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>

              <!-- Verified state -->
              <svg
                v-else-if="isVerified"
                class="w-11 h-11 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                stroke-width="2"
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
          <div class="mb-8 space-y-4">
            <!-- Loading message -->
            <div
              v-if="verificationChecking"
              class="p-4 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <p class="text-blue-800 text-sm font-medium">
                Checking verification status...
              </p>
            </div>

            <!-- Success message -->
            <div
              v-if="isVerified && !verificationChecking"
              class="p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
            >
              <p class="text-emerald-800 text-sm font-medium">
                Welcome! Your email is verified. You can now access all features
                of Recruiting Compass.
              </p>
            </div>

            <!-- Pending message -->
            <div
              v-if="!isVerified && !verificationChecking && userEmail"
              class="p-4 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <p class="text-amber-800 text-sm">
                We sent a verification email to:
                <span class="font-semibold">{{ userEmail }}</span>
              </p>
              <p class="text-amber-700 text-sm mt-2">
                Click the verification link in the email to confirm your account.
                It may take a minute to arrive.
              </p>
            </div>

            <!-- Error message -->
            <div
              v-if="emailVerification.error.value && !verificationChecking"
              class="p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p class="text-red-800 text-sm font-medium">
                {{ emailVerification.error.value }}
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-4">
            <!-- Resend button -->
            <button
              v-if="!isVerified"
              @click="handleResendEmail"
              :disabled="emailVerification.loading || resendCooldown > 0"
              class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              <span v-if="emailVerification.loading">Sending...</span>
              <span v-else-if="resendCooldown > 0">
                Resend in {{ resendCooldown }}s
              </span>
              <span v-else>Resend Verification Email</span>
            </button>

            <!-- Go to dashboard button -->
            <button
              v-if="isVerified"
              @click="goToDashboard"
              class="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>

            <!-- Link to home -->
            <NuxtLink
              to="/"
              class="block w-full py-3 px-4 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-colors text-center"
            >
              Back to Home
            </NuxtLink>
          </div>

          <!-- Help text -->
          <div class="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p class="text-slate-600 text-xs leading-relaxed">
              <span class="font-semibold text-slate-700">Need help?</span>
              Check your spam folder if you haven't received the verification email.
              If you continue to have issues, please contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });

import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { useEmailVerification } from "~/composables/useEmailVerification";
import { useUserStore } from "~/stores/user";

const router = useRouter();
const route = useRoute();
const emailVerification = useEmailVerification();
const userStore = useUserStore();

// State
const isVerified = ref(false);
const verificationChecking = ref(false);
const userEmail = ref("");
const resendCooldown = ref(0);
const hasAttemptedVerification = ref(false);

/**
 * Handle automatic verification if token is in URL
 * This happens when user clicks email verification link
 */
const handleTokenVerification = async () => {
  const token = route.query.token as string;

  if (!token) {
    // No token in URL, check current verification status
    await checkVerificationStatus();
    return;
  }

  // Token found, attempt verification
  verificationChecking.value = true;
  hasAttemptedVerification.value = true;

  const success = await emailVerification.verifyEmailToken(token);

  if (success) {
    isVerified.value = true;
    // Clear token from URL
    router.replace({ query: {} });
  }

  verificationChecking.value = false;

  // Check status one more time to sync with backend
  await checkVerificationStatus();
};

/**
 * Check current email verification status
 * Syncs with user's auth state
 */
const checkVerificationStatus = async () => {
  verificationChecking.value = true;

  const verified = await emailVerification.checkEmailVerificationStatus();
  isVerified.value = verified;

  // Get email from user store or route param
  if (!userEmail.value) {
    const storedEmail = route.query.email as string;
    if (storedEmail) {
      userEmail.value = storedEmail;
    }
  }

  verificationChecking.value = false;
};

/**
 * Handle resend verification email
 * Includes cooldown to prevent abuse
 */
const handleResendEmail = async () => {
  const success = await emailVerification.resendVerificationEmail(userEmail.value);

  if (success) {
    // Start cooldown timer (60 seconds)
    resendCooldown.value = 60;
    const interval = setInterval(() => {
      resendCooldown.value--;
      if (resendCooldown.value <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }
};

/**
 * Navigate to dashboard
 */
const goToDashboard = () => {
  router.push("/dashboard");
};

/**
 * Initialize - handle token or check status
 */
onMounted(async () => {
  // Get email from route query param (set during signup redirect)
  const emailParam = route.query.email as string;
  if (emailParam) {
    userEmail.value = emailParam;
  }

  // Check if there's a verification token in URL
  await handleTokenVerification();

  // User store will be initialized by app.vue, no need to call here
  // It will pick up the latest verification status automatically
});
</script>
