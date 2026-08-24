<template>
  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <h2 class="mb-2 text-lg font-semibold text-slate-900">Email Address</h2>

    <UAlert v-if="emailChangePending" color="info" class="mb-4">
      <template #description>
        A verification email has been sent to your new address. Check your inbox
        to confirm the change.
      </template>
    </UAlert>

    <p class="mb-4 text-sm text-slate-600">
      <span class="font-medium text-slate-800">Current:</span>
      {{ store.user?.email }}
    </p>

    <div v-if="!showForm">
      <UButton
        variant="outline"
        color="neutral"
        size="sm"
        @click="
          () => {
            showForm = true;
          }
        "
      >
        Change Email
      </UButton>
    </div>

    <form v-else class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label
          class="mb-1 block text-sm font-medium text-slate-700"
          for="new-email"
        >
          New Email Address
        </label>
        <UInput
          id="new-email"
          v-model="newEmail"
          type="email"
          autocomplete="email"
          placeholder="new@example.com"
          :disabled="loading"
        />
      </div>
      <div>
        <label
          class="mb-1 block text-sm font-medium text-slate-700"
          for="current-pass-email"
        >
          Current Password (to confirm)
        </label>
        <UInput
          id="current-pass-email"
          v-model="currentPassword"
          type="password"
          autocomplete="current-password"
          :disabled="loading"
        />
        <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
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
