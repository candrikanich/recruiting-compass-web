<template>
  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <h2 class="mb-4 text-lg font-semibold text-slate-900">Password</h2>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label
          class="mb-1 block text-sm font-medium text-slate-700"
          for="current-password"
        >
          Current Password
        </label>
        <UInput
          id="current-password"
          v-model="current"
          type="password"
          autocomplete="current-password"
          :disabled="loading"
        />
        <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
      </div>
      <div>
        <label
          class="mb-1 block text-sm font-medium text-slate-700"
          for="new-password"
        >
          New Password
        </label>
        <UInput
          id="new-password"
          v-model="newPass"
          type="password"
          autocomplete="new-password"
          :disabled="loading"
        />
      </div>
      <div>
        <label
          class="mb-1 block text-sm font-medium text-slate-700"
          for="confirm-password"
        >
          Confirm New Password
        </label>
        <UInput
          id="confirm-password"
          v-model="confirm"
          type="password"
          autocomplete="new-password"
          :disabled="loading"
        />
        <p v-if="mismatchError" class="mt-1 text-sm text-red-600">
          Passwords do not match.
        </p>
      </div>
      <div class="flex items-center gap-3 pt-2">
        <UButton type="submit" :loading="loading">Change Password</UButton>
        <p v-if="saved" class="text-sm text-emerald-600">Password updated!</p>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useUserProfile } from "~/composables/useUserProfile";

const {
  changePassword,
  passwordLoading: loading,
  passwordError: error,
  passwordSaved: saved,
} = useUserProfile();

const current = ref("");
const newPass = ref("");
const confirm = ref("");

const mismatchError = computed(
  () => newPass.value && confirm.value && newPass.value !== confirm.value,
);

async function handleSubmit() {
  if (mismatchError.value) return;
  if (!current.value || !newPass.value || !confirm.value) return;
  const ok = await changePassword(current.value, newPass.value);
  if (ok) {
    current.value = "";
    newPass.value = "";
    confirm.value = "";
  }
}
</script>
