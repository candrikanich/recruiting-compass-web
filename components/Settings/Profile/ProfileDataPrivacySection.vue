<template>
  <section class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
    <h2 class="text-lg font-semibold text-slate-900 mb-4">
      Data &amp; Privacy
    </h2>

    <!-- Export data -->
    <div class="space-y-4">
      <div>
        <h3 class="text-base font-semibold text-slate-900 mb-1">
          Export Your Data
        </h3>
        <p class="text-sm text-slate-600">
          Download a copy of your account data as a ZIP file, including your
          profile, schools, coaches, interactions, and notes. Exports are
          limited to once per day, and the download link expires after 7 days.
        </p>
      </div>

      <UButton
        v-if="!exportDownloadUrl"
        data-testid="export-data-button"
        :disabled="exportLoading"
        variant="outline"
        color="neutral"
        @click="handleExport"
      >
        {{ exportLoading ? "Preparing export…" : "Export My Data" }}
      </UButton>

      <div v-else class="space-y-2">
        <UAlert color="success">
          <template #description>
            <p class="text-sm">
              Your export is ready. Your download should begin automatically.
            </p>
          </template>
        </UAlert>
        <UButton
          data-testid="download-export-button"
          variant="outline"
          color="neutral"
          @click="downloadExport"
        >
          Download Again
        </UButton>
      </div>

      <p v-if="exportError" class="text-sm text-red-600">{{ exportError }}</p>
    </div>

    <div class="border-t border-slate-200 my-6" />

    <h3 class="text-base font-semibold text-red-700 mb-4">Delete Account</h3>

    <!-- Pending deletion state -->
    <div v-if="isDeletionPending" class="space-y-4">
      <UAlert color="warning">
        <template #description>
          <p class="text-sm font-medium">
            Your account is scheduled for deletion on
            <strong>{{ deletionDate }}</strong
            >.
          </p>
          <p class="text-sm mt-1">
            All your data will be permanently removed on that date. You can
            cancel this request before then.
          </p>
        </template>
      </UAlert>
      <UButton
        data-testid="cancel-deletion-button"
        :disabled="loading"
        variant="outline"
        color="neutral"
        @click="cancelDeletion"
      >
        {{ loading ? "Cancelling…" : "Cancel Deletion Request" }}
      </UButton>
      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    </div>

    <!-- Confirmation step -->
    <div v-else-if="confirmStep" class="space-y-4">
      <UAlert color="error">
        <template #description>
          <p class="text-sm font-semibold">
            This action cannot be easily undone.
          </p>
          <ul class="text-sm list-disc list-inside space-y-1 mt-2">
            <li>
              All your schools, coaches, interactions, and notes will be deleted
            </li>
            <li>You will be removed from any shared family units</li>
            <li>Your account will be permanently deleted after 30 days</li>
            <li>You may cancel within the 30-day window</li>
          </ul>
        </template>
      </UAlert>
      <div class="flex gap-3">
        <UButton
          data-testid="confirm-deletion-button"
          :disabled="loading"
          color="error"
          @click="requestDeletion"
        >
          {{ loading ? "Requesting…" : "Yes, delete my account" }}
        </UButton>
        <UButton
          data-testid="cancel-confirm-button"
          :disabled="loading"
          variant="ghost"
          color="neutral"
          @click="
            () => {
              confirmStep = false;
            }
          "
        >
          Cancel
        </UButton>
      </div>
      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    </div>

    <!-- Initial state -->
    <div v-else class="space-y-4">
      <p class="text-sm text-slate-600">
        You can request deletion of your account and all associated data. Your
        account will be permanently deleted 30 days after your request, giving
        you time to change your mind.
      </p>
      <UButton
        data-testid="request-deletion-button"
        color="error"
        variant="outline"
        @click="
          () => {
            confirmStep = true;
          }
        "
      >
        Request Account Deletion
      </UButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useUserExport } from "~/composables/useUserExport";

const { $fetchAuth } = useAuthFetch();

const {
  initiateExport,
  downloadExport,
  isLoading: exportLoading,
  error: exportError,
  downloadUrl: exportDownloadUrl,
} = useUserExport();

async function handleExport() {
  await initiateExport();
  if (exportDownloadUrl.value) {
    downloadExport();
  }
}

const confirmStep = ref(false);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const deletionRequestedAt = ref<string | null>(null);

const isDeletionPending = computed(() => !!deletionRequestedAt.value);

const deletionDate = computed(() => {
  if (!deletionRequestedAt.value) return "";
  const d = new Date(deletionRequestedAt.value);
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

onMounted(async () => {
  try {
    const data = await $fetchAuth<{ deletion_requested_at: string | null }>(
      "/api/account/deletion-status",
    );
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
    errorMessage.value =
      "Failed to request account deletion. Please try again.";
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
