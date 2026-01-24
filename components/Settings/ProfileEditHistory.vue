<template>
  <div>
    <!-- Trigger Button -->
    <button
      @click="openModal"
      class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
    >
      <HistoryIcon class="h-4 w-4" />
      View Edit History
      <span v-if="!loading && history.length > 0" class="text-gray-500">
        ({{ history.length }})
      </span>
    </button>

    <!-- Modal -->
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6"
      >
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-900">Profile Edit History</h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600"
          >
            <XIcon class="h-6 w-6" />
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8 text-red-600">
          {{ error }}
        </div>

        <!-- Empty State -->
        <div v-else-if="history.length === 0" class="text-center py-8 text-gray-500">
          No edit history available
        </div>

        <!-- Timeline -->
        <div v-else class="space-y-6">
          <div
            v-for="(entry, index) in history"
            :key="entry.timestamp"
            class="relative"
          >
            <!-- Timeline dot and line -->
            <div class="absolute left-0 top-0 bottom-0 flex flex-col items-center">
              <div
                class="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow"
              ></div>
              <div
                v-if="index < history.length - 1"
                class="flex-1 w-0.5 bg-gray-200 mt-1"
              ></div>
            </div>

            <!-- Entry content -->
            <div class="ml-8 pb-6">
              <!-- Header with timestamp and badge -->
              <div class="flex items-center gap-2 mb-2">
                <time class="text-sm font-medium text-gray-900">
                  {{ formatTimestamp(entry.timestamp) }}
                </time>
                <span
                  v-if="index === 0"
                  class="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded"
                >
                  Most Recent
                </span>
              </div>

              <!-- Changed fields -->
              <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                <div
                  v-for="change in entry.changes"
                  :key="change.field"
                  class="grid grid-cols-2 gap-4 text-sm"
                >
                  <div>
                    <p class="font-medium text-gray-700 mb-1">
                      {{ change.fieldLabel }}
                    </p>
                    <div class="bg-white rounded p-2 border border-gray-200">
                      <span class="text-gray-500">Before:</span>
                      <span class="ml-2 text-gray-900">
                        {{ formatValue(change.old_value) }}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p class="font-medium text-gray-700 mb-1">&nbsp;</p>
                    <div class="bg-white rounded p-2 border border-green-200">
                      <span class="text-green-600">After:</span>
                      <span class="ml-2 text-gray-900 font-medium">
                        {{ formatValue(change.new_value) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { HistoryIcon, XIcon } from "@heroicons/vue/24/outline";
import { useProfileEditHistory } from "~/composables/useProfileEditHistory";

const { history, loading, error, fetchHistory } = useProfileEditHistory();
const isOpen = ref(false);

const openModal = async () => {
  isOpen.value = true;
  await fetchHistory();
};

const closeModal = () => {
  isOpen.value = false;
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "(empty)";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};
</script>
