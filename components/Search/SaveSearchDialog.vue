<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-50">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Save Search</h2>
            <button
              @click="closeDialog"
              class="text-gray-400 hover:text-gray-600"
            >
              <svg
                class="h-5 w-5"
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
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Search Name</label
              >
              <input
                v-model="formData.name"
                type="text"
                placeholder="e.g., D1 Schools in California"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Description (optional)</label
              >
              <textarea
                v-model="formData.description"
                placeholder="What is this search for?"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <!-- Search Info -->
            <div class="bg-gray-50 rounded-lg p-3 space-y-2">
              <p class="text-xs font-semibold text-gray-600 uppercase">
                Search Details
              </p>
              <div class="text-sm text-gray-700">
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
            <div class="flex gap-3 justify-end pt-4 border-t">
              <button
                type="button"
                @click="closeDialog"
                class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isSaving || !formData.name"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
              >
                <span v-if="isSaving" class="flex items-center gap-2">
                  <svg
                    class="animate-spin h-4 w-4"
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
import { ref, reactive } from "vue";
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

const closeDialog = () => {
  formData.name = "";
  formData.description = "";
  emit("close");
};

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
