<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <AuthMultiSportFieldBackground />

    <main
      class="relative z-10 min-h-screen flex items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-md">
        <!-- Navigation -->
        <nav aria-label="Page navigation" class="mb-6">
          <NuxtLink
            to="/login"
            class="text-white hover:text-white/80 transition-colors flex items-center gap-2 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          >
            <ArrowLeftIcon class="w-4 h-4" aria-hidden="true" />
            Back to Login
          </NuxtLink>
        </nav>

        <!-- Forgot Password Card -->
        <div
          class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <!-- Header -->
          <div class="text-center mb-8">
            <div
              class="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
              :class="{
                'bg-emerald-100': emailSent,
                'bg-amber-100': !emailSent,
              }"
              role="img"
              :aria-label="
                emailSent ? 'Reset email sent' : 'Password reset form'
              "
            >
              <svg
                v-if="!emailSent"
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

              <svg
                v-else
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
            </div>

            <h1 class="text-slate-900 text-3xl font-bold mb-2">
              {{ emailSent ? "Check Your Email" : "Reset Your Password" }}
            </h1>
            <p class="text-slate-600">
              {{
                emailSent
                  ? "We've sent you a password reset link"
                  : "Enter your email to receive a password reset link"
              }}
            </p>
          </div>

          <!-- Form error summary -->
          <FormErrorSummary
            v-if="hasErrors && !emailSent"
            :errors="errors"
            @dismiss="clearErrors"
            class="mb-6"
          />

          <!-- Success message -->
          <div
            v-if="emailSent"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            class="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
          >
            <p class="text-emerald-900 text-sm font-medium">
              We've sent a password reset link to
              <span class="font-semibold">{{ submittedEmail }}</span>
            </p>
            <p class="text-emerald-900 text-sm mt-2">
              Click the link in the email to reset your password. The link will
              expire in 24 hours.
            </p>
          </div>

          <!-- Form -->
          <form
            v-if="!emailSent"
            @submit.prevent="handleSubmit"
            class="space-y-6"
          >
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-slate-700 mb-2"
              >
                Email
              </label>
              <div class="relative">
                <EnvelopeIcon
                  class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                  :disabled="loading || validating"
                  @blur="validateEmail"
                />
              </div>
              <FieldError :error="fieldErrors.email" />
            </div>

            <button
              data-testid="send-reset-link-button"
              type="submit"
              :disabled="!isFormValid || loading || validating"
              class="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {{
                loading
                  ? "Sending..."
                  : validating
                    ? "Validating..."
                    : "Send Reset Link"
              }}
            </button>
          </form>

          <!-- Actions after email sent -->
          <div v-if="emailSent" class="space-y-4">
            <!-- SR-only announcement for cooldown -->
            <div
              ref="cooldownAnnouncementRef"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              class="sr-only"
            />

            <button
              @click="handleResend"
              :disabled="passwordReset.loading.value || resendCooldown > 0"
              :aria-busy="passwordReset.loading.value"
              :aria-label="resendButtonLabel"
              class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span v-if="passwordReset.loading.value">Sending...</span>
              <span v-else-if="resendCooldown > 0">
                Resend in {{ resendCooldown }}s
              </span>
              <span v-else>Resend Reset Link</span>
            </button>

            <NuxtLink
              to="/login"
              class="block w-full py-3 px-4 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-colors text-center focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
            >
              Back to Login
            </NuxtLink>
          </div>

          <!-- Help section -->
          <section
            aria-labelledby="help-heading"
            class="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200"
          >
            <h2 id="help-heading" class="font-semibold text-slate-700 text-xs">
              Tip
            </h2>
            <p class="text-slate-600 text-xs leading-relaxed mt-1">
              Check your spam or promotions folder if you don't see the reset
              email. The link will expire after 24 hours.
            </p>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });

import { ref, computed } from "vue";
import { ArrowLeftIcon, EnvelopeIcon } from "@heroicons/vue/24/outline";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import FieldError from "~/components/DesignSystem/FieldError.vue";
import { usePasswordReset } from "~/composables/usePasswordReset";
import { useFormValidation } from "~/composables/useFormValidation";
import { forgotPasswordSchema } from "~/utils/validation/schemas";
import { z } from "zod";

const EMAIL_SCHEMA = z.object({ email: forgotPasswordSchema.shape.email });

const email = ref("");
const loading = ref(false);
const validating = ref(false);
const emailSent = ref(false);
const submittedEmail = ref("");
const resendCooldown = ref(0);
const cooldownAnnouncementRef = ref<HTMLDivElement | null>(null);

const passwordReset = usePasswordReset();
const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors } =
  useFormValidation();

const isFormValid = computed(
  () => !hasErrors.value && email.value.trim().length > 0,
);

const resendButtonLabel = computed(() => {
  if (passwordReset.loading.value) return "Sending reset link, please wait";
  if (resendCooldown.value > 0)
    return `Resend available in ${resendCooldown.value} seconds`;
  return "Resend reset link";
});

const validateEmail = async () => {
  validating.value = true;
  try {
    await validateField("email", email.value, EMAIL_SCHEMA.shape.email);
  } finally {
    validating.value = false;
  }
};

const startCooldown = () => {
  resendCooldown.value = 60;
  const interval = setInterval(() => {
    resendCooldown.value--;
    if (resendCooldown.value <= 0) {
      clearInterval(interval);
      if (cooldownAnnouncementRef.value) {
        cooldownAnnouncementRef.value.textContent =
          "Resend reset link button is available again.";
      }
    }
  }, 1000);
};

const handleSubmit = async () => {
  clearErrors();
  loading.value = true;

  try {
    const validated = await validate(
      { email: email.value },
      forgotPasswordSchema,
    );

    if (!validated) {
      return;
    }

    const success = await passwordReset.requestPasswordReset(validated.email);

    if (success) {
      emailSent.value = true;
      submittedEmail.value = validated.email;
      passwordReset.clearError();
      startCooldown();
    }
  } finally {
    loading.value = false;
  }
};

const handleResend = async () => {
  const success = await passwordReset.requestPasswordReset(
    submittedEmail.value,
  );

  if (success) {
    if (cooldownAnnouncementRef.value) {
      cooldownAnnouncementRef.value.textContent =
        "Reset link sent. You can send another in 60 seconds.";
    }
    startCooldown();
  }
};
</script>
