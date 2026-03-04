<template>
  <div class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100">
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/settings"
          class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition mb-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">Account</h1>
        <p class="text-slate-600">Manage your account and data</p>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <!-- Account Info -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <h2 class="text-lg font-semibold text-slate-900 mb-4">Account Information</h2>
        <div class="space-y-2 text-sm text-slate-600">
          <p><span class="font-medium text-slate-800">Email:</span> {{ userStore.user?.email }}</p>
          <p><span class="font-medium text-slate-800">Role:</span> {{ userStore.user?.role }}</p>
        </div>
      </section>

      <!-- Delete Account -->
      <section class="bg-white rounded-xl border border-red-200 shadow-xs p-6">
        <h2 class="text-lg font-semibold text-red-700 mb-2">Delete Account</h2>

        <!-- Pending deletion state -->
        <div v-if="isDeletionPending" class="space-y-4">
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p class="text-sm font-medium text-amber-800">
              Your account is scheduled for deletion on
              <strong>{{ deletionDate }}</strong>.
            </p>
            <p class="text-sm text-amber-700 mt-1">
              All your data will be permanently removed on that date. You can cancel this request before then.
            </p>
          </div>
          <button
            data-testid="cancel-deletion-button"
            :disabled="loading"
            class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm disabled:opacity-50"
            @click="cancelDeletion"
          >
            {{ loading ? 'Cancelling…' : 'Cancel Deletion Request' }}
          </button>
          <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
        </div>

        <!-- Confirmation step -->
        <div v-else-if="confirmStep" class="space-y-4">
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <p class="text-sm font-semibold text-red-800">This action cannot be easily undone.</p>
            <ul class="text-sm text-red-700 list-disc list-inside space-y-1">
              <li>All your schools, coaches, interactions, and notes will be deleted</li>
              <li>You will be removed from any shared family units</li>
              <li>Your account will be permanently deleted after 30 days</li>
              <li>You may cancel within the 30-day window</li>
            </ul>
          </div>
          <div class="flex gap-3">
            <button
              data-testid="confirm-deletion-button"
              :disabled="loading"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50"
              @click="requestDeletion"
            >
              {{ loading ? 'Requesting…' : 'Yes, delete my account' }}
            </button>
            <button
              data-testid="cancel-confirm-button"
              :disabled="loading"
              class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm disabled:opacity-50"
              @click="confirmStep = false"
            >
              Cancel
            </button>
          </div>
          <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
        </div>

        <!-- Initial state -->
        <div v-else class="space-y-4">
          <p class="text-sm text-slate-600">
            You can request deletion of your account and all associated data. Your account will be
            permanently deleted 30 days after your request, giving you time to change your mind.
          </p>
          <button
            data-testid="request-deletion-button"
            class="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
            @click="confirmStep = true"
          >
            Request Account Deletion
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { useUserStore } from "~/stores/user";
import { useAuthFetch } from "~/composables/useAuthFetch";

definePageMeta({ middleware: "auth" });

const userStore = useUserStore();
const { $fetchAuth } = useAuthFetch();

const confirmStep = ref(false);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const deletionRequestedAt = ref<string | null>(null);

const isDeletionPending = computed(() => !!deletionRequestedAt.value);

const deletionDate = computed(() => {
  if (!deletionRequestedAt.value) return "";
  const d = new Date(deletionRequestedAt.value);
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
});

onMounted(async () => {
  // Load current deletion status from the user store or fetch it
  try {
    const data = await $fetchAuth<{ deletion_requested_at: string | null }>("/api/account/deletion-status");
    deletionRequestedAt.value = data.deletion_requested_at;
  } catch {
    // Non-blocking — if this fails, show the default state
  }
});

async function requestDeletion() {
  loading.value = true;
  errorMessage.value = null;
  try {
    await $fetchAuth("/api/account/request-deletion", { method: "POST" });
    deletionRequestedAt.value = new Date().toISOString();
    confirmStep.value = false;
  } catch {
    errorMessage.value = "Failed to request account deletion. Please try again.";
  } finally {
    loading.value = false;
  }
}

async function cancelDeletion() {
  loading.value = true;
  errorMessage.value = null;
  try {
    await $fetchAuth("/api/account/cancel-deletion", { method: "POST" });
    deletionRequestedAt.value = null;
  } catch {
    errorMessage.value = "Failed to cancel deletion. Please try again.";
  } finally {
    loading.value = false;
  }
}
</script>
