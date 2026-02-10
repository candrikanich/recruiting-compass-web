<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-slate-900">Status History</h3>
      <div
        v-if="loading"
        class="flex items-center gap-2"
        role="status"
        aria-live="polite"
      >
        <div
          class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"
          aria-hidden="true"
        ></div>
        <span class="text-sm text-slate-400">Loading status history...</span>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!loading && history.length === 0"
      class="text-center py-8 text-slate-500"
    >
      <p class="text-sm">No status changes yet</p>
    </div>

    <!-- History List -->
    <div v-else class="space-y-3">
      <div
        v-for="entry in history"
        :key="entry.id"
        class="flex items-start gap-4 pb-3 border-b border-slate-100 last:border-b-0"
      >
        <!-- Status Transition -->
        <div class="flex items-center gap-2 min-w-fit">
          <span
            v-if="entry.previous_status"
            class="px-2 py-1 text-xs font-medium rounded-full"
            :class="getStatusColor(entry.previous_status)"
          >
            {{ formatStatus(entry.previous_status) }}
          </span>
          <span v-else class="text-xs text-slate-400">Initial</span>
          <ArrowRightIcon class="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span
            class="px-2 py-1 text-xs font-medium rounded-full"
            :class="getStatusColor(entry.new_status)"
          >
            {{ formatStatus(entry.new_status) }}
          </span>
        </div>

        <!-- Details -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-slate-600">
              {{ formatUserName(entry.changed_by) }}
            </p>
            <p class="text-xs text-slate-400 flex-shrink-0">
              {{ formatDate(entry.changed_at) }}
            </p>
          </div>
          <p v-if="entry.notes" class="text-sm text-slate-500 mt-1">
            {{ entry.notes }}
          </p>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-if="error"
      class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
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
import { ArrowRightIcon } from "@heroicons/vue/24/outline";

interface Props {
  schoolId: string;
}

const props = defineProps<Props>();

const schoolStore = useSchoolStore();
const userStore = useUserStore();

const history = ref<SchoolStatusHistory[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    interested: "bg-blue-100 text-blue-700",
    contacted: "bg-slate-100 text-slate-700",
    camp_invite: "bg-purple-100 text-purple-700",
    recruited: "bg-green-100 text-green-700",
    official_visit_invited: "bg-amber-100 text-amber-700",
    official_visit_scheduled: "bg-orange-100 text-orange-700",
    offer_received: "bg-red-100 text-red-700",
    committed: "bg-green-800 text-white",
    not_pursuing: "bg-gray-300 text-gray-700",
  };
  return colors[status] || "bg-slate-100 text-slate-700";
};

const formatStatus = (status: string): string => {
  const labels: Record<string, string> = {
    interested: "Interested",
    contacted: "Contacted",
    camp_invite: "Camp Invite",
    recruited: "Recruited",
    official_visit_invited: "OV Invited",
    official_visit_scheduled: "OV Scheduled",
    offer_received: "Offer Received",
    committed: "Committed",
    not_pursuing: "Not Pursuing",
  };
  return labels[status] || status;
};

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
    console.error("Error fetching status history:", err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchHistory();
});
</script>
