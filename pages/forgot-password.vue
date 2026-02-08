<template>
  <AuthPageLayout :back-link="{ to: '/login', text: 'Back to Login' }">
    <!-- Header -->
    <div class="text-center mb-8">
      <AuthStatusIcon
        :status="emailSent ? 'success' : 'default'"
        icon="email"
        :ariaLabel="emailSent ? 'Reset email sent' : 'Password reset form'"
      />

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
    <AuthStatusMessage v-if="emailSent" variant="success" class="mb-8">
      <p class="text-sm font-medium">
        We've sent a password reset link to
        <span class="font-semibold">{{ submittedEmail }}</span>
      </p>
      <p class="text-sm mt-2">
        Click the link in the email to reset your password. The link will expire
        in 24 hours.
      </p>
    </AuthStatusMessage>

    <!-- Form -->
    <form v-if="!emailSent" @submit.prevent="handleSubmit" class="space-y-6">
      <div>
        <LoginInputField
          id="email"
          label="Email"
          type="email"
          placeholder="your.email@example.com"
          autocomplete="email"
          :model-value="email"
          :error="fieldErrors.email"
          :disabled="loading || validating"
          :icon="EnvelopeIcon"
          :required="true"
          @update:model-value="email = $event"
          @blur="validateEmail"
        />
        <p id="email-help" class="mt-1 text-xs text-slate-600">
          Enter the email address associated with your account
        </p>
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
        ref="cooldownAnnouncement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        class="sr-only"
      />

      <button
        @click="handleResend"
        :disabled="passwordReset.loading.value || cooldown.isActive.value"
        :aria-busy="passwordReset.loading.value"
        :aria-label="
          passwordReset.loading.value
            ? 'Sending reset link, please wait'
            : cooldown.isActive.value
              ? `Resend available in ${cooldown.cooldown.value} seconds`
              : 'Resend reset link'
        "
        class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <span v-if="passwordReset.loading.value">Sending...</span>
        <span v-else-if="cooldown.isActive.value">
          {{ cooldown.buttonLabel.value }}
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
        Check your spam or promotions folder if you don't see the reset email.
        The link will expire after 24 hours.
      </p>
    </section>
  </AuthPageLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });

import { ref, computed } from "vue";
import { EnvelopeIcon } from "@heroicons/vue/24/outline";
import FormErrorSummary from "~/components/Validation/FormErrorSummary.vue";
import LoginInputField from "~/components/Auth/LoginInputField.vue";
import { usePasswordReset } from "~/composables/usePasswordReset";
import { useFormValidation } from "~/composables/useFormValidation";
import { useResendCooldown } from "~/composables/useResendCooldown";
import { forgotPasswordSchema } from "~/utils/validation/schemas";
import { z } from "zod";

const EMAIL_SCHEMA = z.object({ email: forgotPasswordSchema.shape.email });

const email = ref("");
const emailSent = ref(false);
const submittedEmail = ref("");

const { loading, validating } = useLoadingStates();
const passwordReset = usePasswordReset();
const cooldown = useResendCooldown(60);
const { errors, fieldErrors, validate, validateField, clearErrors, hasErrors } =
  useFormValidation();

// Assign the cooldown announcement ref
const cooldownAnnouncement = cooldown.announcementRef;

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
      cooldown.startCooldown();
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
    cooldown.announce("Reset link sent. You can send another in 60 seconds.");
    cooldown.startCooldown();
  }
};
</script>
