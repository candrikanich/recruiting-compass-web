<script setup lang="ts">
import { ref, watch } from "vue";
import {
  useHighSchoolSearch,
  type NcesSchool,
  type HighSchoolSelection,
} from "~/composables/useHighSchoolSearch";

const props = withDefaults(
  defineProps<{
    modelValue: HighSchoolSelection | null;
    stateHint?: string;
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    placeholder: "Search for your high school",
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: HighSchoolSelection];
}>();

const { results, loading, search, selectSchool, clearResults } =
  useHighSchoolSearch(props.stateHint);

const inputValue = ref(props.modelValue?.name ?? "");
const showDropdown = ref(false);
const isManualMode = ref(false);

watch(
  () => props.modelValue,
  (v) => {
    inputValue.value = v?.name ?? "";
  },
);

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  inputValue.value = val;
  showDropdown.value = true;
  search(val);
}

function onSelect(school: NcesSchool) {
  const selection = selectSchool(school);
  inputValue.value = selection.name;
  showDropdown.value = false;
  clearResults();
  emit("update:modelValue", selection);
}

function onManualBlur() {
  if (isManualMode.value) {
    emit("update:modelValue", {
      name: inputValue.value,
      nces_school_id: null,
      city: null,
      state: null,
      zip: null,
    });
  }
}

function enableManualMode() {
  isManualMode.value = true;
  showDropdown.value = false;
  clearResults();
}

function disableManualMode() {
  isManualMode.value = false;
  inputValue.value = "";
  emit("update:modelValue", {
    name: "",
    nces_school_id: null,
    city: null,
    state: null,
    zip: null,
  });
}

function onBlur() {
  // Small delay so click on dropdown item fires first
  setTimeout(() => {
    showDropdown.value = false;
  }, 150);
}

function formatSchoolLocation(school: NcesSchool): string {
  const parts = [school.city, school.state].filter(
    (part) => part && part.trim() !== "",
  );
  return parts.length > 0 ? parts.join(", ") : "";
}
</script>

<template>
  <div class="relative">
    <div v-if="isManualMode" class="flex gap-2">
      <input
        v-model="inputValue"
        type="text"
        class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        :disabled="disabled"
        placeholder="Enter school name manually"
        @blur="onManualBlur"
      />
      <button
        type="button"
        class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
        @click="disableManualMode"
      >
        ✕
      </button>
    </div>

    <div v-else>
      <input
        :value="inputValue"
        type="text"
        class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        :disabled="disabled"
        :placeholder="placeholder"
        @input="onInput"
        @blur="onBlur"
      />

      <!-- Dropdown -->
      <div
        v-if="
          showDropdown &&
          (results.length > 0 || (!loading && inputValue.length >= 2))
        "
        class="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
      >
        <button
          v-for="school in results"
          :key="school.nces_id"
          type="button"
          class="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50"
          @mousedown.prevent="onSelect(school)"
        >
          <span class="text-sm font-medium text-slate-800">{{
            school.name
          }}</span>
          <span class="ml-2 text-xs text-slate-400">{{
            formatSchoolLocation(school)
          }}</span>
        </button>

        <div
          v-if="!loading && results.length === 0 && inputValue.length >= 2"
          class="px-4 py-3"
        >
          <p class="mb-2 text-sm text-slate-500">No schools found.</p>
          <button
            type="button"
            class="text-sm font-medium text-blue-600 hover:text-blue-800"
            @mousedown.prevent="enableManualMode"
          >
            Can't find it? Enter manually →
          </button>
        </div>
      </div>

      <p v-if="loading" class="mt-1 text-xs text-slate-400">Searching...</p>
    </div>
  </div>
</template>
