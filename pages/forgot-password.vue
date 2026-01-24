<template>
  <div class="min-h-screen relative overflow-hidden bg-emerald-600">
    <!-- Multi-Sport Field Background -->
    <div class="absolute inset-0">
      <!-- Grass texture with gradient -->
      <div
        class="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700"
      ></div>

      <!-- Subtle overlay pattern -->
      <div
        class="absolute inset-0 opacity-5"
        :style="{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 20px,
            rgba(255, 255, 255, 0.3) 20px,
            rgba(255, 255, 255, 0.3) 22px
          )`,
        }"
      ></div>
    </div>

    <!-- Content -->
    <div
      class="relative z-10 min-h-screen flex items-center justify-center px-6 py-12"
    >
      <div class="w-full max-w-md">
        <!-- Back Link -->
        <div class="mb-6">
          <NuxtLink
            to="/login"
            class="text-white hover:text-white/80 transition-colors flex items-center gap-2"
          >
            <ArrowLeftIcon class="w-4 h-4" />
            Back to Login
          </NuxtLink>
        </div>

        <!-- Forgot Password Card -->
        <div
          class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <!-- Header -->
          <div class="text-center mb-8">
            <div
              class="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
              :class="{
                'bg-emerald-100': emailSent,
                'bg-amber-100': !emailSent,
              }"
            >
              <!-- Email icon -->
              <svg
                v-if="!emailSent"
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

              <!-- Check icon -->
              <svg
                v-else
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
            class="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
          >
            <p class="text-emerald-800 text-sm font-medium">
              We've sent a password reset link to
              <span class="font-semibold">{{ submittedEmail }}</span>
            </p>
            <p class="text-emerald-700 text-sm mt-2">
              Click the link in the email to reset your password. The link will
              expire in 24 hours.
            </p>
          </div>

          <!-- Form -->
          <form v-if="!emailSent" @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Email -->
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

            <!-- Submit -->
            <button
              data-testid="send-reset-link-button"
              type="submit"
              :disabled="!isFormValid || loading || validating"
              class="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 shadow-lg"
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
            <!-- Resend button -->
            <button
              @click="handleResend"
              :disabled="passwordReset.loading || resendCooldown > 0"
              class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              <span v-if="passwordReset.loading">Sending...</span>
              <span v-else-if="resendCooldown > 0">
                Resend in {{ resendCooldown }}s
              </span>
              <span v-else>Resend Reset Link</span>
            </button>

            <!-- Back to login -->
            <NuxtLink
              to="/login"
              class="block w-full py-3 px-4 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-colors text-center"
            >
              Back to Login
            </NuxtLink>
          </div>

          <!-- Help text -->
          <div class="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p class="text-slate-600 text-xs leading-relaxed">
              <span class="font-semibold text-slate-700">Tip:</span>
              Check your spam or promotions folder if you don't see the reset
              email. The link will expire after 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  ArrowLeftIcon,
  EnvelopeIcon,
} from "@heroicons/vue/24/outline";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import FieldError from "~/components/DesignSystem/FieldError.vue";
import { usePasswordReset } from "~/composables/usePasswordReset";
import { useFormValidation } from "~/composables/useFormValidation";
import { forgotPasswordSchema } from "~/utils/validation/schemas";
import { z } from "zod";

// Static schema - defined once outside component scope
const EMAIL_SCHEMA = z.object({ email: forgotPasswordSchema.shape.email });

const email = ref("");
const loading = ref(false);
const validating = ref(false);
const emailSent = ref(false);
const submittedEmail = ref("");
const resendCooldown = ref(0);

const passwordReset = usePasswordReset();
const {
  errors,
  fieldErrors,
  validate,
  validateField,
  clearErrors,
  hasErrors,
} = useFormValidation();

// Computed property for form validity
const isFormValid = computed(
  () => !hasErrors.value && email.value.trim().length > 0,
);

const validateEmail = async () => {
  validating.value = true;
  try {
    await validateField("email", email.value, EMAIL_SCHEMA.shape.email);
  } finally {
    validating.value = false;
  }
};

const handleSubmit = async () => {
  // Validate entire form before submission
  const validated = await validate(
    { email: email.value },
    forgotPasswordSchema,
  );

  if (!validated) {
    return;
  }

  loading.value = true;

  try {
    const success = await passwordReset.requestPasswordReset(
      validated.email,
    );

    if (success) {
      emailSent.value = true;
      submittedEmail.value = validated.email;
      // Clear error state after successful submission
      passwordReset.clearError();
    }
  } finally {
    loading.value = false;
  }
};

const handleResend = async () => {
  const success = await passwordReset.requestPasswordReset(submittedEmail.value);

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
</script>
