<template>
  <div class="relative">
    <div class="flex gap-2">
      <!-- Search Input -->
      <div class="relative flex-1">
        <input
          v-model="localQuery"
          type="text"
          placeholder="Search schools, coaches, interactions..."
          class="input-field pl-10"
          @input="handleInput"
          @keydown.enter="handleSearch"
          @focus="showSuggestions = true"
          @blur="handleBlur"
        />

        <!-- Search Icon -->
        <svg
          class="absolute top-3.5 left-3 h-5 w-5 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <!-- Suggestions Dropdown -->
        <div
          v-if="
            showSuggestions && localQuery.length >= 2 && suggestions.length > 0
          "
          class="absolute top-full right-0 left-0 z-10 mt-1 rounded-lg border border-slate-300 bg-white shadow-lg"
        >
          <ul class="py-2">
            <li
              v-for="suggestion in suggestions.slice(0, 8)"
              :key="suggestion"
              class="cursor-pointer px-4 py-2 text-slate-900 hover:bg-slate-100"
              @click="selectSuggestion(suggestion)"
            >
              <p class="text-sm">{{ suggestion }}</p>
            </li>
          </ul>
        </div>
      </div>

      <!-- Search Button -->
      <button
        @click="handleSearch"
        :disabled="isSearching || !localQuery.trim()"
        class="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span v-if="!isSearching">Search</span>
        <span v-else class="flex items-center gap-2">
          <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
          Searching...
        </span>
      </button>
    </div>

    <!-- Search Type Selector -->
    <div class="mt-3 flex flex-wrap gap-2">
      <span class="self-center text-xs font-medium text-gray-600"
        >Search in:</span
      >
      <div class="flex gap-2">
        <button
          v-for="type in [
            'all',
            'schools',
            'coaches',
            'interactions',
            'metrics',
          ]"
          :key="type"
          @click="$emit('update:searchType', type)"
          :class="[
            'rounded-sm px-3 py-1 text-xs font-medium transition',
            modelValue === type
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
          ]"
        >
          {{ getTypeLabel(type) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

interface Props {
  modelValue: string;
  searchType: string;
  isSearching: boolean;
}

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:searchType": [value: string];
  search: [query: string];
  suggestions: [];
}>();

const props = defineProps<Props>();

const localQuery = ref(props.modelValue);
const showSuggestions = ref(false);
const suggestions = ref<string[]>([]);
let debounceTimer: NodeJS.Timeout | null = null;

watch(
  () => props.modelValue,
  (newVal) => {
    localQuery.value = newVal;
  },
);

const handleBlur = () => {
  // Delay closing suggestions to allow click on suggestion items
  setTimeout(() => {
    showSuggestions.value = false;
  }, 200);
};

const handleInput = () => {
  // Cancel previous debounce
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Debounce the search and suggestions (300ms)
  debounceTimer = setTimeout(() => {
    emit("update:modelValue", localQuery.value);

    // Fetch suggestions if query is long enough
    if (localQuery.value.length >= 2) {
      fetchSuggestions();
    } else {
      suggestions.value = [];
    }
    debounceTimer = null;
  }, 300);
};

const handleSearch = () => {
  if (localQuery.value.trim()) {
    emit("search", localQuery.value);
    showSuggestions.value = false;
  }
};

const selectSuggestion = (suggestion: string) => {
  localQuery.value = suggestion;
  emit("update:modelValue", suggestion);
  emit("search", suggestion);
  showSuggestions.value = false;
};

const fetchSuggestions = () => {
  // Suggestions would be fetched from composable
  // This is a placeholder
  suggestions.value = [];
  emit("suggestions");
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
