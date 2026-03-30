<template>
  <section class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
    <h2 class="text-lg font-semibold text-slate-900 mb-2">Email Address</h2>

    <UAlert v-if="emailChangePending" color="info" class="mb-4">
      <template #description>
        A verification email has been sent to your new address. Check your inbox
        to confirm the change.
      </template>
    </UAlert>

    <p class="text-sm text-slate-600 mb-4">
      <span class="font-medium text-slate-800">Current:</span>
      {{ store.user?.email }}
    </p>

    <div v-if="!showForm">
      <UButton
        variant="outline"
        color="neutral"
        size="sm"
        @click="showForm = true"
      >
        Change Email
      </UButton>
    </div>

    <form v-else class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label
          class="block text-sm font-medium text-slate-700 mb-1"
          for="new-email"
        >
          New Email Address
        </label>
        <UInput
          id="new-email"
          v-model="newEmail"
          type="email"
          placeholder="new@example.com"
          :disabled="loading"
        />
      </div>
      <div>
        <label
          class="block text-sm font-medium text-slate-700 mb-1"
          for="current-pass-email"
        >
          Current Password (to confirm)
        </label>
        <UInput
          id="current-pass-email"
          v-model="currentPassword"
          type="password"
          :disabled="loading"
        />
        <p v-if="error" class="text-sm text-red-600 mt-1">{{ error }}</p>
      </div>
      <div class="flex items-center gap-3">
        <UButton type="submit" :loading="loading">Update Email</UButton>
        <UButton type="button" variant="ghost" color="neutral" @click="cancel"
          >Cancel</UButton
        >
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useUserStore } from "~/stores/user";
import { useUserProfile } from "~/composables/useUserProfile";

const store = useUserStore();
const {
  changeEmail,
  emailLoading: loading,
  emailError: error,
  emailChangePending,
} = useUserProfile();

const showForm = ref(false);
const newEmail = ref("");
const currentPassword = ref("");

async function handleSubmit() {
  const ok = await changeEmail(newEmail.value, currentPassword.value);
  if (ok) {
    showForm.value = false;
    newEmail.value = "";
    currentPassword.value = "";
  }
}

function cancel() {
  showForm.value = false;
  newEmail.value = "";
  currentPassword.value = "";
}
</script>
