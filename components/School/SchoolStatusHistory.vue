<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-slate-900">Status History</h3>
      <div
        v-if="loading"
        class="flex items-center gap-2"
        role="status"
        aria-live="polite"
      >
        <div
          class="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"
          aria-hidden="true"
        ></div>
        <span class="text-sm text-slate-400">Loading status history...</span>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!loading && history.length === 0"
      class="py-8 text-center text-slate-500"
    >
      <p class="text-sm">No status changes yet</p>
    </div>

    <!-- History List -->
    <div v-else class="space-y-3">
      <div
        v-for="entry in history"
        :key="entry.id"
        class="space-y-1.5 border-b border-slate-100 pb-3 last:border-b-0"
      >
        <!-- Status Transition -->
        <div class="flex flex-wrap items-center gap-2">
          <span
            v-if="entry.previous_status"
            class="rounded-full px-2 py-1 text-xs font-medium"
            :class="getStatusColor(entry.previous_status)"
          >
            {{ formatStatus(entry.previous_status) }}
          </span>
          <span v-else class="text-xs text-slate-400">Initial</span>
          <UIcon
            name="i-heroicons-arrow-right"
            class="h-4 w-4 shrink-0 text-slate-400"
          />
          <span
            class="rounded-full px-2 py-1 text-xs font-medium"
            :class="getStatusColor(entry.new_status)"
          >
            {{ formatStatus(entry.new_status) }}
          </span>
        </div>

        <!-- Details -->
        <div class="flex flex-wrap items-baseline justify-between gap-x-2">
          <p class="text-sm text-slate-600">
            {{ formatUserName(entry.changed_by) }}
          </p>
          <p class="shrink-0 text-xs text-slate-400">
            {{ formatDate(entry.changed_at) }}
          </p>
          <p v-if="entry.notes" class="mt-1 w-full text-sm text-slate-500">
            {{ entry.notes }}
          </p>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-if="error"
      class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { SchoolStatusHistory } from "~/types/models";
import { useSchoolStore } from "~/stores/schools";
import { useUserStore } from "~/stores/user";
import { createClientLogger } from "~/utils/logger";
import {
  getSchoolStatusLabel,
  getSchoolStatusBadgeClass,
} from "~/utils/schoolStatusOptions";

const logger = createClientLogger("SchoolStatusHistory");
interface Props {
  schoolId: string;
}

const props = defineProps<Props>();

const schoolStore = useSchoolStore();
const userStore = useUserStore();

const history = ref<SchoolStatusHistory[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const getStatusColor = (status: string): string =>
  getSchoolStatusBadgeClass(status);

const formatStatus = (status: string): string => getSchoolStatusLabel(status);

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

const formatUserName = (userId: string): string => {
  if (userStore.user?.id === userId) {
    return `You${userStore.user?.full_name ? ` (${userStore.user.full_name})` : ""}`;
  }
  return `User ${userId.slice(0, 8)}...`;
};

const fetchHistory = async () => {
  loading.value = true;
  error.value = null;

  try {
    const result = await schoolStore.getStatusHistory(props.schoolId);
    history.value = result;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load status history";
    error.value = message;
    logger.error("Error fetching status history", err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchHistory();
});
</script>
