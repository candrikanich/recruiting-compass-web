<template>
  <div>
    <!-- View History Button -->
    <button
      @click="isOpen = true"
      :disabled="!hasHistory || loading"
      class="mt-2 rounded-sm px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
    >
      {{ hasHistory ? `View History (${history.length})` : "No history" }}
    </button>

    <!-- History Modal -->
    <div
      v-if="isOpen"
      class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
      @click.self="isOpen = false"
    >
      <div
        class="flex max-h-96 w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between border-b border-slate-200 px-6 py-4"
        >
          <h3 class="text-lg font-semibold text-slate-900">
            Notes Edit History
          </h3>
          <button
            @click="isOpen = false"
            class="text-slate-400 hover:text-slate-600"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <!-- Loading State -->
          <div v-if="loading" class="py-8 text-center">
            <div
              class="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
            ></div>
            <p class="text-sm text-slate-600">Loading history...</p>
          </div>

          <!-- Error State -->
          <div
            v-else-if="error"
            class="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {{ error }}
          </div>

          <!-- Empty State -->
          <div v-else-if="history.length === 0" class="py-8 text-center">
            <p class="text-sm text-slate-500">No edit history available</p>
          </div>

          <!-- Timeline -->
          <div v-else class="space-y-4">
            <div
              v-for="(entry, index) in formattedHistory"
              :key="entry.id"
              class="border-l-2 border-blue-300 pb-4 pl-4"
            >
              <!-- Entry Header -->
              <div class="mb-2 flex items-start justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-900">
                    {{ entry.formattedTime }}
                  </p>
                  <p class="mt-0.5 text-xs text-slate-600">
                    Edited by {{ entry.editedByName || entry.editedBy }}
                  </p>
                </div>
                <span
                  v-if="index === 0"
                  class="inline-block rounded-sm bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
                >
                  Current
                </span>
              </div>

              <!-- Expandable Previous Content -->
              <div v-if="index > 0 || entry.previousContent" class="mt-2">
                <button
                  @click="toggleExpanded(entry.id)"
                  class="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <svg
                    :class="[
                      'h-4 w-4 transition-transform',
                      expandedIds.includes(entry.id) ? 'rotate-90' : '',
                    ]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  {{ expandedIds.includes(entry.id) ? "Hide" : "Show" }}
                  previous version
                </button>

                <!-- Expanded Content -->
                <div
                  v-if="expandedIds.includes(entry.id) && entry.previousContent"
                  class="mt-2 max-h-40 overflow-y-auto rounded-sm border border-slate-200 bg-slate-50 p-3"
                >
                  <p class="mb-1 text-xs font-medium text-slate-700">
                    Previous content:
                  </p>
                  <p
                    class="text-sm wrap-break-word whitespace-pre-wrap text-slate-600"
                  >
                    {{ entry.previousContent }}
                  </p>
                </div>
              </div>

              <!-- Current Content Preview -->
              <div
                v-if="entry.currentContent && index === 0"
                class="mt-2 max-h-40 overflow-y-auto rounded-sm border border-blue-200 bg-blue-50 p-3"
              >
                <p class="mb-1 text-xs font-medium text-blue-700">
                  Current content:
                </p>
                <p
                  class="text-sm wrap-break-word whitespace-pre-wrap text-slate-700"
                >
                  {{ truncateText(entry.currentContent, 200) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="rounded-b border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            @click="isOpen = false"
            class="w-full rounded-sm bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700"
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
import { useInteractionNotes } from "~/composables/useInteractionNotes";

const props = defineProps<{
  schoolId: string;
}>();

const {
  noteHistory: history,
  formattedNoteHistory: formattedHistory,
  noteHistoryLoading: loading,
  noteHistoryError: error,
  fetchNoteHistory,
} = useInteractionNotes();

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
