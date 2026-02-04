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
  <div class="flex flex-col min-h-screen bg-white px-4 py-8">
    <div class="max-w-2xl mx-auto w-full space-y-6">
      <!-- Header -->
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Invite a Parent</h2>
        <p class="text-slate-600 mt-2">
          Share your recruiting journey with a parent or guardian
        </p>
      </div>

      <!-- Success State -->
      <div v-if="inviteSent" class="space-y-6">
        <div
          class="p-6 bg-green-50 border border-green-200 rounded-lg text-center"
        >
          <svg
            class="w-12 h-12 text-green-600 mx-auto mb-4"
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
          <h3 class="text-lg font-semibold text-green-900 mb-2">
            Invite sent!
          </h3>
          <p class="text-green-700">
            We've sent an invite to
            <span class="font-semibold">{{ email }}</span>
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <button
            type="button"
            class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            @click="handleInviteAnother"
          >
            Invite Another
          </button>
          <button
            type="button"
            class="w-full px-4 py-3 text-blue-600 border border-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
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
          <label class="block text-sm font-medium text-slate-900 mb-2">
            Parent or Guardian Email <span class="text-red-500">*</span>
          </label>
          <input
            v-model="email"
            type="email"
            placeholder="parent@example.com"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p class="text-sm text-slate-500 mt-2">
            They'll receive an email with a link to download the app and view
            your profile
          </p>
        </div>

        <!-- Error -->
        <div
          v-if="validationError"
          class="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p class="text-red-700 text-sm">{{ validationError }}</p>
        </div>

        <!-- Server Error -->
        <div
          v-if="error"
          class="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p class="text-red-700 text-sm">{{ error }}</p>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            @click="handleContinue"
          >
            Skip for Now
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
