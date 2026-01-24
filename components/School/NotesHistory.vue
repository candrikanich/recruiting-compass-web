<template>
  <div>
    <!-- View History Button -->
    <button
      @click="isOpen = true"
      :disabled="!hasHistory || loading"
      class="mt-2 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition disabled:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
    >
      {{ hasHistory ? `View History (${history.length})` : "No history" }}
    </button>

    <!-- History Modal -->
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="isOpen = false"
    >
      <div
        class="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 flex flex-col"
      >
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-900">Notes Edit History</h3>
          <button
            @click="isOpen = false"
            class="text-slate-400 hover:text-slate-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <!-- Loading State -->
          <div v-if="loading" class="text-center py-8">
            <div class="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p class="text-slate-600 text-sm">Loading history...</p>
          </div>

          <!-- Error State -->
          <div
            v-else-if="error"
            class="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm"
          >
            {{ error }}
          </div>

          <!-- Empty State -->
          <div v-else-if="history.length === 0" class="text-center py-8">
            <p class="text-slate-500 text-sm">No edit history available</p>
          </div>

          <!-- Timeline -->
          <div v-else class="space-y-4">
            <div
              v-for="(entry, index) in formattedHistory"
              :key="entry.id"
              class="border-l-2 border-blue-300 pl-4 pb-4"
            >
              <!-- Entry Header -->
              <div class="flex items-start justify-between mb-2">
                <div>
                  <p class="text-sm font-medium text-slate-900">
                    {{ entry.formattedTime }}
                  </p>
                  <p class="text-xs text-slate-600 mt-0.5">
                    Edited by {{ entry.editedByName || entry.editedBy }}
                  </p>
                </div>
                <span
                  v-if="index === 0"
                  class="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                >
                  Current
                </span>
              </div>

              <!-- Expandable Previous Content -->
              <div v-if="index > 0 || entry.previousContent" class="mt-2">
                <button
                  @click="toggleExpanded(entry.id)"
                  class="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <svg
                    :class="[
                      'w-4 h-4 transition-transform',
                      expandedIds.includes(entry.id) ? 'rotate-90' : '',
                    ]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                  {{ expandedIds.includes(entry.id) ? "Hide" : "Show" }} previous version
                </button>

                <!-- Expanded Content -->
                <div
                  v-if="expandedIds.includes(entry.id) && entry.previousContent"
                  class="mt-2 p-3 bg-slate-50 rounded border border-slate-200 max-h-40 overflow-y-auto"
                >
                  <p class="text-xs font-medium text-slate-700 mb-1">Previous content:</p>
                  <p class="text-sm text-slate-600 whitespace-pre-wrap break-words">
                    {{ entry.previousContent }}
                  </p>
                </div>
              </div>

              <!-- Current Content Preview -->
              <div
                v-if="entry.currentContent && index === 0"
                class="mt-2 p-3 bg-blue-50 rounded border border-blue-200 max-h-40 overflow-y-auto"
              >
                <p class="text-xs font-medium text-blue-700 mb-1">Current content:</p>
                <p class="text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {{ truncateText(entry.currentContent, 200) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b">
          <button
            @click="isOpen = false"
            class="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded hover:from-blue-600 hover:to-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useNotesHistory } from "~/composables/useNotesHistory";

const props = defineProps<{
  schoolId: string;
}>();

const { history, formattedHistory, loading, error, fetchNoteHistory } =
  useNotesHistory();

const isOpen = ref(false);
const expandedIds = ref<string[]>([]);

const hasHistory = computed(() => history.value.length > 0);

const toggleExpanded = (entryId: string) => {
  const index = expandedIds.value.indexOf(entryId);
  if (index > -1) {
    expandedIds.value.splice(index, 1);
  } else {
    expandedIds.value.push(entryId);
  }
};

const truncateText = (text: string, length: number): string => {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
};

onMounted(async () => {
  // Fetch history when component mounts (but don't open modal)
  await fetchNoteHistory(props.schoolId);
});

// Watch for modal open and fetch fresh data
const handleModalOpen = async () => {
  if (!loading.value && isOpen.value) {
    await fetchNoteHistory(props.schoolId);
  }
};

// Fetch history when modal opens
const originalIsOpen = isOpen;
isOpen.value = false;
</script>
