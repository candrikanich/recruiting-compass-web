<script setup lang="ts">
import { ref } from "vue";
import { useFamilyInvite } from "~/composables/useFamilyInvite";

const emit = defineEmits<{
  "invite-sent": [];
  continue: [];
}>();

const { sendParentInvite, loading, error } = useFamilyInvite();

const email = ref("");
const inviteSent = ref(false);
const validationError = ref<string | null>(null);

const isValidEmail = (address: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(address);
};

const handleSendInvite = async () => {
  validationError.value = null;

  if (!email.value) {
    validationError.value = "Email address is required";
    return;
  }

  if (!isValidEmail(email.value)) {
    validationError.value = "Please enter a valid email address";
    return;
  }

  try {
    await sendParentInvite(email.value);
    inviteSent.value = true;
  } catch (err) {
    validationError.value =
      error.value || "Failed to send invite. Please try again.";
  }
};

const handleInviteAnother = () => {
  email.value = "";
  inviteSent.value = false;
};

const handleContinue = () => {
  emit("continue");
};
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white px-4 py-8">
    <div class="mx-auto w-full max-w-2xl space-y-6">
      <!-- Header -->
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Invite a Parent</h2>
        <p class="mt-2 text-slate-600">
          Share your recruiting journey with a parent or guardian
        </p>
      </div>

      <!-- Success State -->
      <div v-if="inviteSent" class="space-y-6">
        <div
          class="rounded-lg border border-brand-emerald-200 bg-brand-emerald-50 p-6 text-center"
        >
          <svg
            class="mx-auto mb-4 h-12 w-12 text-brand-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <h3 class="mb-2 text-lg font-semibold text-brand-emerald-900">
            Invite sent!
          </h3>
          <p class="text-brand-emerald-700">
            We've sent an invite to
            <span class="font-semibold">{{ email }}</span>
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <button
            type="button"
            class="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            @click="handleInviteAnother"
          >
            Invite Another
          </button>
          <button
            type="button"
            class="w-full rounded-lg border border-blue-600 px-4 py-3 font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            @click="handleContinue"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>

      <!-- Form State -->
      <form v-else @submit.prevent="handleSendInvite" class="space-y-6">
        <!-- Email Input -->
        <div>
          <label
            for="family-invite-email"
            class="mb-2 block text-sm font-medium text-slate-900"
          >
            Parent or Guardian Email <span class="text-red-500">*</span>
          </label>
          <input
            id="family-invite-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="parent@example.com"
            aria-describedby="family-invite-email-hint"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 focus-visible:ring-2 focus-visible:ring-blue-500"
            required
          />
          <p id="family-invite-email-hint" class="mt-2 text-sm text-slate-500">
            They'll receive an email with a link to download the app and view
            your profile
          </p>
        </div>

        <!-- Error -->
        <div
          v-if="validationError"
          class="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p class="text-sm text-red-700">{{ validationError }}</p>
        </div>

        <!-- Server Error -->
        <div
          v-if="error"
          class="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-50"
            @click="handleContinue"
          >
            Skip for Now
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="loading"
            @click="handleSendInvite"
          >
            {{ loading ? "Sending..." : "Send Invite" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
