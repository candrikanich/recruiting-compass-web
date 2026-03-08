<template>
  <section class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
    <h2 class="text-lg font-semibold text-slate-900 mb-4">Password</h2>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1" for="current-password">
          Current Password
        </label>
        <UInput id="current-password" v-model="current" type="password" :disabled="loading" />
        <p v-if="error" class="text-sm text-red-600 mt-1">{{ error }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1" for="new-password">
          New Password
        </label>
        <UInput id="new-password" v-model="newPass" type="password" :disabled="loading" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1" for="confirm-password">
          Confirm New Password
        </label>
        <UInput id="confirm-password" v-model="confirm" type="password" :disabled="loading" />
        <p v-if="mismatchError" class="text-sm text-red-600 mt-1">Passwords do not match.</p>
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

const { changePassword, passwordLoading: loading, passwordError: error, passwordSaved: saved } = useUserProfile();

const current = ref("");
const newPass = ref("");
const confirm = ref("");

const mismatchError = computed(() => newPass.value && confirm.value && newPass.value !== confirm.value);

async function handleSubmit() {
  if (mismatchError.value) return;
  const ok = await changePassword(current.value, newPass.value);
  if (ok) {
    current.value = "";
    newPass.value = "";
    confirm.value = "";
  }
}
</script>
