<template>
  <div class="relative">
    <!-- Search Input -->
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Type college name..."
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="showDropdown"
      aria-controls="autocomplete-listbox"
      :aria-activedescendant="
        selectedIndex >= 0 ? `autocomplete-option-${selectedIndex}` : undefined
      "
      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
      @input="handleInput"
      @keydown="handleKeydown"
      @blur="handleBlur"
      :disabled="disabled"
    />

    <!-- Dropdown Results -->
    <div
      v-if="showDropdown"
      id="autocomplete-listbox"
      role="listbox"
      class="absolute top-full left-0 right-0 mt-1 rounded-lg z-50 max-h-64 overflow-y-auto bg-white border border-slate-300 shadow-lg"
    >
      <!-- Loading State -->
      <div
        v-if="loading"
        class="px-4 py-3 text-center text-slate-600"
        role="status"
      >
        <div class="inline-block animate-spin">
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
        </div>
        <span class="ml-2">Searching...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="px-4 py-3 text-sm text-red-600 bg-red-50">
        {{ error }}
      </div>

      <!-- No Results -->
      <div
        v-else-if="results.length === 0 && searchQuery.length >= 3"
        class="px-4 py-3 text-sm text-slate-600"
      >
        No colleges found. Try a different search or switch to manual entry.
      </div>

      <!-- Results List -->
      <div v-else>
        <button
          v-for="(college, index) in results"
          :key="college.id"
          :id="`autocomplete-option-${index}`"
          type="button"
          role="option"
          :aria-selected="index === selectedIndex"
          :class="[
            'w-full text-left px-4 py-3 transition cursor-pointer last:border-b-0 border-b border-slate-300',
            index === selectedIndex ? 'bg-blue-100' : 'hover:bg-blue-50',
          ]"
          @click="selectCollege(college)"
        >
          <div class="font-medium text-slate-900">{{ college.name }}</div>
          <div class="text-sm text-slate-600">{{ college.location }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useCollegeAutocomplete } from "~/composables/useCollegeAutocomplete";
import type { CollegeSearchResult } from "~/types/api";

defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [college: CollegeSearchResult];
}>();

const { results, loading, error, searchColleges } = useCollegeAutocomplete();

const searchQuery = ref("");
const showDropdown = ref(false);
const selectedIndex = ref(-1);

const hasResults = computed(() => results.value.length > 0);

const handleInput = async () => {
  selectedIndex.value = -1;
  showDropdown.value = true;

  if (searchQuery.value.length >= 3) {
    await searchColleges(searchQuery.value);
  } else if (searchQuery.value.length === 0) {
    results.value = [];
    error.value = null;
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!showDropdown.value) return;

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      if (selectedIndex.value < results.value.length - 1) {
        selectedIndex.value++;
      }
      break;
    case "ArrowUp":
      event.preventDefault();
      if (selectedIndex.value > -1) {
        selectedIndex.value--;
      }
      break;
    case "Enter":
      event.preventDefault();
      if (
        selectedIndex.value >= 0 &&
        selectedIndex.value < results.value.length
      ) {
        selectCollege(results.value[selectedIndex.value]);
      }
      break;
    case "Escape":
      event.preventDefault();
      showDropdown.value = false;
      break;
  }
};

const handleBlur = () => {
  // Delay closing dropdown to allow click on items
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
};

const selectCollege = (college: CollegeSearchResult) => {
  searchQuery.value = college.name;
  showDropdown.value = false;
  emit("select", college);
};

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('[class*="SchoolAutocomplete"]')) {
    showDropdown.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>
