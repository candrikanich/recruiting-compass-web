<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
        @keydown.escape="closeDialog"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-search-title"
          class="z-50 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        >
          <!-- Header -->
          <div class="mb-4 flex items-center justify-between">
            <h2
              id="save-search-title"
              class="text-lg font-semibold text-brand-slate-900"
            >
              Save Search
            </h2>
            <button
              @click="closeDialog"
              aria-label="Close save search dialog"
              class="text-brand-slate-400 hover:text-brand-slate-600"
            >
              <svg
                class="h-5 w-5"
                aria-hidden="true"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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

          <!-- Form -->
          <form @submit.prevent="handleSave" class="space-y-4">
            <!-- Name -->
            <div>
              <label
                for="save-search-name"
                class="mb-1 block text-sm font-medium text-brand-slate-700"
                >Search Name</label
              >
              <input
                id="save-search-name"
                v-model="formData.name"
                type="text"
                placeholder="e.g., D1 Schools in California"
                class="w-full rounded-lg border border-brand-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <!-- Description -->
            <div>
              <label
                for="save-search-description"
                class="mb-1 block text-sm font-medium text-brand-slate-700"
                >Description (optional)</label
              >
              <textarea
                id="save-search-description"
                v-model="formData.description"
                placeholder="What is this search for?"
                rows="3"
                class="w-full resize-none rounded-lg border border-brand-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Search Info -->
            <div class="space-y-2 rounded-lg bg-brand-slate-50 p-3">
              <p class="text-xs font-semibold text-brand-slate-600 uppercase">
                Search Details
              </p>
              <div class="text-sm text-brand-slate-700">
                <p><span class="font-medium">Query:</span> {{ searchQuery }}</p>
                <p>
                  <span class="font-medium">Type:</span>
                  {{ getTypeLabel(searchType) }}
                </p>
                <p v-if="resultsCount > -1">
                  <span class="font-medium">Results:</span> {{ resultsCount }}
                </p>
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                @click="closeDialog"
                class="rounded-lg border border-brand-slate-300 px-4 py-2 font-medium text-brand-slate-700 transition hover:bg-brand-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isSaving || !formData.name"
                class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span v-if="isSaving" class="flex items-center gap-2">
                  <svg
                    class="h-4 w-4 animate-spin"
                    aria-hidden="true"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </span>
                <span v-else>Save Search</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";
import { useSavedSearches } from "~/composables/useSavedSearches";
import type { SavedSearch } from "~/types/models";

interface Props {
  isOpen: boolean;
  searchQuery: string;
  searchType: SavedSearch["searchType"];
  filters: SavedSearch["filters"];
  resultsCount?: number;
}

const emit = defineEmits<{
  close: [];
  saved: [search: SavedSearch];
}>();

const props = withDefaults(defineProps<Props>(), {
  resultsCount: -1,
});

const { saveSearch, error: searchError } = useSavedSearches();

const isSaving = ref(false);
const formData = reactive({
  name: "",
  description: "",
});

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

const closeDialog = () => {
  formData.name = "";
  formData.description = "";
  deactivate();
  emit("close");
};

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      activate();
    } else {
      deactivate();
    }
  },
);

const handleSave = async () => {
  isSaving.value = true;

  const saved = await saveSearch(
    formData.name,
    props.searchQuery,
    props.searchType,
    props.filters,
    formData.description,
  );

  isSaving.value = false;

  if (saved) {
    emit("saved", saved);
    closeDialog();
  }
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    all: "All",
    schools: "Schools",
    coaches: "Coaches",
    interactions: "Interactions",
    metrics: "Metrics",
  };
  return labels[type] || type;
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
