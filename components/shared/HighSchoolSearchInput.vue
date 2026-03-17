<script setup lang="ts">
import { ref, watch } from "vue";
import { useHighSchoolSearch, type NcesSchool, type HighSchoolSelection } from "~/composables/useHighSchoolSearch";

const props = withDefaults(defineProps<{
  modelValue: HighSchoolSelection | null;
  stateHint?: string;
  disabled?: boolean;
  placeholder?: string;
}>(), {
  placeholder: "Search for your high school",
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: HighSchoolSelection];
}>();

const { results, loading, search, selectSchool, clearResults } = useHighSchoolSearch(props.stateHint);

const inputValue = ref(props.modelValue?.name ?? "");
const showDropdown = ref(false);
const isManualMode = ref(false);

watch(() => props.modelValue, (v) => {
  inputValue.value = v?.name ?? "";
});

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
    emit("update:modelValue", { name: inputValue.value, nces_school_id: null });
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
  emit("update:modelValue", { name: "", nces_school_id: null });
}

function onBlur() {
  // Small delay so click on dropdown item fires first
  setTimeout(() => { showDropdown.value = false; }, 150);
}
</script>

<template>
  <div class="relative">
    <div v-if="isManualMode" class="flex gap-2">
      <input
        v-model="inputValue"
        type="text"
        class="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
        :disabled="disabled"
        placeholder="Enter school name manually"
        @blur="onManualBlur"
      />
      <button
        type="button"
        class="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl"
        @click="disableManualMode"
      >
        ✕
      </button>
    </div>

    <div v-else>
      <input
        :value="inputValue"
        type="text"
        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
        :disabled="disabled"
        :placeholder="placeholder"
        @input="onInput"
        @blur="onBlur"
      />

      <!-- Dropdown -->
      <div
        v-if="showDropdown && (results.length > 0 || (!loading && inputValue.length >= 2))"
        class="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
      >
        <button
          v-for="school in results"
          :key="school.nces_id"
          type="button"
          class="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 flex justify-between items-center"
          @mousedown.prevent="onSelect(school)"
        >
          <span class="text-sm font-medium text-slate-800">{{ school.name }}</span>
          <span class="text-xs text-slate-400 ml-2">{{ school.city }}, {{ school.state }}</span>
        </button>

        <div v-if="!loading && results.length === 0 && inputValue.length >= 2" class="px-4 py-3">
          <p class="text-sm text-slate-500 mb-2">No schools found.</p>
          <button
            type="button"
            class="text-sm text-blue-600 hover:text-blue-800 font-medium"
            @mousedown.prevent="enableManualMode"
          >
            Can't find it? Enter manually →
          </button>
        </div>
      </div>

      <p v-if="loading" class="text-xs text-slate-400 mt-1">Searching...</p>
    </div>
  </div>
</template>
